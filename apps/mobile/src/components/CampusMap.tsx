import type { Buildings, GeoCoordinate, GeoRooms, Pois } from "@cmumaps/common";
import { getRoomTypeDetails } from "@cmumaps/common";
import { INITIAL_REGION } from "@cmumaps/ui";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import { theme } from "@/theme";

interface CameraTarget {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Props {
  buildings: Buildings | undefined;
  rooms: GeoRooms | undefined;
  pois: Pois | undefined;
  line: GeoCoordinate[];
  selectedRoom?: string;
  selectedBuilding?: string;
  userPosition: GeoCoordinate | null;
  camera: CameraTarget | null;
  onSelectBuilding: (code: string) => void;
  onSelectRoom: (roomName: string) => void;
  onLongPress: (coordinate: GeoCoordinate) => void;
  onRegionChangeComplete: (region: Region) => void;
}

const initialRegion = {
  latitude: INITIAL_REGION.centerLatitude,
  longitude: INITIAL_REGION.centerLongitude,
  latitudeDelta: INITIAL_REGION.latitudeDelta,
  longitudeDelta: INITIAL_REGION.longitudeDelta,
};

// GeoJSON rings repeat the first point. MapKit closes the shape itself, and the
// duplicate vertex makes the fill drop out once the map is zoomed in.
const ring = (points: GeoCoordinate[] | undefined) => {
  const coordinates = points ?? [];
  const first = coordinates[0];
  const last = coordinates.at(-1);
  if (
    coordinates.length > 1 &&
    first &&
    last &&
    first.latitude === last.latitude &&
    first.longitude === last.longitude
  ) {
    return coordinates.slice(0, -1);
  }
  return coordinates;
};

const solid = (color: string) => {
  if (!color.startsWith("#") || color.length !== 7) {
    return color;
  }
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},1)`;
};

export const CampusMap = ({
  buildings,
  rooms,
  pois,
  line,
  selectedRoom,
  selectedBuilding,
  userPosition,
  camera,
  onSelectBuilding,
  onSelectRoom,
  onLongPress,
  onRegionChangeComplete,
}: Props) => {
  // Expo Go applies initialRegion only when the native map is created.
  // Region, camera, and animateToRegion leave the existing map in place,
  // so a place change unmounts the map and mounts a new one.
  const regionKey = camera
    ? `${camera.latitude}:${camera.longitude}:${camera.latitudeDelta}:${camera.longitudeDelta}`
    : "campus";
  const [visibleKey, setVisibleKey] = useState(regionKey);
  const openBuilding = rooms
    ? Object.values(rooms)[0]?.floor.buildingCode
    : undefined;

  useEffect(() => {
    if (visibleKey === regionKey) {
      return;
    }
    const frame = requestAnimationFrame(() => setVisibleKey(regionKey));
    return () => cancelAnimationFrame(frame);
  }, [regionKey, visibleKey]);

  if (visibleKey !== regionKey) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={camera ?? initialRegion}
      showsUserLocation={Boolean(userPosition)}
      showsBuildings={false}
      pitchEnabled={false}
      onLongPress={(event) => onLongPress(event.nativeEvent.coordinate)}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {buildings
        ? Object.entries(buildings).map(([code, building]) => {
            const outer = ring(building.shape[0]);
            if (outer.length < 3 || code === openBuilding) {
              return null;
            }
            const selected = code === selectedBuilding;
            return (
              <Polygon
                key={code}
                coordinates={outer}
                holes={building.shape
                  .slice(1)
                  .map((hole) => ring(hole))
                  .filter((hole) => hole.length >= 3)}
                tappable
                onPress={() => onSelectBuilding(code)}
                strokeColor={selected ? theme.green : "#334155"}
                fillColor={
                  selected ? "rgba(22,128,60,0.28)" : "rgba(100,116,139,0.28)"
                }
                strokeWidth={selected ? 3 : 1}
              />
            );
          })
        : null}
      {rooms
        ? Object.entries(rooms).map(([roomName, room]) => {
            const outer = ring(room.points[0]);
            if (outer.length < 3) {
              return null;
            }
            const colors = getRoomTypeDetails(room.type);
            const selected = roomName === selectedRoom;
            return (
              <Polygon
                key={roomName}
                coordinates={outer}
                holes={room.points
                  .slice(1)
                  .map((hole) => ring(hole))
                  .filter((hole) => hole.length >= 3)}
                tappable
                onPress={() => onSelectRoom(roomName)}
                strokeColor={selected ? "#d97706" : solid(colors.border)}
                fillColor={solid(colors.background)}
                strokeWidth={selected ? 3 : 1}
              />
            );
          })
        : null}
      {buildings
        ? Object.entries(buildings).map(([code, building]) => (
            <Marker
              key={`${code}-label`}
              coordinate={{
                latitude: building.labelLatitude,
                longitude: building.labelLongitude,
              }}
              onPress={() => onSelectBuilding(code)}
              tracksViewChanges={false}
            >
              <View style={styles.roundel}>
                <Text style={styles.roundelText}>{code}</Text>
              </View>
            </Marker>
          ))
        : null}
      {pois
        ? Object.entries(pois).map(([id, poi]) => (
            <Marker
              key={id}
              coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
              title={poi.type || "Point"}
              pinColor={theme.green}
            />
          ))
        : null}
      {line.length > 1 ? (
        <Polyline
          coordinates={line}
          strokeColor={theme.green}
          strokeWidth={5}
        />
      ) : null}
    </MapView>
  );
};

const styles = StyleSheet.create({
  roundel: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roundelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
