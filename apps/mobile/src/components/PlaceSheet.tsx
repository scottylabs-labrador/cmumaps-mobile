import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRightIcon, DoorIcon, ShareIcon } from "@/components/Icons";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { locationImage } from "@/lib/locationImage";
import { type CampusTarget, targetBuildingCode } from "@/lib/campusTarget";
import type { SheetState } from "@/store";
import { theme } from "@/theme";

interface Props {
  target: CampusTarget;
  title: string;
  subtitle: string;
  detail: string;
  roomType?: string;
  sheet: SheetState;
  onCycle: () => void;
  onClose: () => void;
  onDirections: () => void;
  onShare: () => void;
}

export const PlaceSheet = ({
  target,
  title,
  subtitle,
  detail,
  roomType,
  sheet,
  onCycle,
  onClose,
  onDirections,
  onShare,
}: Props) => {
  const { dragY, panHandlers } = useSwipeToDismiss(onClose, {
    visible: target.kind !== "home" && target.kind !== "pending",
    onSwipeUp: onCycle,
  });

  if (target.kind === "home" || target.kind === "pending") {
    return null;
  }

  const buildingCode = targetBuildingCode(target);
  const roomName = target.kind === "room" ? target.roomName : undefined;
  const photo = locationImage(buildingCode, roomName);
  const showHero = Boolean(photo && sheet !== "collapsed");
  const roomPrefix =
    target.kind === "room" && title.startsWith(`${target.buildingCode} `)
      ? target.buildingCode
      : null;

  return (
    <Animated.View style={[styles.shadowWrap, { transform: [{ translateY: dragY }] }]}>
      <View
        style={[styles.sheet, sheet === "collapsed" ? styles.collapsed : null]}
        {...panHandlers}
      >
        {showHero && photo ? (
          <View style={styles.heroWrap}>
            <Image source={photo} style={styles.hero} resizeMode="cover" />
            <Pressable
              onPress={onCycle}
              style={styles.heroHandle}
              accessibilityRole="button"
              accessibilityLabel="Resize sheet"
            >
              <View style={styles.heroGrabber} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onCycle}
            style={styles.handle}
            accessibilityRole="button"
            accessibilityLabel="Resize sheet"
          >
            <View style={styles.grabber} />
          </Pressable>
        )}

        <View style={[styles.body, showHero ? styles.bodyWithHero : null]}>
          {target.kind === "room" && roomType && sheet !== "collapsed" ? (
            <View style={styles.roomBadge}>
              <DoorIcon size={15} color={theme.brandDark} />
              <Text style={styles.roomBadgeText}>{roomType}</Text>
            </View>
          ) : null}

          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {roomPrefix ? (
                <>
                  <Text style={styles.roomCodeUnderline}>{roomPrefix}</Text>
                  {title.slice(roomPrefix.length)}
                </>
              ) : (
                title
              )}
            </Text>
            {sheet === "collapsed" ? (
              <Pressable accessibilityLabel="Share" onPress={onShare} style={styles.shareIcon}>
                <ShareIcon size={19} color={theme.ink} />
              </Pressable>
            ) : null}
          </View>

          {sheet !== "collapsed" && subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
          {sheet === "expanded" && detail ? <Text style={styles.detail}>{detail}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={onDirections}>
              <ArrowRightIcon size={18} color="#ffffff" />
              <Text style={styles.primaryText}>Directions</Text>
            </Pressable>
            {sheet !== "collapsed" ? (
              <Pressable accessibilityLabel="Share" onPress={onShare} style={styles.shareIcon}>
                <ShareIcon size={19} color={theme.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
  },
  collapsed: {
    paddingBottom: 8,
  },
  heroWrap: {
    height: 184,
    position: "relative",
    width: "100%",
  },
  hero: {
    height: "100%",
    width: "100%",
  },
  heroHandle: {
    alignItems: "center",
    left: 0,
    paddingTop: 10,
    paddingBottom: 18,
    position: "absolute",
    right: 0,
    top: 0,
  },
  heroGrabber: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 3,
    height: 4.5,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 2,
    width: 50,
  },
  handle: {
    alignItems: "center",
    paddingBottom: 6,
    paddingTop: 10,
  },
  grabber: {
    backgroundColor: "#8e8e8e",
    borderRadius: 3,
    height: 5,
    width: 50,
  },
  body: {
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  bodyWithHero: {
    paddingTop: 14,
  },
  roomBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: theme.line,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roomBadgeText: {
    color: theme.brandDark,
    fontSize: 13,
    fontWeight: "500",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  title: {
    color: theme.ink,
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
  },
  roomCodeUnderline: {
    textDecorationLine: "underline",
  },
  shareIcon: {
    alignItems: "center",
    backgroundColor: theme.canvas,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 4,
  },
  detail: {
    color: theme.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  primary: {
    alignItems: "center",
    backgroundColor: theme.green,
    borderRadius: 100,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
