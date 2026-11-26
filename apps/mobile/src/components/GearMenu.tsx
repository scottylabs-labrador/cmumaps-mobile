import { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { theme } from "@/theme";

const DIAL_STEP = 68;

const settingsXml = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.7729 3.52295C14.7729 3.25171 14.6645 2.99087 14.4727 2.79907C14.2809 2.60759 14.021 2.5 13.75 2.5C13.479 2.5 13.2191 2.60759 13.0273 2.79907C12.8355 2.99087 12.7271 3.25171 12.7271 3.52295V3.7207C12.7246 4.3299 12.5445 4.92536 12.2083 5.43335C11.8718 5.94138 11.3938 6.34071 10.8337 6.58081C10.7335 6.62378 10.6275 6.65067 10.52 6.66626C10.0125 6.84297 9.46711 6.88715 8.93555 6.79077C8.32116 6.67937 7.75349 6.38755 7.30713 5.95093L7.29736 5.94116L7.23022 5.8728L7.229 5.87158C7.13409 5.77666 7.02098 5.70204 6.89697 5.65063C6.77284 5.59919 6.6395 5.57251 6.50513 5.57251C6.37098 5.57258 6.23844 5.59929 6.1145 5.65063C5.99052 5.70203 5.87737 5.77668 5.78247 5.87158L5.78125 5.8728C5.68618 5.96777 5.61055 6.08071 5.55908 6.20483C5.50761 6.32899 5.48096 6.46228 5.48096 6.59668C5.48097 6.73105 5.50763 6.8644 5.55908 6.98853C5.59776 7.08176 5.65023 7.16841 5.71411 7.24609L5.78125 7.32056L5.85938 7.39868C6.2959 7.84494 6.58898 8.41166 6.70044 9.02588C6.81184 9.64026 6.73649 10.2747 6.48438 10.8459L6.48315 10.8447C6.26208 11.4021 5.88775 11.8856 5.39917 12.2351C4.88929 12.5998 4.28147 12.8026 3.65479 12.8174C3.64521 12.8176 3.63507 12.8186 3.62549 12.8186H3.52295C3.25171 12.8186 2.99087 12.9259 2.79907 13.1177C2.60754 13.3093 2.50015 13.5694 2.5 13.8403C2.5 14.1115 2.60738 14.3724 2.79907 14.5642C2.99087 14.756 3.25171 14.8633 3.52295 14.8633H3.7207C4.33002 14.8657 4.9253 15.0469 5.43335 15.3833C5.93775 15.7173 6.33408 16.1907 6.57471 16.7456H6.57593C6.82787 17.3167 6.90213 17.9502 6.79077 18.5645C6.67937 19.1788 6.38755 19.7465 5.95093 20.1929L5.94116 20.2026L5.8728 20.2698L5.87158 20.271C5.77666 20.3659 5.70204 20.479 5.65063 20.603C5.59919 20.7272 5.57251 20.8605 5.57251 20.9949C5.57258 21.129 5.59929 21.2616 5.65063 21.3855C5.70203 21.5095 5.77669 21.6226 5.87158 21.7175L5.8728 21.7188C5.96776 21.8138 6.08071 21.8894 6.20483 21.9409C6.32899 21.9924 6.46227 22.019 6.59668 22.019C6.73105 22.019 6.8644 21.9924 6.98853 21.9409C7.11259 21.8895 7.22563 21.8138 7.32056 21.7188L7.39868 21.6406C7.84494 21.2041 8.41166 20.911 9.02588 20.7996C9.64026 20.6882 10.2747 20.7635 10.8459 21.0156H10.8447C11.4023 21.2367 11.8855 21.6121 12.2351 22.1008C12.5998 22.6107 12.8026 23.2185 12.8174 23.8452C12.8176 23.8548 12.8186 23.8649 12.8186 23.8745V23.9771C12.8186 24.2483 12.9259 24.5091 13.1177 24.7009C13.3093 24.8925 13.5694 24.9998 13.8403 25C14.1115 25 14.3724 24.8926 14.5642 24.7009C14.756 24.5091 14.8633 24.2483 14.8633 23.9771V23.7793C14.8657 23.17 15.0469 22.5747 15.3833 22.0667C15.7174 21.5621 16.1905 21.1647 16.7456 20.9241L16.9617 20.8386C17.4742 20.6567 18.0267 20.6117 18.5645 20.7092C19.1021 20.8067 19.6036 21.0427 20.0195 21.3928L20.1929 21.5491L20.2026 21.5588L20.2698 21.6272L20.271 21.6284C20.3659 21.7233 20.479 21.798 20.603 21.8494C20.7272 21.9008 20.8605 21.9275 20.9949 21.9275C21.129 21.9274 21.2616 21.9007 21.3855 21.8494C21.5095 21.798 21.6226 21.7233 21.7175 21.6284L21.7188 21.6272C21.8138 21.5322 21.8895 21.4193 21.9409 21.2952C21.9924 21.171 22.019 21.0377 22.019 20.9033C22.019 20.7689 21.9924 20.6356 21.9409 20.5115C21.9022 20.4182 21.8498 20.3316 21.7859 20.2539L21.7188 20.1794L21.6406 20.1013C21.2041 19.6551 20.911 19.0883 20.7996 18.4741C20.7021 17.9366 20.7472 17.3837 20.929 16.8713L21.0156 16.6541C21.2563 16.0993 21.6527 15.6257 22.157 15.2917C22.665 14.9554 23.2604 14.7755 23.8696 14.7729H23.9771C24.2483 14.7729 24.5091 14.6645 24.7009 14.4727C24.8924 14.2809 25 14.021 25 13.75C25 13.479 24.8924 13.2191 24.7009 13.0273C24.5091 12.8355 24.2483 12.7271 23.9771 12.7271H23.7793C23.1701 12.7246 22.5746 12.5445 22.0667 12.2083C21.5586 11.8718 21.1593 11.3938 20.9192 10.8337C20.8762 10.7334 20.8481 10.6275 20.8325 10.52C20.6559 10.0126 20.6129 9.46697 20.7092 8.93555C20.8206 8.32116 21.1124 7.75349 21.5491 7.30713L21.5588 7.29736L21.6272 7.23022L21.6284 7.229C21.7233 7.13409 21.798 7.02097 21.8494 6.89697C21.9008 6.77284 21.9275 6.6395 21.9275 6.50513C21.9274 6.37098 21.9007 6.23843 21.8494 6.1145C21.798 5.99053 21.7233 5.87737 21.6284 5.78247L21.6272 5.78125C21.5322 5.68618 21.4193 5.61055 21.2952 5.55908C21.171 5.50761 21.0377 5.48096 20.9033 5.48096C20.7689 5.48097 20.6356 5.50763 20.5115 5.55908C20.4182 5.59776 20.3316 5.65023 20.2539 5.71411L20.1794 5.78125L20.1013 5.85938C19.6551 6.2959 19.0883 6.58898 18.4741 6.70044C17.8597 6.81184 17.2253 6.73649 16.6541 6.48438V6.48315C16.0995 6.2425 15.6256 5.84718 15.2917 5.34302C14.9554 4.83505 14.7755 4.2396 14.7729 3.63037V3.52295ZM16.25 13.75C16.25 12.3693 15.1307 11.25 13.75 11.25C12.3693 11.25 11.25 12.3693 11.25 13.75C11.25 15.1307 12.3693 16.25 13.75 16.25C15.1307 16.25 16.25 15.1307 16.25 13.75ZM18.75 13.75C18.75 16.5114 16.5114 18.75 13.75 18.75C10.9886 18.75 8.75 16.5114 8.75 13.75C8.75 10.9886 10.9886 8.75 13.75 8.75C16.5114 8.75 18.75 10.9886 18.75 13.75Z" fill="white"/></svg>`;

const signInXml = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="m26 30h-12a2 2 0 0 1 -2-2v-3h2v3h12v-24h-12v3h-2v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v24a2 2 0 0 1 -2 2z"/><path fill="white" d="m14.59 20.59 3.58-3.59h-14.17v-2h14.17l-3.58-3.59 1.41-1.41 6 6-6 6z"/></svg>`;

const signOutXml = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.78125 14.4418V6.95337C1.78125 6.21928 1.78034 5.61499 1.82043 5.12436C1.86137 4.62332 1.94908 4.16236 2.16952 3.72974C2.51135 3.05893 3.05698 2.51331 3.72779 2.17147C4.16041 1.95104 4.62137 1.86332 5.12241 1.82238C5.61303 1.78229 6.21733 1.7832 6.95142 1.7832H8.02132C8.51365 1.7832 8.91276 2.18232 8.91276 2.67464C8.91276 3.16697 8.51365 3.56608 8.02132 3.56608H6.95142C6.188 3.56608 5.66897 3.56639 5.26779 3.59916C4.87697 3.63109 4.67682 3.68918 4.5374 3.76021C4.20199 3.93113 3.92918 4.20395 3.75826 4.53935C3.68722 4.67877 3.62914 4.87892 3.59721 5.26974C3.56444 5.67092 3.56413 6.18996 3.56413 6.95337V14.4418C3.56413 15.2052 3.56444 15.7243 3.59721 16.1254C3.62914 16.5163 3.68722 16.7164 3.75826 16.8558C3.92918 17.1912 4.20199 17.464 4.5374 17.635C4.67682 17.706 4.87697 17.7641 5.26779 17.796C5.66897 17.8288 6.188 17.8291 6.95142 17.8291H8.02132C8.51365 17.8291 8.91276 18.2282 8.91276 18.7205C8.91276 19.2129 8.51365 19.612 8.02132 19.612H6.95142C6.21733 19.612 5.61303 19.6129 5.12241 19.5728C4.62137 19.5319 4.16041 19.4441 3.72779 19.2237C3.05698 18.8819 2.51135 18.3363 2.16952 17.6654C1.94908 17.2328 1.86137 16.7719 1.82043 16.2708C1.78034 15.7802 1.78125 15.1759 1.78125 14.4418ZM13.6311 5.61012C13.9575 5.28375 14.4736 5.26361 14.8238 5.54918L14.8917 5.61012L19.3489 10.0673C19.697 10.4154 19.697 10.9797 19.3489 11.3279L14.8917 15.7851C14.5435 16.1332 13.9792 16.1332 13.6311 15.7851C13.283 15.4369 13.283 14.8726 13.6311 14.5245L16.5666 11.589H8.02132C7.52899 11.589 7.12988 11.1899 7.12988 10.6976C7.12988 10.2053 7.52899 9.80615 8.02132 9.80615H16.5666L13.6311 6.87067L13.5702 6.80277C13.2846 6.45264 13.3047 5.93649 13.6311 5.61012Z" fill="white"/></svg>`;

interface Props {
  open: boolean;
  signedIn: boolean;
  onToggle: () => void;
  onSignIn: () => void;
  onReviewSignIn: () => void;
  onSignOut: () => void;
  onAbout: () => void;
}

export const AccountDial = ({
  open,
  signedIn,
  onToggle,
  onSignIn,
  onReviewSignIn,
  onSignOut,
  onAbout,
}: Props) => {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const authOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DIAL_STEP],
  });
  const aboutOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DIAL_STEP * 2],
  });
  const itemOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[styles.item, { opacity: itemOpacity, transform: [{ translateY: aboutOffset }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable
          accessibilityLabel="About"
          onPress={onAbout}
          style={[styles.circle, styles.circleSecondary]}
        >
          <Image
            source={require("../../assets/icons/plus_button_menu/question-mark.png")}
            style={styles.question}
          />
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.item, { opacity: itemOpacity, transform: [{ translateY: authOffset }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable
          accessibilityLabel={signedIn ? "Sign out" : "Sign in"}
          onPress={signedIn ? onSignOut : onSignIn}
          onLongPress={signedIn ? undefined : onReviewSignIn}
          delayLongPress={600}
          style={[styles.circle, styles.circleSecondary]}
        >
          <SvgXml xml={signedIn ? signOutXml : signInXml} width={22} height={22} />
        </Pressable>
      </Animated.View>
      <Pressable
        accessibilityLabel={open ? "Close account menu" : "Open account menu"}
        onPress={onToggle}
        style={[styles.circle, open ? styles.circlePrimary : styles.circleTrigger]}
      >
        <SvgXml xml={settingsXml} width={28} height={28} />
      </Pressable>
    </View>
  );
};

interface PromptProps {
  visible: boolean;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  onDismiss: () => void;
}

export const PromptCard = ({ visible, title, body, action, onAction, onDismiss }: PromptProps) => {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable onPress={onAction} style={styles.button}>
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
      <Pressable onPress={onDismiss}>
        <Text style={styles.close}>Not now</Text>
      </Pressable>
    </View>
  );
};

interface ReviewProps {
  visible: boolean;
  error: string | null;
  busy: boolean;
  onSubmit: (password: string) => void;
  onDismiss: () => void;
}

export const ReviewPasswordPrompt = ({
  visible,
  error,
  busy,
  onSubmit,
  onDismiss,
}: ReviewProps) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!visible) {
      setPassword("");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>App Review sign-in</Text>
          <Text style={styles.body}>Enter the review password from App Store Connect notes.</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            placeholder="Password"
            placeholderTextColor={theme.muted}
            style={styles.passwordInput}
            onSubmitEditing={() => {
              if (password.length > 0 && !busy) {
                onSubmit(password);
              }
            }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={busy || password.length === 0}
            onPress={() => onSubmit(password)}
            style={[styles.button, (busy || password.length === 0) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} disabled={busy}>
            <Text style={styles.close}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    height: 44,
    justifyContent: "flex-end",
    width: 44,
  },
  item: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  circle: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  circleTrigger: {
    backgroundColor: theme.ink,
  },
  circlePrimary: {
    backgroundColor: theme.green,
  },
  circleSecondary: {
    backgroundColor: "#64748b",
  },
  question: {
    height: 28,
    width: 28,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    padding: 16,
    width: 260,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: theme.muted,
    marginTop: 6,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: theme.green,
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  close: {
    color: theme.muted,
    marginTop: 10,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 320,
  },
  passwordInput: {
    borderColor: "#cbd5e1",
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: "#b91c1c",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
