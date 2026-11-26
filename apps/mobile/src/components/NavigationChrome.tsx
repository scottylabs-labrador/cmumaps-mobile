import type { Instruction } from "@cmumaps/common";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BuildingIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  CloseIcon,
  DirectionArrowIcon,
  LayersIcon,
  PinIcon,
  SwapIcon,
  TargetIcon,
  ZapIcon,
} from "@/components/Icons";
import { ROUTE_KINDS, type RouteKind, type RoutePlan, type RouteSummary } from "@/lib/routePlan";
import { theme } from "@/theme";

const MAX_STEPS_HEIGHT = Math.round(Dimensions.get("window").height * 0.8);

interface NavHeaderProps {
  src: string;
  startLabel: string;
  endLabel: string;
  userLocationAvailable: boolean;
  editingField: "src" | "dst" | null;
  searchQuery: string;
  onBack: () => void;
  onFocusField: (field: "src" | "dst") => void;
  onChangeQuery: (field: "src" | "dst", value: string) => void;
  onClearStart: () => void;
  onSwap: () => void;
}

export const NavHeader = ({
  src,
  startLabel,
  endLabel,
  userLocationAvailable,
  editingField,
  searchQuery,
  onBack,
  onFocusField,
  onChangeQuery,
  onClearStart,
  onSwap,
}: NavHeaderProps) => (
  <View style={styles.navHeader}>
    <Pressable accessibilityLabel="Back" hitSlop={8} onPress={onBack} style={styles.navTitleRow}>
      <ChevronLeftIcon size={18} color={theme.subtle} />
      <Text style={styles.navTitle}>Navigation</Text>
    </Pressable>
    <View style={styles.navEndpoints}>
      <View style={styles.navEndpointRail}>
        <TargetIcon
          size={18}
          color={src === "user" && !userLocationAvailable ? theme.subtle : theme.brand}
        />
        <View style={styles.navRailDots}>
          <View style={styles.navRailDot} />
          <View style={styles.navRailDot} />
          <View style={styles.navRailDot} />
        </View>
        <PinIcon size={18} color={theme.danger} />
      </View>
      <View style={styles.navEndpointFields}>
        <View
          style={[styles.navEndpoint, editingField === "src" ? styles.navEndpointActive : null]}
        >
          <TextInput
            value={editingField === "src" ? searchQuery : startLabel}
            placeholder="Choose start"
            placeholderTextColor={theme.subtle}
            style={[
              styles.navEndpointInput,
              editingField !== "src" && src === "user"
                ? userLocationAvailable
                  ? styles.navEndpointStart
                  : styles.navEndpointUnavailable
                : null,
            ]}
            onFocus={() => onFocusField("src")}
            onChangeText={(value) => onChangeQuery("src", value)}
          />
          {src || (editingField === "src" && searchQuery.length > 0) ? (
            <Pressable accessibilityLabel="Clear start" onPress={onClearStart} hitSlop={8}>
              <CloseIcon size={16} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
        <View
          style={[styles.navEndpoint, editingField === "dst" ? styles.navEndpointActive : null]}
        >
          <TextInput
            value={editingField === "dst" ? searchQuery : endLabel}
            placeholder="Enter destination"
            placeholderTextColor={theme.subtle}
            style={styles.navEndpointInput}
            onFocus={() => onFocusField("dst")}
            onChangeText={(value) => onChangeQuery("dst", value)}
          />
          <Pressable accessibilityLabel="Swap start and destination" onPress={onSwap} hitSlop={8}>
            <SwapIcon size={18} color={theme.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  </View>
);

interface BannerProps {
  instructions: Instruction[];
  index: number;
  destinationLabel: string;
  buildingLabel?: string;
  onPrev: () => void;
  onNext: () => void;
}

export const TurnByTurnBanner = ({
  instructions,
  index,
  destinationLabel,
  buildingLabel,
  onPrev,
  onNext,
}: BannerProps) => {
  if (instructions.length === 0) {
    return null;
  }

  const arrived = index >= instructions.length;
  const current = arrived ? null : instructions[index];
  const canPrev = index > 0;

  return (
    <View style={styles.bannerShadow}>
      <View style={[styles.banner, arrived ? styles.bannerArrived : null]}>
        {arrived ? (
          <View style={styles.arrivedBody}>
            <Text style={styles.arrivedTitle}>You have arrived</Text>
            <Text style={styles.arrivedSub} numberOfLines={1}>
              Near {destinationLabel}
            </Text>
          </View>
        ) : current ? (
          <View style={styles.bannerBody}>
            <View style={styles.bannerArrow}>
              <DirectionArrowIcon action={current.action} size={46} color="#ffffff" />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle} numberOfLines={1} adjustsFontSizeToFit>
                {current.distance > 0 ? `${current.distance} ft` : current.action}
              </Text>
              <Text style={styles.bannerSub} numberOfLines={2}>
                {current.distance > 0 ? current.action : destinationLabel}
              </Text>
            </View>
            {buildingLabel ? (
              <Text style={styles.bannerBuilding} numberOfLines={2}>
                {buildingLabel}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.bannerControls, arrived ? styles.bannerControlsArrived : null]}>
          <Pressable
            accessibilityLabel="Previous step"
            disabled={!canPrev}
            onPress={onPrev}
            style={[styles.bannerControl, !canPrev ? styles.bannerControlDisabled : null]}
          >
            <ChevronDoubleLeftIcon size={17} color="#ffffff" />
            <Text style={styles.bannerControlText}>Prev</Text>
          </Pressable>
          {!arrived ? (
            <Pressable accessibilityLabel="Next step" onPress={onNext} style={styles.bannerControl}>
              <Text style={styles.bannerControlText}>Next</Text>
              <ChevronDoubleRightIcon size={17} color="#ffffff" />
            </Pressable>
          ) : (
            <View />
          )}
        </View>
      </View>
    </View>
  );
};

interface StepsSheetProps {
  visible: boolean;
  plan: RoutePlan;
  summary?: RouteSummary | null;
  index: number;
  destinationLabel: string;
  onSelectStep: (index: number) => void;
  onClose: () => void;
  onEnd: () => void;
}

export const StepsSheet = ({
  visible,
  plan,
  summary,
  index,
  destinationLabel,
  onSelectStep,
  onClose,
  onEnd,
}: StepsSheetProps) => {
  const instructions = plan.activeRoute?.instructions ?? [];
  const arrived = instructions.length > 0 && index >= instructions.length;
  const current = arrived ? null : instructions[index];
  const stats = summary === undefined ? plan.summary : summary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.stepsBackdrop}>
        <Pressable style={styles.stepsDismissArea} onPress={onClose} />
        <View style={styles.stepsSheet}>
          <Pressable
            accessibilityLabel="Close steps"
            onPress={onClose}
            style={styles.stepsHandleRow}
          >
            <View style={styles.stepsGrabber} />
          </Pressable>

          <View style={[styles.stepsHeaderCard, arrived ? styles.bannerArrived : null]}>
            <View style={styles.stepsHeaderContent}>
              {arrived ? (
                <View style={styles.stepsHeaderCopy}>
                  <Text style={styles.stepsHeaderTitle}>You have arrived</Text>
                  <Text style={styles.stepsHeaderSub} numberOfLines={1}>
                    Near {destinationLabel}
                  </Text>
                </View>
              ) : current ? (
                <>
                  <DirectionArrowIcon action={current.action} size={34} color="#ffffff" />
                  <View style={styles.stepsHeaderCopy}>
                    <Text style={styles.stepsHeaderTitle} numberOfLines={1}>
                      {current.distance > 0 ? `${current.distance} ft` : current.action}
                    </Text>
                    <Text style={styles.stepsHeaderSub} numberOfLines={2}>
                      {current.distance > 0 ? current.action : destinationLabel}
                    </Text>
                  </View>
                </>
              ) : null}
              <Pressable
                accessibilityLabel="Close directions list"
                onPress={onClose}
                style={styles.stepsCloseButton}
              >
                <CloseIcon size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsList}>
            {instructions.map((step, stepIdx) => {
              const completed = stepIdx < index;
              const active = stepIdx === index;
              const iconColor = active ? theme.green : completed ? theme.subtle : theme.ink;
              return (
                <View key={`${step.nodeId}-${stepIdx}`}>
                  {active && stepIdx > 0 ? <View style={styles.activeDivider} /> : null}
                  <Pressable
                    style={styles.stepRow}
                    onPress={() => {
                      onSelectStep(stepIdx);
                      onClose();
                    }}
                  >
                    <View style={styles.stepIcon}>
                      <DirectionArrowIcon action={step.action} size={22} color={iconColor} />
                    </View>
                    <View style={styles.stepCopy}>
                      <Text
                        style={[
                          styles.stepAction,
                          completed ? styles.stepCompleted : null,
                          active ? styles.stepActive : null,
                        ]}
                      >
                        {step.action}
                      </Text>
                      {step.distance > 0 ? (
                        <Text
                          style={[styles.stepDistance, completed ? styles.stepCompleted : null]}
                        >
                          {step.distance} ft
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              style={styles.stepRow}
              onPress={() => {
                onSelectStep(instructions.length);
                onClose();
              }}
            >
              <View style={styles.stepIcon}>
                <PinIcon size={20} color={arrived ? theme.brand : theme.danger} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepAction, arrived ? styles.stepArrived : null]}>
                  Arrive at {destinationLabel}
                </Text>
              </View>
            </Pressable>
          </ScrollView>

          <View style={styles.stepsFooter}>
            <View style={styles.stats}>
              {stats ? (
                <>
                  <Stat value={stats.arrival} label="arrival" />
                  <Stat value={String(stats.minutes)} label="min" />
                  <Stat value={stats.distanceValue} label={stats.distanceUnit} />
                </>
              ) : null}
            </View>
            <Pressable
              onPress={() => {
                onClose();
                onEnd();
              }}
              style={styles.end}
            >
              <Text style={styles.actionText}>End</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface NavPanelProps {
  plan: RoutePlan;
  summary?: RouteSummary | null;
  navigating: boolean;
  onSelect: (route: RouteKind) => void;
  onGo: () => void;
  onEnd: () => void;
  onOpenSteps?: () => void;
}

export const NavPanel = ({
  plan,
  summary,
  navigating,
  onSelect,
  onGo,
  onEnd,
  onOpenSteps,
}: NavPanelProps) => {
  const stats = navigating && summary !== undefined ? summary : plan.summary;
  const ready = plan.canGo && Boolean(plan.summary);

  if (navigating) {
    return (
      <View style={styles.navigatingWrap} pointerEvents="box-none">
        {onOpenSteps ? (
          <Pressable
            accessibilityLabel="Show all steps"
            onPress={onOpenSteps}
            style={styles.stepsFab}
          >
            <LayersIcon size={22} color="#ffffff" />
          </Pressable>
        ) : null}
        <View style={styles.tripBar}>
          <View style={styles.stats}>
            {stats ? (
              <>
                <Stat value={stats.arrival} label="arrival" />
                <Stat value={String(stats.minutes)} label="min" />
                <Stat value={stats.distanceValue} label={stats.distanceUnit} />
              </>
            ) : null}
          </View>
          <Pressable onPress={onEnd} style={styles.end}>
            <Text style={styles.actionText}>End</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.tabBand}>
          {ROUTE_KINDS.map((kind) => {
            const available = plan.availableKinds.includes(kind) && ready;
            const active = kind === plan.selectedKind && available;
            const tint = active ? theme.brandDark : available ? theme.ink : theme.subtle;
            return (
              <Pressable
                key={kind}
                disabled={!available}
                onPress={() => onSelect(kind)}
                style={[styles.tab, active ? styles.tabOn : null]}
              >
                {kind === "Fastest" ? (
                  <ZapIcon size={18} color={tint} />
                ) : (
                  <BuildingIcon size={18} color={tint} />
                )}
                <Text style={[styles.tabLabel, { color: tint }]}>
                  {kind === "Inside" ? "Indoor" : "Fastest"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.footerBand}>
          <View style={styles.stats}>
            {ready && stats ? (
              <>
                <Stat value={stats.arrival} label="arrival" />
                <Stat value={String(stats.minutes)} label="min" />
                <Stat value={stats.distanceValue} label={stats.distanceUnit} />
              </>
            ) : (
              <Text style={styles.unavailable} numberOfLines={2}>
                {plan.error || "Path unavailable"}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onGo}
            style={[styles.go, !ready ? styles.goDisabled : null]}
            disabled={!ready}
          >
            <Text style={styles.actionText}>Go</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  navHeader: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  navTitleRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  navTitle: {
    color: theme.subtle,
    fontSize: 14,
    fontWeight: "600",
  },
  navEndpoints: {
    flexDirection: "row",
    gap: 10,
  },
  navEndpointRail: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    width: 22,
  },
  navRailDots: {
    alignItems: "center",
    gap: 4,
  },
  navRailDot: {
    backgroundColor: theme.disabled,
    borderRadius: 2,
    height: 3.5,
    width: 3.5,
  },
  navEndpointFields: {
    flex: 1,
    gap: 8,
  },
  navEndpoint: {
    alignItems: "center",
    borderColor: theme.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  navEndpointActive: {
    borderColor: theme.brand,
  },
  navEndpointInput: {
    color: theme.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  navEndpointStart: {
    color: theme.brand,
  },
  navEndpointUnavailable: {
    color: theme.subtle,
  },
  bannerShadow: {
    borderRadius: 20,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  banner: {
    backgroundColor: theme.green,
    borderRadius: 20,
    overflow: "hidden",
  },
  bannerArrived: {
    backgroundColor: theme.brand,
  },
  bannerBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  bannerArrow: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
  },
  bannerCopy: {
    flex: 1,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 34,
  },
  bannerSub: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  bannerBuilding: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    maxWidth: 108,
    textAlign: "right",
  },
  arrivedBody: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  arrivedTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "600",
  },
  arrivedSub: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 4,
  },
  bannerControls: {
    alignItems: "center",
    backgroundColor: theme.greenDark,
    flexDirection: "row",
    height: 46,
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  bannerControlsArrived: {
    backgroundColor: theme.brandDark,
  },
  bannerControl: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 6,
  },
  bannerControlDisabled: {
    opacity: 0.35,
  },
  bannerControlText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  navigatingWrap: {
    alignItems: "stretch",
  },
  stepsFab: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: theme.green,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 12,
    marginRight: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: 48,
    elevation: 6,
  },
  stepsBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    flex: 1,
    justifyContent: "flex-end",
  },
  stepsDismissArea: {
    flex: 1,
  },
  stepsSheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: MAX_STEPS_HEIGHT,
    overflow: "hidden",
    paddingBottom: 24,
  },
  stepsHandleRow: {
    alignItems: "center",
    paddingBottom: 10,
    paddingTop: 10,
  },
  stepsGrabber: {
    backgroundColor: "#8e8e8e",
    borderRadius: 3,
    height: 5,
    width: 50,
  },
  stepsHeaderCard: {
    backgroundColor: theme.green,
    borderRadius: 14,
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stepsHeaderContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  stepsHeaderCopy: {
    flex: 1,
  },
  stepsHeaderTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
  },
  stepsHeaderSub: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 14,
    marginTop: 2,
  },
  stepsCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stepsScroll: {
    flexGrow: 0,
    marginTop: 8,
  },
  stepsList: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  activeDivider: {
    backgroundColor: theme.green,
    borderRadius: 1,
    height: 2,
    marginVertical: 4,
  },
  stepRow: {
    alignItems: "center",
    borderBottomColor: "#eeeeee",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    paddingVertical: 13,
  },
  stepIcon: {
    alignItems: "center",
    width: 26,
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  stepAction: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: "500",
  },
  stepDistance: {
    color: theme.muted,
    fontSize: 13,
  },
  stepCompleted: {
    color: theme.subtle,
  },
  stepActive: {
    color: theme.green,
    fontWeight: "600",
  },
  stepArrived: {
    color: theme.brand,
    fontWeight: "600",
  },
  stepsFooter: {
    alignItems: "center",
    borderTopColor: "#eeeeee",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  cardShadow: {
    borderRadius: 14,
    marginBottom: 22,
    marginHorizontal: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: 14,
    overflow: "hidden",
  },
  tabBand: {
    backgroundColor: theme.canvas,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tab: {
    alignItems: "center",
    borderRadius: 11,
    gap: 4,
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabOn: {
    backgroundColor: theme.chip,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  footerBand: {
    alignItems: "center",
    backgroundColor: theme.paper,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tripBar: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 22,
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  stats: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  stat: {
    alignItems: "center",
    flexShrink: 1,
  },
  statValue: {
    color: theme.ink,
    fontSize: 21,
    fontWeight: "600",
  },
  statLabel: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 2,
  },
  unavailable: {
    color: theme.muted,
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  go: {
    alignItems: "center",
    backgroundColor: theme.green,
    borderRadius: 100,
    minWidth: 82,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  goDisabled: {
    backgroundColor: theme.disabled,
  },
  end: {
    alignItems: "center",
    backgroundColor: theme.danger,
    borderRadius: 100,
    minWidth: 82,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
});
