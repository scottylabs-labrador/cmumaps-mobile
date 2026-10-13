import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import type { Buildings, GeoCoordinate, GeoRooms, Pois } from "@cmumaps/common";
import { getRoomTypeDetails } from "@cmumaps/common";
import { INITIAL_REGION } from "@cmumaps/ui";
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
}

const initialRegion = {
  latitude: INITIAL_REGION.centerLatitude,
  longitude: INITIAL_REGION.centerLongitude,
  latitudeDelta: INITIAL_REGION.latitudeDelta,
  longitudeDelta: INITIAL_REGION.longitudeDelta,
};

const ring = (points: GeoCoordinate[] | undefined) => points ?? [];

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
}: Props) => {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!camera) {
      return;
    }
    mapRef.current?.animateToRegion(camera, 350);
  }, [camera]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation={Boolean(userPosition)}
      onLongPress={(event) => onLongPress(event.nativeEvent.coordinate)}
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
                holes={building.shape.slice(1).filter((hole) => hole.length >= 3)}
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
                holes={room.points.slice(1).filter((hole) => hole.length >= 3)}
                tappable
                onPress={() => onSelectRoom(roomName)}
                strokeColor={selected ? "#d97706" : colors.border}
                fillColor={colors.background}
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
