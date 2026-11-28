import type { Buildings, GeoCoordinate, GeoRooms, Pois } from "@cmumaps/common";
import { getRoomTypeDetails } from "@cmumaps/common";
import { useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polygon, Polyline, type Region } from "react-native-maps";
import { useUserHeading } from "@/hooks/useUserHeading";
import { cameraForRegion, isInPolygon } from "@/lib/geometry";
import type { VisibleRoomLabel } from "@/lib/mapSession";
import { headingArrow } from "@/lib/userHeading";
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
  roomLabels?: VisibleRoomLabel[];
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
  onSelectRoom: (buildingCode: string, roomName: string) => void;
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

// Fixed geographic size lets the heading arrow scale naturally with map zoom.
const headingArrowRadiusMeters = 25;

// Fabric's RNMapsMapView passes maxCenterCoordinateDistance straight to
// MKMapCameraZoomRange, where 0 (< min) makes the initializer return nil;
// -1 is MKMapCameraZoomDefault (unbounded max zoom-out).
const cameraZoomRange = {
  minCenterCoordinateDistance: 5,
  maxCenterCoordinateDistance: -1,
};

// Fabric never flips AIRMap.legacyZoomConstraintsEnabled off when setting
// cameraZoomRange, so regionDidChange still runs applyLegacyZoomConstrains.
// That path calls setRegion (which resets heading to north) whenever the
// rotation-inflated getZoomLevel exceeds maxZoom (default 20). Raise it past
// indoor zoom so rotate gestures stop getting yanked north.
const iosMaxZoomLevel = 28;

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
  roomLabels,
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
  const lastFeaturePressAt = useRef(0);
  const userHeading = useUserHeading(Boolean(userPosition));
  const facingArrow =
    userPosition && userHeading !== null
      ? headingArrow(userPosition, userHeading, headingArrowRadiusMeters)
      : null;

  const hasRoomAt = (point: GeoCoordinate | undefined) => {
    if (!point || !rooms) {
      return false;
    }
    return Object.values(rooms).some((room) => isInPolygon(point, room.points[0] ?? []));
  };

  useEffect(() => {
    if (!camera || !cameraIntent || !mapRef.current) {
      return;
    }
    if (lastCameraIntent.current === cameraIntent) {
      return;
    }
    lastCameraIntent.current = cameraIntent;
    mapRef.current.animateCamera(cameraForRegion(camera, Dimensions.get("window")), {
      duration: 400,
    });
  }, [cameraIntent, camera]);

  const progressLines =
    completedLine && remainingLine ? { completed: completedLine, remaining: remainingLine } : null;

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      cameraZoomRange={cameraZoomRange}
      maxZoomLevel={Platform.OS === "ios" ? iosMaxZoomLevel : undefined}
      showsUserLocation={Boolean(userPosition)}
      showsBuildings={false}
      pitchEnabled={false}
      onPress={(event) => {
        if (
          event.nativeEvent.action === "marker-press" ||
          Date.now() - lastFeaturePressAt.current < 150
        ) {
          return;
        }
        onPressMap?.();
      }}
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
                onPress={(event) => {
                  lastFeaturePressAt.current = Date.now();
                  if (hasRoomAt(event.nativeEvent.coordinate)) {
                    return;
                  }
                  onSelectBuilding(code);
                }}
                strokeColor={selected ? theme.green : "#475569"}
                fillColor={selected ? "rgba(14,160,65,0.22)" : "rgba(100,116,139,0.24)"}
                strokeWidth={selected ? 2.5 : 1}
              />
            );
          })
        : null}
      {rooms
        ? Object.entries(rooms).map(([roomKey, room]) => {
            const roomName = roomKey.includes(":")
              ? roomKey.slice(roomKey.indexOf(":") + 1)
              : roomKey;
            const outer = ring(room.points[0]);
            if (outer.length < 3) {
              return null;
            }
            const colors = getRoomTypeDetails(room.type);
            const selected =
              roomName === selectedRoom &&
              (!selectedBuilding || room.floor.buildingCode === selectedBuilding);
            return (
              <Polygon
                key={room.id || roomKey}
                coordinates={outer}
                holes={room.points
                  .slice(1)
                  .map((hole) => ring(hole))
                  .filter((hole) => hole.length >= 3)}
                tappable
                onPress={() => {
                  lastFeaturePressAt.current = Date.now();
                  onSelectRoom(room.floor.buildingCode, roomName);
                }}
                strokeColor={selected ? "#d97706" : solid(colors.border)}
                fillColor={solid(colors.background)}
                strokeWidth={selected ? 3 : 1}
              />
            );
          })
        : null}
      {roomLabels
        ? roomLabels.map((label) => {
            const selected =
              label.roomName === selectedRoom &&
              (!selectedBuilding || label.buildingCode === selectedBuilding);
            return (
              <Marker
                key={`room-label-${label.key}`}
                coordinate={label.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => {
                  lastFeaturePressAt.current = Date.now();
                  onSelectRoom(label.buildingCode, label.roomName);
                }}
                tracksViewChanges={false}
              >
                <View style={styles.roomLabel}>
                  <Text
                    style={[styles.roomLabelNumber, selected ? styles.roomLabelSelected : null]}
                    numberOfLines={1}
                  >
                    {label.roomName}
                  </Text>
                  {label.alias ? (
                    <Text style={styles.roomLabelAlias} numberOfLines={2}>
                      {label.alias}
                    </Text>
                  ) : null}
                </View>
              </Marker>
            );
          })
        : null}
      {buildings
        ? Object.entries(buildings).map(([code, building]) => {
            if (rooms && Object.keys(rooms).length > 0 && code === selectedBuilding) {
              return null;
            }
            return (
              <Marker
                key={`${code}-label`}
                coordinate={{
                  latitude: building.labelLatitude,
                  longitude: building.labelLongitude,
                }}
                onPress={() => {
                  lastFeaturePressAt.current = Date.now();
                  onSelectBuilding(code);
                }}
                tracksViewChanges={false}
              >
                <View style={styles.roundel}>
                  <Text style={styles.roundelText} numberOfLines={1} adjustsFontSizeToFit>
                    {code}
                  </Text>
                </View>
              </Marker>
            );
          })
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
      {facingArrow ? (
        <Polygon
          coordinates={facingArrow}
          fillColor="#007AFF"
          strokeColor="#ffffff"
          strokeWidth={1.5}
          tappable={false}
          zIndex={10}
        />
      ) : null}
    </MapView>
  );
};

const styles = StyleSheet.create({
  roundel: {
    alignItems: "center",
    backgroundColor: "#525C68",
    borderColor: "#ffffff",
    borderRadius: 15,
    borderWidth: 1.5,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 2,
    width: 30,
  },
  roundelText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  roomLabel: {
    alignItems: "center",
    maxWidth: 76,
    paddingHorizontal: 2,
  },
  roomLabelNumber: {
    color: theme.ink,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  roomLabelSelected: {
    color: "#9a3412",
    fontWeight: "700",
  },
  roomLabelAlias: {
    color: "#334155",
    fontSize: 9.5,
    fontStyle: "italic",
    lineHeight: 11,
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
