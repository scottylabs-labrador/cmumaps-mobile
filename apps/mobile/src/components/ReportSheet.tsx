import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { reportEmail } from "@/content/about";
import { theme } from "@/theme";

export interface ReportContext {
  path: string;
  signedIn: boolean;
}

interface Props {
  visible: boolean;
  context: ReportContext;
  onDismiss: () => void;
}

const buildBody = (message: string, context: ReportContext) => {
  const appVersion = Constants.expoConfig?.version ?? "unknown";
  return [
    message.trim(),
    "",
    "---",
    `Path: ${context.path}`,
    `Signed in: ${context.signedIn ? "yes" : "no"}`,
    `App: ${appVersion}`,
    `Platform: ${Platform.OS} ${String(Platform.Version)}`,
  ].join("\n");
};

export const ReportSheet = ({ visible, context, onDismiss }: Props) => {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setMessage("");
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  const submit = () => {
    const trimmed = message.trim();
    if (trimmed.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const subject = encodeURIComponent("CMU Maps report");
    const body = encodeURIComponent(buildBody(trimmed, context));
    const url = `mailto:${reportEmail}?subject=${subject}&body=${body}`;
    Linking.openURL(url)
      .then(() => {
        onDismiss();
      })
      .catch(() => {
        setError("Could not open Mail. Email ops+cmumaps@scottylabs.org instead.");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Report a Problem or Improvement</Text>
          <Text style={styles.body}>
            Please describe the problem you are experiencing or what you would like to see improved.
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!busy}
            placeholder="What happened?"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={busy || message.trim().length === 0}
            onPress={submit}
            style={[styles.button, (busy || message.trim().length === 0) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{busy ? "Reporting..." : "Report"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    maxWidth: 360,
    padding: 16,
    width: "100%",
  },
  title: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: theme.muted,
    marginTop: 6,
  },
  input: {
    borderColor: "#cbd5e1",
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    marginTop: 12,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: theme.danger,
    marginTop: 8,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: theme.green,
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
