import type { Buildings, GeoCoordinate, GeoRooms, Pois } from "@cmumaps/common";
import { getRoomTypeDetails } from "@cmumaps/common";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polygon, Polyline, type Region } from "react-native-maps";
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
  completedLine?: GeoCoordinate[];
  remainingLine?: GeoCoordinate[];
  selectedRoom?: string;
  selectedBuilding?: string;
  userPosition: GeoCoordinate | null;
  camera: CameraTarget | null;
  /** Stable key for when to animate; same intent must not re-zoom. */
  cameraIntent: string;
  onSelectBuilding: (code: string) => void;
  onSelectRoom: (roomName: string) => void;
  onPressMap?: () => void;
  onLongPress: (coordinate: GeoCoordinate) => void;
  onRegionChangeComplete: (region: Region) => void;
}

const initialRegion = {
  latitude: 40.444,
  longitude: -79.945,
  latitudeDelta: 0.006337455593801167,
  longitudeDelta: 0.011960061265583022,
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
  completedLine,
  remainingLine,
  selectedRoom,
  selectedBuilding,
  userPosition,
  camera,
  cameraIntent,
  onSelectBuilding,
  onSelectRoom,
  onPressMap,
  onLongPress,
  onRegionChangeComplete,
}: Props) => {
  const mapRef = useRef<MapView>(null);
  const lastCameraIntent = useRef("");

  useEffect(() => {
    if (!camera || !cameraIntent || !mapRef.current) {
      return;
    }
    if (lastCameraIntent.current === cameraIntent) {
      return;
    }
    lastCameraIntent.current = cameraIntent;
    mapRef.current.animateToRegion(camera, 400);
  }, [cameraIntent, camera]);

  const progressLines =
    completedLine && remainingLine ? { completed: completedLine, remaining: remainingLine } : null;

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation={Boolean(userPosition)}
      showsBuildings={false}
      pitchEnabled={false}
      onPress={() => onPressMap?.()}
      onLongPress={(event) => onLongPress(event.nativeEvent.coordinate)}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {buildings
        ? Object.entries(buildings).map(([code, building]) => {
            const outer = ring(building.shape[0]);
            if (outer.length < 3) {
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
                fillColor={selected ? "rgba(22,128,60,0.28)" : "rgba(100,116,139,0.28)"}
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
      {progressLines ? (
        <>
          {progressLines.completed.length > 1 ? (
            <Polyline coordinates={progressLines.completed} strokeColor="#94a3b8" strokeWidth={5} />
          ) : null}
          {progressLines.remaining.length > 1 ? (
            <Polyline
              coordinates={progressLines.remaining}
              strokeColor={theme.green}
              strokeWidth={5}
            />
          ) : null}
        </>
      ) : line.length > 1 ? (
        <Polyline coordinates={line} strokeColor={theme.green} strokeWidth={5} />
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
