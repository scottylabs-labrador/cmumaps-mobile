require "fileutils"
require "base64"
require "securerandom"
require "json"
require "open3"
require "shellwords"
require "tempfile"
require "tmpdir"
require "time"

# Local native builds only: no EAS build, credential download, or store writes.
module NativeBuild
  ROOT = File.expand_path("..", __dir__)
  IDENTIFIER = "org.scottylabs.cmumaps"
  BUILD_DIR = File.join(ROOT, "build")

  def self.validate?
    mode = ENV.fetch("RELEASE_MODE", "auto")
    raise "RELEASE_MODE must be auto or validate" unless %w[auto validate].include?(mode)
    mode == "validate"
  end

  def self.artifact(platform, unsigned: false)
    name = platform == "android" ? (unsigned ? "cmumaps-UNSIGNED.aab" : "cmumaps.aab") :
      (unsigned ? "cmumaps-UNSIGNED-simulator.app.tar.gz" : "cmumaps.ipa")
    variable = platform == "android" ? "ANDROID_AAB_PATH" : (unsigned ? "IOS_SIMULATOR_APP_PATH" : "IOS_IPA_PATH")
    destination = File.expand_path(ENV.fetch(variable, File.join(BUILD_DIR, name)), ROOT)
    extension = platform == "android" ? ".aab" : (unsigned ? ".tar.gz" : ".ipa")
    raise "#{variable} must end in #{extension}" unless destination.end_with?(extension)
    if unsigned && !File.basename(destination).upcase.include?("UNSIGNED")
      raise "#{variable} must contain UNSIGNED in the filename for validation artifacts"
    end
    destination
  end

  def self.signed?(names)
    present = names.reject { |name| ENV.fetch(name, "").strip.empty? }
    return true if present.length == names.length
    return false if validate? && present.empty?
    raise "Incomplete signing configuration; missing: #{(names - present).join(', ')}. Only RELEASE_MODE=validate with ALL signing fields absent permits unsigned builds."
  end

  def self.decode(name, destination)
    encoded = required(name).gsub(/\s+/, "")
    data = Base64.strict_decode64(encoded)
    raise "#{name} decodes to an empty file" if data.empty?
    File.write(destination, data, mode: "wb", perm: 0o600)
    destination
  rescue ArgumentError
    raise "#{name} must contain valid base64"
  end

  def self.prepare_output(destination)
    raise "Refusing to overwrite existing artifact #{destination}" if File.exist?(destination)
    FileUtils.mkdir_p(File.dirname(destination))
    destination
  end

  def self.required(name)
    value = ENV.fetch(name, "")
    raise "#{name} must not be empty" if value.strip.empty?
    value
  end

  def self.build_number
    value = required("MOBILE_BUILD_NUMBER")
    # One shared integer works as Android versionCode and Apple's CFBundleVersion.
    unless value.match?(/\A[1-9][0-9]*\z/) && value.to_i <= 2_100_000_000
      raise "MOBILE_BUILD_NUMBER must be an integer from 1 through 2100000000"
    end
    value
  end

  def self.run!(*command, chdir: ROOT)
    # Never print environment variables (signing passwords live in the env).
    raise "Command failed: #{command.first}" unless system(*command, chdir: chdir)
  end

  def self.config
    ENV["NODE_ENV"] = "production"
    stdout, stderr, status = Open3.capture3("bun", "x", "--no-install", "expo", "config", "--json", chdir: ROOT)
    raise "Cannot resolve Expo config: #{stderr}" unless status.success?
    result = JSON.parse(stdout)
    unless result.fetch("android").fetch("package") == IDENTIFIER &&
           result.fetch("ios").fetch("bundleIdentifier") == IDENTIFIER
      raise "Native release tooling only supports #{IDENTIFIER}"
    end
    result
  end

  def self.prebuild(platform)
    # EAS normally supplies the production NODE_ENV and channel. Native jobs must
    # do so explicitly; EXPO_PUBLIC_* values are embedded during this build.
    ENV["NODE_ENV"] = "production"
    ENV["CI"] = "1"
    run!("bun", "x", "--no-install", "expo", "prebuild", "--platform", platform, "--clean", "--no-install")
  end

  def self.android
    number = build_number
    validate?
    signing = signed?(%w[ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD])
    required("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") unless validate?
    artifact = prepare_output(artifact("android", unsigned: !signing))
    resolved = config
    prebuild("android")

    # Use the Android Gradle DSL after Expo's generated configuration. This
    # replaces the template's debug signing for release without textual patches,
    # command-line passwords, global Gradle properties, or monkey patches.
    Dir.mktmpdir("cmumaps-android-") do |temporary|
      keystore = decode("ANDROID_KEYSTORE_BASE64", File.join(temporary, "upload.keystore")) if signing
      signing_dsl = if signing
        <<~GRADLE
          signingConfigs {
              cmumapsRelease {
                  storeFile file(System.getenv("CMUMAPS_KEYSTORE_PATH"))
                  storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                  keyAlias System.getenv("ANDROID_KEY_ALIAS")
                  keyPassword System.getenv("ANDROID_KEY_PASSWORD")
              }
          }
          buildTypes { release { signingConfig signingConfigs.cmumapsRelease } }
        GRADLE
      else
        "buildTypes { release { signingConfig null } }\n"
      end
      File.open(File.join(ROOT, "android/app/build.gradle"), "a") do |file|
        file.write <<~GRADLE

        // Generated by fastlane/native_build.rb; passwords stay in the job env.
        android {
            defaultConfig {
                versionCode #{number}
                versionName #{JSON.generate(resolved.fetch("version"))}
            }
            #{signing_dsl}
        }
      GRADLE
      end

      previous = ENV["CMUMAPS_KEYSTORE_PATH"]
      begin
        ENV["CMUMAPS_KEYSTORE_PATH"] = keystore
        puts "WARNING: building UNSIGNED Android validation artifact; cannot upload to Play" unless signing
        run!("./gradlew", ":app:bundleRelease", "--no-daemon", "--console=plain", chdir: File.join(ROOT, "android"))
      ensure
        ENV["CMUMAPS_KEYSTORE_PATH"] = previous
      end
    end
    bundle = File.join(ROOT, "android/app/build/outputs/bundle/release/app-release.aab")
    raise "Gradle did not produce a nonempty release AAB" unless File.file?(bundle) && File.size?(bundle)
    FileUtils.cp(bundle, artifact)
    artifact
  end

  def self.profile(file)
    stdout, stderr, status = Open3.capture3("security", "cms", "-D", "-i", file)
    raise "Cannot decode provisioning profile: #{stderr}" unless status.success?
    require "xcodeproj"
    Tempfile.create(["cmumaps-profile", ".plist"]) do |plist|
      plist.write(stdout)
      plist.flush
      data = Xcodeproj::Plist.read_from_path(plist.path)
      team = required("APPLE_TEAM_ID")
      entitlements = data.fetch("Entitlements")
      unless data.fetch("TeamIdentifier").include?(team) &&
             entitlements["application-identifier"] == "#{data.fetch('ApplicationIdentifierPrefix').first}.#{IDENTIFIER}" &&
             entitlements["get-task-allow"] == false &&
             !data.key?("ProvisionedDevices") && !data["ProvisionsAllDevices"]
        raise "Profile must be an App Store distribution profile for #{IDENTIFIER} and team #{team}"
      end
      raise "Provisioning profile has expired" unless Time.parse(data.fetch("ExpirationDate").to_s) > Time.now
      raise "Invalid provisioning profile UUID" unless data.fetch("UUID").match?(/\A[0-9a-f-]{36}\z/i)
      data
    end
  end

  # The temporary keychain and profile stay alive across the yielded gym action.
  def self.with_ios_signing
    Dir.mktmpdir("cmumaps-ios-") do |temporary|
      p12 = decode("IOS_DISTRIBUTION_P12_BASE64", File.join(temporary, "distribution.p12"))
      file = decode("IOS_PROVISION_PROFILE_BASE64", File.join(temporary, "distribution.mobileprovision"))
      provisioning = profile(file)
      keychain = File.join(temporary, "signing.keychain-db")
      password = SecureRandom.hex(32)
      original, stderr, status = Open3.capture3("security", "list-keychains", "-d", "user")
      raise "Cannot read keychain search list: #{stderr}" unless status.success?
      search_list = Shellwords.split(original)
      installed = File.expand_path("~/Library/Developer/Xcode/UserData/Provisioning Profiles/#{provisioning.fetch('UUID')}.mobileprovision")
      previous_profile = File.binread(installed) if File.file?(installed)
      begin
        # capture3 intentionally hides arguments/output containing passwords.
        security!("create-keychain", "-p", password, keychain)
        security!("set-keychain-settings", "-lut", "21600", keychain)
        security!("unlock-keychain", "-p", password, keychain)
        security!("import", p12, "-k", keychain, "-P", required("IOS_DISTRIBUTION_P12_PASSWORD"),
                  "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
        security!("set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", password, keychain)
        security!("list-keychains", "-d", "user", "-s", keychain, *search_list)
        FileUtils.mkdir_p(File.dirname(installed))
        File.write(installed, File.binread(file), mode: "wb", perm: 0o600)
        yield provisioning, keychain
      ensure
        # Attempt every cleanup even if an earlier cleanup command fails.
        restore_ok = system("security", "list-keychains", "-d", "user", "-s", *search_list, out: File::NULL, err: File::NULL)
        delete_ok = !File.exist?(keychain) || system("security", "delete-keychain", keychain, out: File::NULL, err: File::NULL)
        if previous_profile
          File.binwrite(installed, previous_profile)
        else
          FileUtils.rm_f(installed)
        end
        warn "WARNING: keychain cleanup failed; discard the ephemeral runner" unless restore_ok && delete_ok
      end
    end
  end

  def self.security!(*arguments)
    _stdout, _stderr, status = Open3.capture3("security", *arguments)
    raise "security #{arguments.first} failed (credential output suppressed)" unless status.success?
  end

  def self.ios
    require "xcodeproj"
    number = build_number
    validate?
    signing = signed?(%w[IOS_DISTRIBUTION_P12_BASE64 IOS_DISTRIBUTION_P12_PASSWORD IOS_PROVISION_PROFILE_BASE64 APPLE_TEAM_ID])
    artifact = prepare_output(artifact("ios", unsigned: !signing))
    resolved = config
    prebuild("ios")
    ios_dir = File.join(ROOT, "ios")
    projects = Dir.glob(File.join(ios_dir, "*.xcodeproj"))
    raise "Expected exactly one generated iOS project" unless projects.length == 1
    project = Xcodeproj::Project.open(projects.first)
    targets = project.targets.select { |target| target.product_type == "com.apple.product-type.application" }
    if targets.length != 1 || project.targets.any? { |target| target.product_type == "com.apple.product-type.app-extension" }
      raise "Signing configuration supports one application and no extensions"
    end
    target = targets.first
    target.build_configurations.each do |configuration|
      settings = configuration.build_settings
      settings["CURRENT_PROJECT_VERSION"] = number
      settings["MARKETING_VERSION"] = resolved.fetch("version")
      plist_path = File.expand_path(settings.fetch("INFOPLIST_FILE").delete('"'), ios_dir)
      raise "Generated Info.plist is outside the iOS directory" unless plist_path.start_with?("#{ios_dir}/")
      plist = Xcodeproj::Plist.read_from_path(plist_path)
      plist["CFBundleVersion"] = number
      plist["CFBundleShortVersionString"] = resolved.fetch("version")
      Xcodeproj::Plist.write_to_path(plist, plist_path)
    end
    project.save
    run!("bundle", "exec", "pod", "install", chdir: ios_dir)
    workspaces = Dir.glob(File.join(ios_dir, "*.xcworkspace"))
    raise "Expected exactly one generated iOS workspace" unless workspaces.length == 1
    unless signing
      puts "WARNING: building UNSIGNED iOS simulator validation artifact; not a device build or uploadable IPA"
      derived = File.join(BUILD_DIR, "simulator-derived-data")
      run!("xcodebuild", "-workspace", workspaces.first, "-scheme", target.name,
           "-configuration", "Release", "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator",
           "-derivedDataPath", derived, "CODE_SIGNING_ALLOWED=NO", "build", chdir: ios_dir)
      apps = Dir.glob(File.join(derived, "Build/Products/Release-iphonesimulator/*.app"))
      raise "Expected exactly one simulator application" unless apps.length == 1
      run!("tar", "-czf", artifact, "-C", File.dirname(apps.first), File.basename(apps.first))
      FileUtils.rm_rf(derived)
      return artifact
    end
    with_ios_signing do |provisioning, keychain|
      target.build_configurations.each do |configuration|
        configuration.build_settings.merge!(
          "DEVELOPMENT_TEAM" => required("APPLE_TEAM_ID"),
          "CODE_SIGN_STYLE" => "Manual",
          "CODE_SIGN_IDENTITY" => "Apple Distribution",
          "PROVISIONING_PROFILE_SPECIFIER" => provisioning.fetch("UUID"),
          "OTHER_CODE_SIGN_FLAGS" => "$(inherited) --keychain #{Shellwords.escape(keychain)}"
        )
      end
      project.save
      yield({
        workspace: workspaces.first,
        scheme: target.name,
        configuration: "Release",
        clean: true,
        export_method: "app-store",
        export_team_id: required("APPLE_TEAM_ID"),
        codesigning_identity: "Apple Distribution",
        output_directory: File.dirname(artifact),
        output_name: File.basename(artifact),
        archive_path: File.join(File.dirname(artifact), "CMUMaps.xcarchive"),
        buildlog_path: File.join(File.dirname(artifact), "logs"),
        xcodebuild_formatter: "",
        export_options: {
          signingStyle: "manual",
          teamID: required("APPLE_TEAM_ID"),
          signingCertificate: "Apple Distribution",
          provisioningProfiles: { IDENTIFIER => provisioning.fetch("UUID") }
        }
      })
      raise "gym did not produce a nonempty IPA" unless File.file?(artifact) && File.size?(artifact)
    end
    artifact
  end

  def self.upload_artifact(platform)
    raise "Upload is forbidden in RELEASE_MODE=validate" if validate?
    file = artifact(platform)
    raise "Missing signed #{platform} artifact #{file}" unless File.file?(file) && File.size?(file)
    raise "Refusing to upload an unsigned artifact" if File.basename(file).upcase.include?("UNSIGNED")
    file
  end
end
