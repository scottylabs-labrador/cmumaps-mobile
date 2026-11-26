import * as WebBrowser from "expo-web-browser";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CloseIcon } from "@/components/Icons";
import { theme } from "@/theme";

const scottyLabsUrl = "https://www.scottylabs.org/";

interface Props {
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
}

export const LoginModal = ({ visible, onSignIn, onDismiss }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
        <View style={styles.header}>
          <Text style={styles.title}>CMU Maps</Text>
          <Pressable accessibilityLabel="Close" onPress={onDismiss} style={styles.closeCircle}>
            <CloseIcon size={16} color={theme.muted} />
          </Pressable>
        </View>
        <Text style={styles.body}>
          CMU Maps is built with ❤ by ScottyLabs. Find out more about us{" "}
          <Text
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel="ScottyLabs website"
            onPress={() => {
              WebBrowser.openBrowserAsync(scottyLabsUrl).catch(() => undefined);
            }}
          >
            here
          </Text>
          . Your feedback is appreciated.
        </Text>
        <Text style={styles.prompt}>Log in to see floor plans.</Text>
        <View style={styles.actions}>
          <Pressable onPress={onSignIn} style={styles.signIn}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: 18,
    maxWidth: 332,
    padding: 20,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    width: "100%",
    elevation: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: theme.ink,
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  closeCircle: {
    alignItems: "center",
    backgroundColor: theme.canvas,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  body: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  link: {
    color: theme.brand,
    textDecorationLine: "underline",
  },
  prompt: {
    color: theme.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signIn: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signInText: {
    color: theme.brand,
    fontSize: 14,
    fontWeight: "600",
  },
  close: {
    backgroundColor: "#fecaca",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
