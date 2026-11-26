import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import SettingsIcon from "../../assets/icons/plus_button_menu/mobile/settings.svg";
import SignInIcon from "../../assets/icons/plus_button_menu/sign-in.svg";
import SignOutIcon from "../../assets/icons/plus_button_menu/sign-out.svg";
import { theme } from "@/theme";

const DIAL_STEP = 68;

interface Props {
  open: boolean;
  signedIn: boolean;
  onToggle: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onAbout: () => void;
}

export const AccountDial = ({ open, signedIn, onToggle, onSignIn, onSignOut, onAbout }: Props) => {
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
          style={[styles.circle, styles.circleSecondary]}
        >
          {signedIn ? (
            <SignOutIcon width={24} height={24} />
          ) : (
            <SignInIcon width={24} height={24} />
          )}
        </Pressable>
      </Animated.View>
      <Pressable
        accessibilityLabel={open ? "Close account menu" : "Open account menu"}
        onPress={onToggle}
        style={[styles.circle, open ? styles.circlePrimary : styles.circleTrigger]}
      >
        <SettingsIcon width={28} height={28} />
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
});
