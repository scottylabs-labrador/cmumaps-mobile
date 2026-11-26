import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSearch } from "@/api/client";
import { BuildingIcon, DoorIcon, LayersIcon, TargetIcon } from "@/components/Icons";
import { isPublicBuilding } from "@/lib/publicBuilding";
import { theme } from "@/theme";

const MAX_DROPDOWN_HEIGHT = Math.round(Dimensions.get("window").height * 0.54);

interface Props {
  query: string;
  signedIn: boolean;
  showYourLocation?: boolean;
  onSelectBuilding: (code: string) => void;
  onSelectFloor: (buildingCode: string, level: string) => void;
  onSelectRoom: (buildingCode: string, roomName: string) => void;
  onNeedSignIn: (path: string) => void;
  pickingDestination: boolean;
  onPick: (value: string) => void;
}

export const SearchResults = ({
  query,
  signedIn,
  showYourLocation = false,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  onNeedSignIn,
  pickingDestination,
  onPick,
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
          <Pressable style={styles.row} onPress={() => onPick("user")}>
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
                  if (result.type === "building") {
                    if (pickingDestination) {
                      onPick(result.id);
                      return;
                    }
                    onSelectBuilding(result.id);
                    return;
                  }
                  const buildingCode =
                    result.type === "floor"
                      ? (result.floor?.buildingCode ?? result.id.split("-")[0])
                      : result.nameWithSpace.split(" ")[0];
                  const roomName = result.nameWithSpace.split(" ")[1];
                  if (!signedIn && !isPublicBuilding(buildingCode)) {
                    const path =
                      result.type === "floor"
                        ? `/${result.id}`
                        : buildingCode && roomName
                          ? `/${buildingCode}-${roomName}`
                          : "/";
                    onNeedSignIn(path);
                    return;
                  }
                  if (result.type === "floor") {
                    const level = result.floor?.level ?? result.id.split("-").slice(1).join("-");
                    if (pickingDestination && buildingCode && level) {
                      onPick(`floor:${buildingCode}-${level}`);
                      return;
                    }
                    if (buildingCode && level) {
                      onSelectFloor(buildingCode, level);
                    }
                    return;
                  }
                  if (pickingDestination && buildingCode && roomName) {
                    onPick(`${buildingCode}-${roomName}`);
                    return;
                  }
                  if (buildingCode && roomName) {
                    onSelectRoom(buildingCode, roomName);
                  }
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
