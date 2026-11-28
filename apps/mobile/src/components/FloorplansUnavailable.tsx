import { LayersMinus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Region } from "react-native-maps";
import { theme } from "@/theme";

export const FloorplansUnavailable = ({ region }: { region: Region | null }) => {
  const [tooltipRegion, setTooltipRegion] = useState<Region | null>(null);
  const expanded = region !== null && tooltipRegion === region;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Floorplans Unavailable"
        accessibilityState={{ expanded }}
        onPress={() => setTooltipRegion(expanded ? null : region)}
        style={styles.button}
      >
        <LayersMinus size={24} color={theme.muted} strokeWidth={1.9} />
      </Pressable>
      {expanded ? (
        <View style={styles.tooltip}>
          <Text style={styles.label}>Floorplans Unavailable</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tooltip: {
    backgroundColor: theme.paper,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    color: theme.ink,
    fontSize: 14,
  },
});
