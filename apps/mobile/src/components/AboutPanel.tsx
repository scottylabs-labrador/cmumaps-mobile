import * as WebBrowser from "expo-web-browser";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { aboutDescription, credits, privacyPolicyUrl } from "@/content/about";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AboutPanel = ({ visible, onClose }: Props) => {
  const { dragY, panHandlers } = useSwipeToDismiss(onClose);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
      <View {...panHandlers} style={styles.handle} accessibilityRole="adjustable">
        <View style={styles.grabber} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require("../../assets/icon.png")} style={styles.icon} />
        <Text style={styles.title}>About CMU Maps</Text>
        <Text style={styles.body}>{aboutDescription}</Text>
        <Text style={[styles.body, styles.hint]}>Shake your device to report a problem.</Text>
        <Pressable
          onPress={() => {
            WebBrowser.openBrowserAsync(privacyPolicyUrl).catch(() => undefined);
          }}
          style={styles.linkRow}
        >
          <Text style={styles.link}>Privacy policy</Text>
        </Pressable>
        <Text style={styles.section}>Credits</Text>
        <Text style={styles.body}>Developer: {credits.developer}</Text>
        <Text style={styles.body}>Designer: {credits.designer}</Text>
        <Text style={[styles.body, styles.thanks]}>{credits.dataSupport}</Text>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 480,
    paddingBottom: 28,
  },
  handle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  grabber: {
    backgroundColor: theme.line,
    borderRadius: 4,
    height: 4,
    width: 48,
  },
  content: {
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  icon: {
    borderRadius: 16,
    height: 72,
    marginBottom: 12,
    width: 72,
  },
  title: {
    color: theme.ink,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    color: theme.muted,
    lineHeight: 22,
    textAlign: "center",
  },
  hint: {
    marginTop: 12,
  },
  linkRow: {
    marginTop: 16,
    paddingVertical: 8,
  },
  link: {
    color: theme.greenDark,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  section: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 20,
  },
  thanks: {
    marginTop: 8,
  },
});
