import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

interface Props {
  floors: string[];
  current?: string;
  onSelect: (floor: string) => void;
}

export const FloorSwitcher = ({ floors, current, onSelect }: Props) => {
  if (floors.length === 0) {
    return null;
  }
  return (
    <View style={styles.bar}>
      {floors.map((floor) => {
        const selected = floor === current;
        return (
          <Pressable
            key={floor}
            onPress={() => onSelect(floor)}
            style={[styles.floor, selected ? styles.floorOn : null]}
          >
            <Text style={[styles.text, selected ? styles.textOn : null]}>{floor}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    padding: 6,
  },
  floor: {
    alignItems: "center",
    borderRadius: 12,
    minWidth: 36,
    paddingVertical: 6,
  },
  floorOn: {
    backgroundColor: theme.green,
  },
  text: {
    color: theme.ink,
    fontWeight: "700",
  },
  textOn: {
    color: "#ffffff",
  },
});
