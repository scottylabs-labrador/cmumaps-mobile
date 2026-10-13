import { useQuery } from "@tanstack/react-query";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Buildings, GeoCoordinate, GeoRooms } from "@cmumaps/common";
import {
  fetchBuildings,
  fetchFloorplan,
  fetchPois,
} from "@/api/client";
import { signIn, signOut } from "@/auth/client";
import { CampusMap } from "@/components/CampusMap";
import { FloorSwitcher } from "@/components/FloorSwitcher";
import { GearMenu, PromptCard } from "@/components/GearMenu";
import { NavPanel } from "@/components/NavPanel";
import { PlaceSheet } from "@/components/PlaceSheet";
import { SearchResults } from "@/components/SearchResults";
import { routeLine, useRoutes } from "@/hooks/useRoutes";
import { useSignedInUser } from "@/hooks/useWaypoint";
import { requestUserLocation, useUserLocation } from "@/hooks/useUserLocation";
import {
  focusedFloor,
  parsePlace,
  type Place,
  suffixFromPathname,
} from "@/lib/place";
import { isPublicBuilding } from "@/lib/publicBuilding";
import { shareUrl } from "@/lib/shareUrl";
import { useMapStore } from "@/store";
import { theme } from "@/theme";

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const href = (path: string, src?: string, dst?: string) => {
  const params = new URLSearchParams();
  if (src) {
    params.set("src", src);
  }
  if (dst) {
    params.set("dst", dst);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const placeTitle = (place: Place, buildings: Buildings | undefined, rooms: GeoRooms | undefined) => {
  if (place.kind === "coordinate") {
    return "Pinned place";
  }
  if (place.kind === "unknown") {
    return "That link is not on the map";
  }
  if (place.kind !== "building" && place.kind !== "floor" && place.kind !== "room") {
    return "";
  }
  const building = buildings?.[place.buildingCode];
  if (place.kind === "room") {
    const room = rooms?.[place.roomName];
    return room?.alias || `${building?.name ?? place.buildingCode} ${place.roomName}`;
  }
  if (place.kind === "floor") {
    return `${building?.name ?? place.buildingCode} floor ${place.floor}`;
  }
  return building?.name ?? place.buildingCode;
};

export const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{
    src?: string;
    dst?: string;
    floor?: string;
  }>();
  const src = one(params.src) ?? "";
  const dst = one(params.dst) ?? "";
  const floorParam = one(params.floor) ?? "";
  const [gearOpen, setGearOpen] = useState(false);
  const [returnPath, setReturnPath] = useState("/");

  useUserLocation();
  const { user } = useSignedInUser();
  const signedIn = Boolean(user);
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: fetchBuildings });
  const suffix = suffixFromPathname(pathname);
  const place = parsePlace(
    suffix === "" && floorParam ? floorParam : suffix,
    buildings.data,
  );
  const floor = focusedFloor(place, buildings.data);
  const floorCode = floor ? `${floor.buildingCode}-${floor.floor}` : null;
  const canSeeFloor = Boolean(floor) && (signedIn || isPublicBuilding(floor?.buildingCode));
  const rooms = useQuery({
    queryKey: ["floorplan", floorCode],
    queryFn: () => fetchFloorplan(floorCode ?? ""),
    enabled: Boolean(floorCode) && canSeeFloor,
  });
  const pois = useQuery({
    queryKey: ["pois", floorCode],
    queryFn: () => fetchPois(floorCode ?? ""),
    enabled: Boolean(floorCode) && canSeeFloor,
  });
  const { start, end, routes } = useRoutes(src, dst);

  const sheet = useMapStore((state) => state.sheet);
  const cycleSheet = useMapStore((state) => state.cycleSheet);
  const searchOpen = useMapStore((state) => state.searchOpen);
  const setSearchOpen = useMapStore((state) => state.setSearchOpen);
  const searchQuery = useMapStore((state) => state.searchQuery);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const navigating = useMapStore((state) => state.navigating);
  const setNavigating = useMapStore((state) => state.setNavigating);
  const instructionIndex = useMapStore((state) => state.instructionIndex);
  const setInstructionIndex = useMapStore((state) => state.setInstructionIndex);
  const selectedRoute = useMapStore((state) => state.selectedRoute);
  const setSelectedRoute = useMapStore((state) => state.setSelectedRoute);
  const userPosition = useMapStore((state) => state.userPosition);
  const signInVisible = useMapStore((state) => state.signInVisible);
  const setSignInVisible = useMapStore((state) => state.setSignInVisible);
  const locationPromptVisible = useMapStore((state) => state.locationPromptVisible);
  const setLocationPromptVisible = useMapStore(
    (state) => state.setLocationPromptVisible,
  );
  const resetNav = useMapStore((state) => state.resetNav);

  useEffect(() => {
    if (routes.data && !routes.data[selectedRoute] && routes.data.Inside) {
      setSelectedRoute("Inside");
    }
  }, [routes.data, selectedRoute, setSelectedRoute]);

  const open = (path: string, nextSrc = src, nextDst = dst) => {
    router.replace(href(path, nextSrc || undefined, nextDst || undefined));
    setSearchOpen(false);
    setSearchQuery("");
  };

  const askSignIn = (path: string) => {
    setReturnPath(path);
    setSignInVisible(true);
    setSearchOpen(false);
  };

  const selectBuilding = (code: string) => open(`/${code}`);
  const selectFloor = (code: string, level: string) => {
    if (!signedIn && !isPublicBuilding(code)) {
      askSignIn(`/${code}-${level}`);
      return;
    }
    open(`/${code}-${level}`);
  };
  const selectRoom = (code: string, roomName: string) => {
    if (!signedIn && !isPublicBuilding(code)) {
      askSignIn(`/${code}-${roomName}`);
      return;
    }
    open(`/${code}-${roomName}`);
  };

  const buildingCode =
    place.kind === "building" || place.kind === "floor" || place.kind === "room"
      ? place.buildingCode
      : floor?.buildingCode;
  const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
  const needsSignIn = Boolean(floor) && !canSeeFloor;
  const navOpen = Boolean(src && dst);
  const sheetOpen =
    searchOpen || navOpen || (place.kind !== "home" && place.kind !== "pending");
  const line = routeLine(routes.data, selectedRoute);
  const currentInstruction = routes.data?.[selectedRoute]?.instructions[instructionIndex];

  const camera = (() => {
    if (place.kind === "coordinate") {
      return {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }
    if (place.kind === "room") {
      const room = rooms.data?.[place.roomName];
      if (room) {
        return {
          latitude: room.labelPosition.latitude,
          longitude: room.labelPosition.longitude,
          latitudeDelta: 0.0015,
          longitudeDelta: 0.0015,
        };
      }
    }
    if (building) {
      return {
        latitude: building.labelLatitude,
        longitude: building.labelLongitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }
    return null;
  })();

  const destinationForPlace = () => {
    if (place.kind === "room") {
      return `${place.buildingCode}-${place.roomName}`;
    }
    if (place.kind === "floor") {
      return `floor:${place.buildingCode}-${place.floor}`;
    }
    if (place.kind === "building") {
      return place.buildingCode;
    }
    if (place.kind === "coordinate") {
      return `${place.latitude},${place.longitude}`;
    }
    return "";
  };

  return (
    <View style={styles.fill}>
      <CampusMap
        buildings={buildings.data}
        rooms={canSeeFloor ? rooms.data : undefined}
        pois={canSeeFloor ? pois.data : undefined}
        line={line}
        selectedBuilding={buildingCode}
        selectedRoom={place.kind === "room" ? place.roomName : undefined}
        userPosition={userPosition}
        camera={camera}
        onSelectBuilding={selectBuilding}
        onSelectRoom={(roomName) => {
          if (buildingCode) {
            selectRoom(buildingCode, roomName);
          }
        }}
        onLongPress={(coordinate: GeoCoordinate) =>
          open(`/${coordinate.latitude},${coordinate.longitude}`)
        }
      />
      {navigating && currentInstruction ? (
        <View style={[styles.banner, { top: insets.top + 8 }]}>
          <Text style={styles.bannerTitle}>
            {currentInstruction.action} · {currentInstruction.distance} ft
          </Text>
          <Text style={styles.bannerSub}>{end.label}</Text>
        </View>
      ) : (
        <View style={[styles.searchWrap, { top: insets.top + 8 }]}>
          <TextInput
            value={searchQuery}
            placeholder="Search CMU Maps"
            placeholderTextColor={theme.muted}
            style={styles.search}
            onFocus={() => setSearchOpen(true)}
            onChangeText={(value) => {
              setSearchQuery(value);
              setSearchOpen(true);
            }}
          />
        </View>
      )}
      {!searchOpen && !navigating && building ? (
        <View style={[styles.floors, { top: insets.top + 72 }]}>
          <FloorSwitcher
            floors={building.floors}
            current={floor?.floor}
            onSelect={(level) => selectFloor(building.code, level)}
          />
        </View>
      ) : null}
      <View style={[styles.gear, { bottom: insets.bottom + (sheetOpen ? 300 : 24) }]}>
        <Pressable style={styles.gearButton} onPress={() => setGearOpen((open) => !open)}>
          <Text style={styles.gearText}>⚙</Text>
        </Pressable>
        <GearMenu
          visible={gearOpen}
          email={user?.email}
          onClose={() => setGearOpen(false)}
          onSignIn={() => {
            setGearOpen(false);
            signIn(href(pathname, src || undefined, dst || undefined)).catch(() => {
              setSignInVisible(true);
            });
          }}
          onSignOut={() => {
            setGearOpen(false);
            signOut().catch(() => undefined);
          }}
        />
      </View>
      <View style={[styles.prompts, { top: insets.top + 72 }]}>
        <PromptCard
          visible={locationPromptVisible && !navOpen}
          title="Turn on location"
          body="Directions from your location need permission to use the device location."
          action="Enable location"
          onAction={() => {
            requestUserLocation().catch(() => undefined);
          }}
          onDismiss={() => setLocationPromptVisible(false)}
        />
        <PromptCard
          visible={signInVisible}
          title="Sign in"
          body="Indoor floors outside CUC need the same CMU sign-in as the website."
          action="Sign in"
          onAction={() => {
            setSignInVisible(false);
            signIn(returnPath).catch(() => setSignInVisible(true));
          }}
          onDismiss={() => setSignInVisible(false)}
        />
      </View>
      <View style={styles.bottom}>
        {searchOpen ? (
          <SearchResults
            query={searchQuery}
            signedIn={signedIn}
            pickingDestination={Boolean(src) && !dst}
            onPick={(value) => open(pathname === "/" ? "/" : pathname, src, value)}
            onSelectBuilding={selectBuilding}
            onSelectFloor={selectFloor}
            onSelectRoom={selectRoom}
            onNeedSignIn={askSignIn}
          />
        ) : null}
        {navOpen && !searchOpen ? (
          <NavPanel
            srcLabel={start.label}
            dstLabel={end.label}
            routes={routes.data}
            selected={selectedRoute}
            navigating={navigating}
            instructionIndex={instructionIndex}
            error={routes.isError ? "No route for that pair." : start.error ?? end.error}
            onSelect={setSelectedRoute}
            onGo={() => setNavigating(true)}
            onEnd={() => {
              resetNav();
              router.replace(href(pathname));
            }}
            onPrev={() => setInstructionIndex(Math.max(0, instructionIndex - 1))}
            onNext={() => {
              const count = routes.data?.[selectedRoute]?.instructions.length ?? 0;
              if (count === 0) {
                return;
              }
              setInstructionIndex(Math.min(count - 1, instructionIndex + 1));
            }}
            onBack={() => {
              resetNav();
              router.replace(href(pathname));
            }}
            onSwap={() => open(pathname, dst, src)}
          />
        ) : !searchOpen ? (
          <PlaceSheet
            place={place}
            title={placeTitle(place, buildings.data, rooms.data)}
            subtitle={building ? `${building.code}` : ""}
            detail={
              place.kind === "room"
                ? `${rooms.data?.[place.roomName]?.type ?? "Room"} in ${building?.name ?? place.buildingCode}`
                : (building?.name ?? "")
            }
            sheet={sheet}
            onCycle={cycleSheet}
            needsSignIn={needsSignIn}
            onSignIn={() => askSignIn(pathname)}
            onDirections={() => {
              const nextDst = destinationForPlace();
              if (!nextDst) {
                return;
              }
              if (!userPosition) {
                setLocationPromptVisible(true);
              }
              resetNav();
              open(pathname, "user", nextDst);
            }}
            onShare={() => {
              Share.share({
                message: shareUrl(place, { src: src || undefined, dst: dst || undefined }),
              }).catch(() => undefined);
            }}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  searchWrap: {
    left: 16,
    position: "absolute",
    right: 16,
  },
  search: {
    backgroundColor: theme.paper,
    borderRadius: 24,
    color: theme.ink,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  banner: {
    backgroundColor: theme.green,
    borderRadius: 16,
    left: 16,
    padding: 16,
    position: "absolute",
    right: 16,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  bannerSub: {
    color: "#dcfce7",
    marginTop: 4,
  },
  floors: {
    position: "absolute",
    right: 12,
  },
  gear: {
    left: 16,
    position: "absolute",
  },
  gearButton: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  gearText: {
    fontSize: 18,
  },
  prompts: {
    left: 16,
    position: "absolute",
  },
  bottom: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
