import type { Buildings, GeoCoordinate, GeoRooms } from "@cmumaps/common";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBuildings, useFloorplan, usePois } from "@/api/client";
import { signIn, signOut } from "@/auth/client";
import { CampusMap } from "@/components/CampusMap";
import { FloorSwitcher } from "@/components/FloorSwitcher";
import { AboutPanel } from "@/components/AboutPanel";
import { AccountDial, PromptCard } from "@/components/GearMenu";
import { NavPanel } from "@/components/NavPanel";
import { PlaceSheet } from "@/components/PlaceSheet";
import { SearchResults } from "@/components/SearchResults";
import { routeLine, useRoutes } from "@/hooks/useRoutes";
import { requestUserLocation, useUserLocation } from "@/hooks/useUserLocation";
import { useSignedInUser } from "@/hooks/useWaypoint";
import { buildingAt, FLOOR_ZOOM_DENSITY } from "@/lib/geometry";
import { focusedFloor, type Place, parsePlace, suffixFromPathname } from "@/lib/place";
import { isPublicBuilding } from "@/lib/publicBuilding";
import { shareUrl } from "@/lib/shareUrl";
import { useMapStore } from "@/store";
import { theme } from "@/theme";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

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

const placeTitle = (
  place: Place,
  buildings: Buildings | undefined,
  rooms: GeoRooms | undefined,
) => {
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [returnPath, setReturnPath] = useState("/");
  const [mapFloor, setMapFloor] = useState<{
    buildingCode: string;
    floor: string;
  } | null>(null);
  const promptedBuilding = useRef<string | null>(null);

  useUserLocation();
  const { user } = useSignedInUser();
  const signedIn = Boolean(user);
  const buildings = useBuildings();
  const suffix = suffixFromPathname(pathname);
  const place = parsePlace(suffix === "" && floorParam ? floorParam : suffix, buildings.data);
  const floor = focusedFloor(place, buildings.data);
  const activeFloor = floor ?? mapFloor;
  const floorCode = activeFloor ? `${activeFloor.buildingCode}-${activeFloor.floor}` : null;
  const canSeeFloor =
    Boolean(activeFloor) && (signedIn || isPublicBuilding(activeFloor?.buildingCode));
  const rooms = useFloorplan(floorCode, canSeeFloor);
  const pois = usePois(floorCode, canSeeFloor);
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
  const setLocationPromptVisible = useMapStore((state) => state.setLocationPromptVisible);
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

  const onRegionChangeComplete = (region: Region) => {
    const width = Dimensions.get("window").width;
    const density = width / region.longitudeDelta;
    if (density < FLOOR_ZOOM_DENSITY || !buildings.data) {
      setMapFloor((current) => (current ? null : current));
      return;
    }
    const hit = buildingAt(buildings.data, {
      latitude: region.latitude,
      longitude: region.longitude,
    });
    const level = hit?.defaultFloor ?? hit?.floors[0];
    if (!hit || !level) {
      setMapFloor((current) => (current ? null : current));
      return;
    }
    if (!signedIn && !isPublicBuilding(hit.code)) {
      setMapFloor((current) => (current ? null : current));
      if (promptedBuilding.current !== hit.code) {
        promptedBuilding.current = hit.code;
        askSignIn(`/${hit.code}-${level}`);
      }
      return;
    }
    setMapFloor((current) =>
      current?.buildingCode === hit.code && current.floor === level
        ? current
        : { buildingCode: hit.code, floor: level },
    );
  };

  const buildingCode =
    place.kind === "building" || place.kind === "floor" || place.kind === "room"
      ? place.buildingCode
      : (activeFloor?.buildingCode ?? floor?.buildingCode);
  const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
  const needsSignIn = Boolean(floor) && !canSeeFloor;
  const navOpen = Boolean(src && dst);
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

  const mapReady = place.kind !== "pending";
  const searchTop = insets.top + 16;
  const showSearchResults = searchOpen && searchQuery.trim().length > 0;
  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  return (
    <View style={styles.fill}>
      {mapReady ? (
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
          onPressMap={() => {
            setGearOpen(false);
            setAboutOpen(false);
            if (!navigating && place.kind !== "home") {
              open("/");
            }
          }}
          onLongPress={(coordinate: GeoCoordinate) =>
            open(`/${coordinate.latitude},${coordinate.longitude}`)
          }
          onRegionChangeComplete={onRegionChangeComplete}
        />
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
      {navigating && currentInstruction ? (
        <View style={[styles.banner, { top: searchTop }]}>
          <Text style={styles.bannerTitle}>
            {currentInstruction.action} · {currentInstruction.distance} ft
          </Text>
          <Text style={styles.bannerSub}>{end.label}</Text>
        </View>
      ) : (
        <View style={[styles.searchWrap, { top: searchTop }]}>
          <View style={styles.searchRow}>
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
            {searchOpen || searchQuery.length > 0 ? (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>✕</Text>
              </Pressable>
            ) : null}
            <AccountDial
              open={gearOpen}
              signedIn={signedIn}
              onToggle={() => setGearOpen((open) => !open)}
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
              onAbout={() => {
                setGearOpen(false);
                setAboutOpen(true);
              }}
            />
          </View>
        </View>
      )}
      {!searchOpen && !navigating && building ? (
        <View style={[styles.floors, { top: searchTop + 64 }]}>
          <FloorSwitcher
            floors={building.floors}
            current={activeFloor?.floor}
            onSelect={(level) => selectFloor(building.code, level)}
          />
        </View>
      ) : null}
      <View style={[styles.prompts, { top: searchTop + 64 }]}>
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
        {aboutOpen ? (
          <AboutPanel visible onClose={() => setAboutOpen(false)} />
        ) : navOpen && !showSearchResults ? (
          <NavPanel
            srcLabel={start.label}
            dstLabel={end.label}
            routes={routes.data}
            selected={selectedRoute}
            navigating={navigating}
            instructionIndex={instructionIndex}
            error={routes.isError ? "No route for that pair." : (start.error ?? end.error)}
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
        ) : !showSearchResults ? (
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
                message: shareUrl(place, {
                  src: src || undefined,
                  dst: dst || undefined,
                }),
              }).catch(() => undefined);
            }}
          />
        ) : null}
        {showSearchResults ? (
          <View style={styles.searchOverlay}>
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
          </View>
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
    zIndex: 20,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  search: {
    backgroundColor: theme.paper,
    borderRadius: 24,
    color: theme.ink,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  clearText: {
    color: theme.muted,
    fontSize: 16,
    fontWeight: "700",
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
  searchOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
