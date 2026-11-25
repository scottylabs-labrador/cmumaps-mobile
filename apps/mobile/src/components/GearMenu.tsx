import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  email?: string;
  onClose: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const GearMenu = ({ visible, email, onClose, onSignIn, onSignOut }: Props) => {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{email ?? "Not signed in"}</Text>
      {email ? (
        <Pressable onPress={onSignOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onSignIn} style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      )}
      <Pressable onPress={onClose}>
        <Text style={styles.close}>Close</Text>
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

const styles = StyleSheet.create({
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
});
