import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSearch } from "@/api/client";
import { BuildingIcon, DoorIcon, LayersIcon, TargetIcon } from "@/components/Icons";
import {
  type CampusTarget,
  targetFromSearchDocument,
  targetWaypointToken,
} from "@/lib/campusTarget";
import { theme } from "@/theme";

const MAX_DROPDOWN_HEIGHT = Math.round(Dimensions.get("window").height * 0.5);

interface Props {
  query: string;
  showYourLocation?: boolean;
  pickingWaypoint: boolean;
  onSelectTarget: (target: CampusTarget) => void;
  onPickWaypoint: (token: string) => void;
}

export const SearchResults = ({
  query,
  showYourLocation = false,
  pickingWaypoint,
  onSelectTarget,
  onPickWaypoint,
}: Props) => {
  const results = useSearch(query);
  const trimmed = query.trim();

  if (!trimmed && !showYourLocation) {
    return null;
  }

  return (
    <View style={styles.dropdown}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      >
        {showYourLocation ? (
          <Pressable style={styles.row} onPress={() => onPickWaypoint("user")}>
            <View style={styles.iconBox}>
              <TargetIcon size={19} color={theme.brand} />
            </View>
            <Text style={[styles.title, styles.locationText]} numberOfLines={1}>
              Your Location
            </Text>
          </Pressable>
        ) : null}
        {trimmed
          ? results.data?.map((result) => (
              <Pressable
                key={`${result.type}-${result.id}`}
                style={styles.row}
                onPress={() => {
                  const target = targetFromSearchDocument(result);
                  if (!target) {
                    return;
                  }
                  if (pickingWaypoint) {
                    const token = targetWaypointToken(target);
                    if (token) {
                      onPickWaypoint(token);
                    }
                    return;
                  }
                  onSelectTarget(target);
                }}
              >
                <View style={styles.iconBox}>
                  {result.type === "building" ? (
                    <BuildingIcon size={18} color={theme.muted} />
                  ) : result.type === "floor" ? (
                    <LayersIcon size={18} color={theme.muted} />
                  ) : (
                    <DoorIcon size={18} color={theme.muted} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.title} numberOfLines={1}>
                    {result.fullNameWithSpace}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {result.type === "building" ? result.id : result.type}
                  </Text>
                </View>
              </Pressable>
            ))
          : null}
        {trimmed && results.isError ? (
          <View style={styles.statusRow}>
            <Text style={styles.meta}>Search is unavailable.</Text>
          </View>
        ) : null}
        {trimmed && results.isSuccess && (results.data?.length ?? 0) === 0 ? (
          <View style={styles.statusRow}>
            <Text style={styles.meta}>No places match that search.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: theme.paper,
    borderRadius: 14,
    maxHeight: MAX_DROPDOWN_HEIGHT,
    overflow: "hidden",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  scroll: {
    flexGrow: 0,
  },
  list: {
    paddingVertical: 4,
  },
  row: {
    alignItems: "center",
    borderBottomColor: "#eeeeee",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  iconBox: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: "500",
  },
  locationText: {
    color: theme.brand,
    fontWeight: "600",
  },
  meta: {
    color: theme.muted,
    fontSize: 12,
    textTransform: "capitalize",
  },
  statusRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
