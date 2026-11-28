import * as WebBrowser from "expo-web-browser";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { aboutDescription, credits, privacyPolicyUrl } from "@/content/about";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
}

export const AboutPanel = ({ visible, onClose, onReport }: Props) => {
  const { dragY, panHandlers } = useSwipeToDismiss(onClose, { visible });

  if (!visible) {
    return null;
  }

  return (
    <Animated.View {...panHandlers} style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
      <View style={styles.handle} accessibilityRole="adjustable">
        <View style={styles.grabber} />
      </View>
      <View style={styles.content}>
        <Image source={require("../../assets/icon.png")} style={styles.icon} />
        <Text style={styles.title}>About CMU Maps</Text>
        <Text style={styles.body}>{aboutDescription}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report a problem"
          onPress={onReport}
          style={styles.hint}
        >
          <Text style={[styles.body, styles.hintText]}>Shake your device to report a problem.</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            WebBrowser.openBrowserAsync(privacyPolicyUrl).catch(() => undefined);
          }}
          style={styles.linkRow}
        >
          <Text style={[styles.link, styles.privacyLink]}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.section}>Credits</Text>
        <Text style={styles.body}>
          <Text style={styles.role}>Developer:</Text> {credits.developer}
        </Text>
        <Text style={styles.body}>
          <Text style={styles.role}>Designer:</Text> {credits.designer}
        </Text>
        <Text style={[styles.body, styles.thanks]}>
          <Text style={styles.role}>Special Thanks</Text>
          {" to the "}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => {
              WebBrowser.openBrowserAsync("https://cmumaps.com").catch(() => undefined);
            }}
          >
            CMU Maps Web Team
          </Text>
          {" and "}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => {
              WebBrowser.openBrowserAsync(
                "https://www.cmu.edu/enterprise-space/esim/index.html",
              ).catch(() => undefined);
            }}
          >
            CMU ESIM Services
          </Text>
          {" for the data support."}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    backgroundColor: theme.canvas,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  hintText: {
    color: theme.brandDark,
    fontSize: 13,
    fontWeight: "500",
  },
  linkRow: {
    marginTop: 16,
    paddingVertical: 8,
  },
  link: {
    color: theme.greenDark,
    textDecorationLine: "underline",
  },
  privacyLink: {
    fontWeight: "700",
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
  role: {
    fontWeight: "700",
  },
});
