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
}: Props) => {
  const results = useSearch(query);

  if (!query.trim()) {
    return null;
  }

  return (
    <View style={styles.sheet}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {results.data?.map((result) => (
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
            <Text style={styles.title}>{result.fullNameWithSpace}</Text>
            <Text style={styles.meta}>{result.type}</Text>
          </Pressable>
        ))}
        {results.isError ? <Text style={styles.meta}>Search is unavailable.</Text> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    maxHeight: 360,
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.line,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: theme.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
});
