import type { PreciseRoute } from "@cmumaps/common";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RouteKind } from "@/store";
import { theme } from "@/theme";

interface Props {
  srcLabel: string;
  dstLabel: string;
  routes: Record<string, PreciseRoute> | undefined;
  selected: RouteKind;
  navigating: boolean;
  instructionIndex: number;
  error?: string;
  canGo?: boolean;
  onSelect: (route: RouteKind) => void;
  onGo: () => void;
  onEnd: () => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onSwap: () => void;
}

const summary = (route: PreciseRoute | undefined) => {
  const distance = Math.round(route?.path.distance ?? 0);
  const minutes = Math.round(distance / 100);
  const arrival = new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { distance, minutes, arrival };
};

export const NavPanel = ({
  srcLabel,
  dstLabel,
  routes,
  selected,
  navigating,
  instructionIndex,
  error,
  canGo = true,
  onSelect,
  onGo,
  onEnd,
  onPrev,
  onNext,
  onBack,
  onSwap,
}: Props) => {
  const route = routes?.[selected];
  const stats = summary(route);
  const instruction = route?.instructions[instructionIndex];

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Pressable onPress={onSwap}>
          <Text style={styles.link}>Swap</Text>
        </Pressable>
      </View>
      <Text style={styles.place}>{srcLabel || "Choose a start"}</Text>
      <Text style={styles.place}>{dstLabel || "Choose a destination"}</Text>
      <View style={styles.chips}>
        {(["Fastest", "Inside"] as const).map((kind) => {
          const available = Boolean(routes?.[kind]);
          const active = kind === selected;
          return (
            <Pressable
              key={kind}
              disabled={!available}
              onPress={() => onSelect(kind)}
              style={[styles.chip, active ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, !available ? styles.chipOff : null]}>{kind}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stats}>
        <Stat value={stats.arrival} label="arrival" />
        <Stat value={String(stats.minutes)} label="min" />
        <Stat value={String(stats.distance)} label="ft" />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {navigating && instruction ? (
        <ScrollView style={styles.steps}>
          {route?.instructions.map((step, index) => (
            <Text
              key={`${step.nodeId}-${index}`}
              style={index === instructionIndex ? styles.stepOn : styles.step}
            >
              {step.action} · {step.distance} ft
            </Text>
          ))}
        </ScrollView>
      ) : null}
      {navigating ? (
        <View style={styles.actions}>
          <Pressable onPress={onPrev} style={styles.secondary}>
            <Text>Prev</Text>
          </Pressable>
          <Pressable onPress={onNext} style={styles.secondary}>
            <Text>Next</Text>
          </Pressable>
          <Pressable onPress={onEnd} style={styles.end}>
            <Text style={styles.primaryText}>End</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onGo}
          style={[styles.go, !(route && canGo) ? styles.goDisabled : null]}
          disabled={!(route && canGo)}
        >
          <Text style={styles.primaryText}>Go</Text>
        </Pressable>
      )}
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  link: {
    color: theme.greenDark,
    fontWeight: "700",
  },
  place: {
    color: theme.ink,
    fontSize: 16,
    marginTop: 4,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  chip: {
    backgroundColor: theme.canvas,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: {
    backgroundColor: theme.chip,
  },
  chipText: {
    color: theme.ink,
    fontWeight: "700",
  },
  chipOff: {
    color: theme.muted,
  },
  stats: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  statValue: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: theme.muted,
  },
  error: {
    color: theme.danger,
    marginTop: 8,
  },
  steps: {
    maxHeight: 140,
    marginTop: 12,
  },
  step: {
    color: theme.muted,
    paddingVertical: 4,
  },
  stepOn: {
    color: theme.ink,
    fontWeight: "700",
    paddingVertical: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  go: {
    alignItems: "center",
    backgroundColor: theme.green,
    borderRadius: 24,
    marginTop: 16,
    paddingVertical: 12,
  },
  goDisabled: {
    opacity: 0.4,
  },
  end: {
    backgroundColor: theme.danger,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondary: {
    borderColor: theme.line,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
