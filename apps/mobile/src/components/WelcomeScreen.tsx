import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signIn, signInWithPassword } from "@/auth/client";
import { env } from "@/env";
import { theme } from "@/theme";

export const WelcomeScreen = ({
  returnPath,
  onAuthenticated,
}: {
  returnPath: string;
  onAuthenticated: () => Promise<void>;
}) => {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capability = useQuery({
    queryKey: ["auth-capabilities"],
    queryFn: async () => {
      const response = await fetch(`${env.serverUrl}/auth-capabilities`);
      if (!response.ok) throw new Error("Unable to load sign-in options.");
      return (await response.json()) as { passwordSignInEnabled: boolean };
    },
    staleTime: 0,
  });

  const submit = async (review: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = review ? await signInWithPassword(password) : await signIn(returnPath);
      if (result.error) {
        setError(
          review
            ? "Sign-in failed. Check the review password."
            : "CMU sign-in failed. Please try again.",
        );
        return;
      }
      setPassword("");
      await onAuthenticated();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.heading}>
              <Image source={require("../../assets/icon.png")} style={styles.icon} />
              <Text style={styles.title}>CMU Maps</Text>
            </View>
            <Text style={styles.body}>
              CMU Maps is built with ❤ by{" "}
              <Text
                accessibilityRole="link"
                style={styles.link}
                onPress={() => {
                  WebBrowser.openBrowserAsync("https://www.scottylabs.org/").catch(() =>
                    setError("Unable to open the ScottyLabs website."),
                  );
                }}
              >
                ScottyLabs
              </Text>
              .
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={styles.primary}
              onPress={() => void submit(false)}
            >
              <Text style={styles.primaryText}>Sign in with CMU</Text>
            </Pressable>
            {capability.data?.passwordSignInEnabled && (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  style={styles.primary}
                  onPress={() => setPasswordOpen(!passwordOpen)}
                >
                  <Text style={styles.primaryText}>App Review Sign-In</Text>
                </Pressable>
                {passwordOpen && (
                  <>
                    <TextInput
                      accessibilityLabel="App Review password"
                      placeholder="Review password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={password}
                      onChangeText={setPassword}
                      editable={!busy}
                      style={styles.input}
                      onSubmitEditing={() => {
                        if (password && !busy) void submit(true);
                      }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy || !password}
                      style={styles.primary}
                      onPress={() => void submit(true)}
                    >
                      <Text style={styles.primaryText}>Sign in</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
            {capability.isError && (
              <Pressable accessibilityRole="button" onPress={() => void capability.refetch()}>
                <Text style={styles.body}>Unable to load review sign-in. Tap to retry.</Text>
              </Pressable>
            )}
            {busy && <ActivityIndicator accessibilityLabel="Signing in" color={theme.brand} />}
            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.paper },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  card: { width: "100%", maxWidth: 400, gap: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  icon: { width: 64, height: 64, borderRadius: 14 },
  title: { color: theme.ink, fontSize: 32, fontWeight: "700" },
  body: { color: theme.muted, fontSize: 16, lineHeight: 24 },
  prompt: { color: theme.ink, fontSize: 17, marginTop: 8 },
  link: { color: theme.brand, textDecorationLine: "underline" },
  primary: { backgroundColor: theme.brand, padding: 16, borderRadius: 14, alignItems: "center" },
  primaryText: { color: theme.paper, fontSize: 16, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    padding: 14,
    color: theme.ink,
  },
  error: { color: theme.danger, fontSize: 14, lineHeight: 20 },
});
