import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CloseIcon,
  HelpCircleIcon,
  LogInIcon,
  LogOutIcon,
  PlusIcon,
  UserIcon,
} from "@/components/Icons";
import { theme } from "@/theme";

const DIAL_STEP = 62;

interface Props {
  open: boolean;
  signedIn: boolean;
  onToggle: () => void;
  onSignIn: () => void;
  onReviewSignIn: () => void;
  onAccount: () => void;
  onAbout: () => void;
}

export const AccountDial = ({
  open,
  signedIn,
  onToggle,
  onSignIn,
  onReviewSignIn,
  onAccount,
  onAbout,
}: Props) => {
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
          style={[styles.circle, styles.circleSecondary]}
        >
          <HelpCircleIcon size={22} color="#ffffff" />
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.item, { opacity: itemOpacity, transform: [{ translateY: authOffset }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable
          accessibilityLabel={signedIn ? "Account" : "Sign in"}
          onPress={signedIn ? onAccount : onSignIn}
          onLongPress={signedIn ? undefined : onReviewSignIn}
          delayLongPress={600}
          style={[styles.circle, styles.circleSecondary]}
        >
          {signedIn ? (
            <UserIcon size={22} color="#ffffff" />
          ) : (
            <LogInIcon size={21} color="#ffffff" />
          )}
        </Pressable>
      </Animated.View>
      <Pressable
        accessibilityLabel={open ? "Close menu" : "Open menu"}
        onPress={onToggle}
        style={[styles.circle, styles.circleTrigger]}
      >
        <Animated.View style={{ transform: [{ rotate: triggerRotate }] }}>
          <PlusIcon size={24} color="#ffffff" />
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
        <View style={styles.modalHeader}>
          <View style={styles.accountIdentity}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {name || "CMU Account"}
            </Text>
            {email ? (
              <Text style={styles.accountEmail} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Close account"
            onPress={onDismiss}
            style={styles.closeCircle}
          >
            <CloseIcon size={16} color={theme.muted} />
          </Pressable>
        </View>
        <View style={styles.divider} />
        <Pressable style={styles.signOutRow} onPress={onSignOut}>
          <LogOutIcon size={19} color={theme.ink} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

interface PromptProps {
  visible: boolean;
  title: string;
  body: string;
  action: string;
  dismissLabel?: string;
  onAction: () => void;
  onDismiss: () => void;
}

export const PromptCard = ({
  visible,
  title,
  body,
  action,
  dismissLabel = "Don't allow",
  onAction,
  onDismiss,
}: PromptProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable accessibilityLabel="Close" onPress={onDismiss} style={styles.closeCircle}>
            <CloseIcon size={16} color={theme.muted} />
          </Pressable>
        </View>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.promptActions}>
          <Pressable onPress={onAction} style={styles.pillPrimary}>
            <Text style={styles.pillText}>{action}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.pillSecondary}>
            <Text style={styles.pillText}>{dismissLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>App Review sign-in</Text>
            <Pressable
              accessibilityLabel="Cancel"
              onPress={onDismiss}
              disabled={busy}
              style={styles.closeCircle}
            >
              <CloseIcon size={16} color={theme.muted} />
            </Pressable>
          </View>
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
          <View style={styles.promptActions}>
            <Pressable
              disabled={busy || password.length === 0}
              onPress={() => onSubmit(password)}
              style={[styles.pillPrimary, (busy || password.length === 0) && styles.buttonDisabled]}
            >
              <Text style={styles.pillText}>{busy ? "Signing in…" : "Sign in"}</Text>
            </Pressable>
            <Pressable onPress={onDismiss} disabled={busy} style={styles.pillSecondary}>
              <Text style={styles.pillText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalTitle: {
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
  accountIdentity: {
    flex: 1,
    gap: 2,
  },
  accountEmail: {
    color: theme.muted,
    fontSize: 14,
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
  body: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  promptActions: {
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
  passwordInput: {
    borderColor: theme.line,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: theme.danger,
    fontSize: 13,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
