import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CloseIcon } from "@/components/Icons";
import { theme } from "@/theme";

interface LocationPromptProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

export const LocationPrompt = ({ visible, onAllow, onDismiss }: LocationPromptProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
        <View style={styles.header}>
          <Text style={styles.title}>Enable your location</Text>
          <Pressable accessibilityLabel="Close" onPress={onDismiss} style={styles.closeCircle}>
            <CloseIcon size={16} color={theme.muted} />
          </Pressable>
        </View>
        <Text style={styles.body}>
          Allow CMU Maps to use your current location to find routes and show where you are on
          campus.
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={onAllow} style={styles.pillPrimary}>
            <Text style={styles.pillText}>Allow this time</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.pillSecondary}>
            <Text style={styles.pillText}>Don&apos;t allow</Text>
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
    fontSize: 21,
    fontWeight: "600",
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
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  pillPrimary: {
    alignItems: "center",
    backgroundColor: theme.brand,
    borderRadius: 100,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pillSecondary: {
    alignItems: "center",
    backgroundColor: theme.disabled,
    borderRadius: 100,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pillText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
