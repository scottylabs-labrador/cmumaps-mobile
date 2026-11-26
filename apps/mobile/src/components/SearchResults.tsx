import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSearch } from "@/api/client";
import { isPublicBuilding } from "@/lib/publicBuilding";
import { theme } from "@/theme";

interface Props {
  query: string;
  signedIn: boolean;
  onSelectBuilding: (code: string) => void;
  onSelectFloor: (buildingCode: string, level: string) => void;
  onSelectRoom: (buildingCode: string, roomName: string) => void;
  onNeedSignIn: (path: string) => void;
  pickingDestination: boolean;
  onPick: (value: string) => void;
  onClose: () => void;
}

export const SearchResults = ({
  query,
  signedIn,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  onNeedSignIn,
  pickingDestination,
  onPick,
  onClose,
}: Props) => {
  const results = useSearch(query);
  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.handleRow}>
        <View style={styles.grabber} />
      </View>
      <View style={styles.header}>
        <Text style={styles.heading} numberOfLines={1}>
          {trimmed}
        </Text>
        <Pressable accessibilityLabel="Close search" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {results.data?.map((result) => (
          <Pressable
            key={`${result.type}-${result.id}`}
            style={styles.card}
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
            <Text style={styles.title}>{result.fullNameWithSpace}</Text>
            <Text style={styles.meta}>{result.type}</Text>
          </Pressable>
        ))}
        {results.isError ? <Text style={styles.meta}>Search is unavailable.</Text> : null}
        {results.isSuccess && (results.data?.length ?? 0) === 0 ? (
          <Text style={styles.meta}>No places match that search.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "58%",
    maxHeight: "58%",
    paddingBottom: 12,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    backgroundColor: theme.line,
    borderRadius: 4,
    height: 4,
    width: 48,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  heading: {
    color: theme.ink,
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: theme.canvas,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeText: {
    color: theme.muted,
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: theme.paper,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: theme.muted,
    marginTop: 4,
    textTransform: "capitalize",
  },
});
