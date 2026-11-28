import { LogOut, Plus, UserRound } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

const DIAL_STEP = 62;

interface AccountDialProps {
  open: boolean;
  onToggle: () => void;
  onAccount: () => void;
  onAbout: () => void;
}

export const AccountDial = ({ open, onToggle, onAccount, onAbout }: AccountDialProps) => {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 240,
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
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });
  const triggerRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
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
          style={[styles.circle, styles.circleQuestion]}
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
          accessibilityLabel="Account"
          onPress={onAccount}
          style={[styles.circle, styles.circleSecondary]}
        >
          <UserRound strokeWidth={1.9} size={22} color="#ffffff" />
        </Pressable>
      </Animated.View>
      <Pressable
        accessibilityLabel={open ? "Close menu" : "Open menu"}
        onPress={onToggle}
        style={[styles.circle, styles.circleTrigger]}
      >
        <Animated.View style={{ transform: [{ rotate: triggerRotate }] }}>
          <Plus strokeWidth={2.4} size={24} color="#ffffff" />
        </Animated.View>
      </Pressable>
    </View>
  );
};

interface AccountModalProps {
  visible: boolean;
  name?: string | null;
  email?: string | null;
  onSignOut: () => void;
  onDismiss: () => void;
}

export const AccountCardModal = ({
  visible,
  name,
  email,
  onSignOut,
  onDismiss,
}: AccountModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
        <View style={styles.accountIdentity}>
          <Text style={styles.modalTitle}>{name || "CMU Account"}</Text>
          {email ? (
            <Text style={styles.accountEmail} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
        <View style={styles.divider} />
        <Pressable style={styles.signOutRow} onPress={onSignOut}>
          <LogOut strokeWidth={1.9} size={19} color={theme.ink} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    height: 48,
    justifyContent: "flex-end",
    width: 48,
  },
  item: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  circle: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: 48,
    elevation: 6,
  },
  circleTrigger: {
    backgroundColor: theme.brand,
  },
  circleSecondary: {
    backgroundColor: theme.dialSecondary,
  },
  circleQuestion: {
    backgroundColor: "transparent",
    elevation: 0,
    overflow: "hidden",
    shadowOpacity: 0,
  },
  question: {
    height: 48,
    width: 48,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
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
  modalTitle: {
    color: theme.ink,
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 26,
  },
  accountIdentity: {
    gap: 2,
  },
  accountEmail: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 19,
  },
  divider: {
    backgroundColor: "#ebebeb",
    height: 1,
    marginVertical: 14,
  },
  signOutRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  signOutText: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "500",
  },
});
