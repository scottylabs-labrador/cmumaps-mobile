import type { Buildings, GeoCoordinate, GeoRooms } from "@cmumaps/common";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBuildings, useFloorplan, useFloorplans, usePois } from "@/api/client";
import { APP_REVIEW_EMAIL, signIn, signInWithPassword, signOut } from "@/auth/client";
import { CampusMap } from "@/components/CampusMap";
import { FloorSwitcher } from "@/components/FloorSwitcher";
import { AboutPanel } from "@/components/AboutPanel";
import {
  AccountCardModal,
  AccountDial,
  PromptCard,
  ReviewPasswordPrompt,
} from "@/components/GearMenu";
import {
  ChevronLeftIcon,
  CloseIcon,
  PinIcon,
  SearchIcon,
  SwapIcon,
  TargetIcon,
} from "@/components/Icons";
import { NavPanel, StepsSheet, TurnByTurnBanner } from "@/components/NavPanel";
import { PlaceSheet } from "@/components/PlaceSheet";
import { ReportSheet } from "@/components/ReportSheet";
import { SearchResults } from "@/components/SearchResults";
import { routeLine, useRoutes } from "@/hooks/useRoutes";
import { useShakeGesture } from "@/hooks/useShakeGesture";
import { requestUserLocation, useUserLocation } from "@/hooks/useUserLocation";
import { useSignedInUser } from "@/hooks/useWaypoint";
import {
  buildingAt,
  buildingsInView,
  FLOOR_ZOOM_DENSITY,
  regionForCoordinates,
} from "@/lib/geometry";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [navEdit, setNavEdit] = useState<"src" | "dst" | null>(null);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mapFloor, setMapFloor] = useState<{
    buildingCode: string;
    floor: string;
  } | null>(null);
  const [viewRegion, setViewRegion] = useState<Region | null>(null);
  const promptedBuilding = useRef<string | null>(null);

  useUserLocation();
  const { user } = useSignedInUser();
  const signedIn = Boolean(user);
  useShakeGesture(() => {
    setGearOpen(false);
    setAboutOpen(false);
    setReviewPromptOpen(false);
    setReportOpen(true);
  }, !reportOpen && !reviewPromptOpen);
  const buildings = useBuildings();
  const suffix = suffixFromPathname(pathname);
  const place = parsePlace(suffix === "" && floorParam ? floorParam : suffix, buildings.data);
  const floor = focusedFloor(place, buildings.data);
  const activeFloor = floor ?? mapFloor;
  const placeBuildingCode =
    place.kind === "building" || place.kind === "floor" || place.kind === "room"
      ? place.buildingCode
      : undefined;
  const buildingCode = placeBuildingCode ?? activeFloor?.buildingCode ?? floor?.buildingCode;
  const floorCode = activeFloor ? `${activeFloor.buildingCode}-${activeFloor.floor}` : null;
  const canSeeFloor =
    Boolean(activeFloor) && (signedIn || isPublicBuilding(activeFloor?.buildingCode));
  const rooms = useFloorplan(floorCode, canSeeFloor);
  const pois = usePois(floorCode, canSeeFloor);
  const density = viewRegion && Dimensions.get("window").width / viewRegion.longitudeDelta;
  const showInViewFloors = Boolean(density && density >= FLOOR_ZOOM_DENSITY && buildings.data);
  const inViewFloorCodes =
    showInViewFloors && buildings.data && viewRegion
      ? buildingsInView(buildings.data, viewRegion)
          .filter(
            (building) =>
              (signedIn || isPublicBuilding(building.code)) && building.code !== buildingCode,
          )
          .slice(0, 8)
          .map((building) => {
            const level = building.defaultFloor ?? building.floors[0];
            return level ? `${building.code}-${level}` : null;
          })
          .filter((code): code is string => Boolean(code))
      : [];
  const inViewFloorplans = useFloorplans(inViewFloorCodes, showInViewFloors);
  const mergedRooms = (() => {
    const base = canSeeFloor ? rooms.data : undefined;
    if (!showInViewFloors) {
      return base;
    }
    const merged = { ...base };
    for (const result of inViewFloorplans) {
      if (result.data) {
        Object.assign(merged, result.data);
      }
    }
    return Object.keys(merged).length > 0 ? merged : base;
  })();
  const { start, end, routes } = useRoutes(src, dst);

  const sheet = useMapStore((state) => state.sheet);
  const setSheet = useMapStore((state) => state.setSheet);
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
  const locationPromptVisible = useMapStore((state) => state.locationPromptVisible);
  const setLocationPromptVisible = useMapStore((state) => state.setLocationPromptVisible);
  const resetNav = useMapStore((state) => state.resetNav);

  useEffect(() => {
    if (routes.data && !routes.data[selectedRoute] && routes.data.Inside) {
      setSelectedRoute("Inside");
    }
  }, [routes.data, selectedRoute, setSelectedRoute]);

  useEffect(() => {
    setSheet("default");
  }, [pathname, setSheet]);

  useEffect(() => {
    if (!navigating) {
      return;
    }
    const route = routes.data?.[selectedRoute];
    if (!route) {
      return;
    }
    const node =
      instructionIndex === 0
        ? route.path.path[0]
        : route.path.path.find(
            (entry) => entry.id === route.instructions[instructionIndex - 1]?.nodeId,
          );
    const floor = node?.floor;
    if (!floor) {
      return;
    }
    if (!signedIn && !isPublicBuilding(floor.buildingCode)) {
      return;
    }
    setMapFloor((current) =>
      current?.buildingCode === floor.buildingCode && current.floor === floor.level
        ? current
        : { buildingCode: floor.buildingCode, floor: floor.level },
    );
  }, [navigating, instructionIndex, routes.data, selectedRoute, signedIn]);

  const open = (path: string, nextSrc = src, nextDst = dst) => {
    router.replace(href(path, nextSrc || undefined, nextDst || undefined));
    setSearchOpen(false);
    setSearchQuery("");
  };

  const startSignIn = (path: string) => {
    setSearchOpen(false);
    setGearOpen(false);
    void signIn(path);
  };

  const openReviewSignIn = () => {
    setGearOpen(false);
    setReviewError(null);
    setReviewPromptOpen(true);
  };

  const submitReviewSignIn = (password: string) => {
    setReviewBusy(true);
    setReviewError(null);
    void signInWithPassword(APP_REVIEW_EMAIL, password)
      .then(({ error }) => {
        if (error) {
          setReviewError("Sign-in failed. Check the review password.");
          return;
        }
        setReviewPromptOpen(false);
      })
      .catch(() => {
        setReviewError("Sign-in failed. Check the review password.");
      })
      .finally(() => {
        setReviewBusy(false);
      });
  };

  const selectBuilding = (code: string) => open(`/${code}`);
  const selectFloor = (code: string, level: string) => {
    if (!signedIn && !isPublicBuilding(code)) {
      startSignIn(`/${code}-${level}`);
      return;
    }
    open(`/${code}-${level}`);
  };
  const selectRoom = (code: string, roomName: string) => {
    if (!signedIn && !isPublicBuilding(code)) {
      startSignIn(`/${code}-${roomName}`);
      return;
    }
    open(`/${code}-${roomName}`);
  };

  const onRegionChangeComplete = (region: Region) => {
    setViewRegion(region);
    const width = Dimensions.get("window").width;
    const nextDensity = width / region.longitudeDelta;
    if (nextDensity < FLOOR_ZOOM_DENSITY || !buildings.data) {
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
        startSignIn(`/${hit.code}-${level}`);
      }
      return;
    }
    setMapFloor((current) =>
      current?.buildingCode === hit.code && current.floor === level
        ? current
        : { buildingCode: hit.code, floor: level },
    );
  };

  const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
  const needsSignIn = Boolean(floor) && !canSeeFloor;
  const navOpen = Boolean(src || dst);
  const originReady = src !== "user" || Boolean(userPosition);
  const line = originReady ? routeLine(routes.data, selectedRoute) : [];
  const activeRoute = routes.data?.[selectedRoute];
  const instructions = activeRoute?.instructions ?? [];
  const currentInstruction = instructions[instructionIndex];
  const navError = !originReady
    ? "Path unavailable"
    : routes.isError
      ? "Path unavailable"
      : (start.error ?? end.error);
  const progressLines = (() => {
    if (!navigating || !originReady) {
      return null;
    }
    const route = routes.data?.[selectedRoute];
    if (!route) {
      return null;
    }
    const path = route.path.path;
    if (instructionIndex >= route.instructions.length) {
      return {
        completed: path.map((node) => node.coordinate),
        remaining: [],
      };
    }
    const currentNodeId =
      instructionIndex > 0 ? route.instructions[instructionIndex - 1]?.nodeId : path[0]?.id;
    const split = path.findIndex((node) => node.id === currentNodeId);
    if (split < 0) {
      return null;
    }
    const completed = path.slice(0, split + 1).map((node) => node.coordinate);
    const remaining = path.slice(split).map((node) => node.coordinate);
    return { completed, remaining };
  })();

  const cameraIntent = (() => {
    if (navigating) {
      return `nav:${selectedRoute}:${instructionIndex}`;
    }
    if (navOpen && line.length > 1) {
      return `route:${src}:${dst}:${selectedRoute}`;
    }
    if (place.kind === "coordinate") {
      return `coord:${place.latitude},${place.longitude}`;
    }
    if (place.kind === "room") {
      return `room:${place.buildingCode}-${place.roomName}`;
    }
    if (place.kind === "floor") {
      return `floor:${place.buildingCode}-${place.floor}`;
    }
    if (place.kind === "building") {
      return `building:${place.buildingCode}`;
    }
    return "";
  })();

  const camera = (() => {
    if (!cameraIntent) {
      return null;
    }
    if (navigating && currentInstruction) {
      const route = routes.data?.[selectedRoute];
      const node =
        instructionIndex === 0
          ? route?.path.path[0]
          : route?.path.path.find(
              (entry) => entry.id === route.instructions[instructionIndex - 1]?.nodeId,
            );
      if (node?.coordinate) {
        return {
          latitude: node.coordinate.latitude,
          longitude: node.coordinate.longitude,
          latitudeDelta: 0.0008,
          longitudeDelta: 0.0008,
        };
      }
    }
    if (navOpen && line.length > 1) {
      return regionForCoordinates(line);
    }
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
    if (placeBuildingCode && building) {
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

  const searchTop = insets.top + 12;
  const selectedPlaceTitle =
    place.kind !== "home" && place.kind !== "pending"
      ? placeTitle(place, buildings.data, rooms.data)
      : "";
  const showSearchResults = searchOpen && (searchQuery.trim().length > 0 || navEdit !== null);
  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setSearchFocused(false);
    setNavEdit(null);
  };

  return (
    <View style={styles.fill}>
      <CampusMap
        buildings={buildings.data}
        rooms={mergedRooms}
        pois={canSeeFloor ? pois.data : undefined}
        line={line}
        completedLine={progressLines?.completed}
        remainingLine={progressLines?.remaining}
        selectedBuilding={placeBuildingCode}
        selectedRoom={place.kind === "room" ? place.roomName : undefined}
        userPosition={userPosition}
        camera={camera}
        cameraIntent={cameraIntent}
        onSelectBuilding={selectBuilding}
        onSelectRoom={(roomName) => {
          if (placeBuildingCode || buildingCode) {
            selectRoom(placeBuildingCode ?? buildingCode ?? "", roomName);
          }
        }}
        onPressMap={() => {
          setGearOpen(false);
          setAboutOpen(false);
          if (!navigating && place.kind !== "home") {
            setMapFloor(null);
            open("/");
          }
        }}
        onLongPress={(coordinate: GeoCoordinate) =>
          open(`/${coordinate.latitude},${coordinate.longitude}`)
        }
        onRegionChangeComplete={onRegionChangeComplete}
      />
      {navigating && instructions.length > 0 ? (
        <View style={[styles.bannerWrap, { top: searchTop }]}>
          <TurnByTurnBanner
            instructions={instructions}
            index={instructionIndex}
            destinationLabel={end.label || "Destination"}
            buildingLabel={
              end.buildingCode
                ? buildings.data?.[end.buildingCode]?.name
                : (placeBuildingCode ?? buildingCode)
            }
            onPrev={() => setInstructionIndex(Math.max(0, instructionIndex - 1))}
            onNext={() => setInstructionIndex(Math.min(instructions.length, instructionIndex + 1))}
          />
        </View>
      ) : navOpen ? (
        <View style={[styles.searchWrap, { top: searchTop }]}>
          <View style={styles.navHeader}>
            <Pressable
              accessibilityLabel="Back"
              onPress={() => {
                clearSearch();
                resetNav();
                open(pathname);
              }}
              style={styles.navTitleRow}
            >
              <ChevronLeftIcon size={18} color={theme.subtle} />
              <Text style={styles.navTitle}>Navigation</Text>
            </Pressable>
            <View style={styles.navEndpoints}>
              <View style={styles.navEndpointRail}>
                <TargetIcon
                  size={18}
                  color={src === "user" && !userPosition ? theme.subtle : theme.brand}
                />
                <View style={styles.navRailDots}>
                  <View style={styles.navRailDot} />
                  <View style={styles.navRailDot} />
                  <View style={styles.navRailDot} />
                </View>
                <PinIcon size={18} color={theme.danger} />
              </View>
              <View style={styles.navEndpointFields}>
                <View
                  style={[styles.navEndpoint, navEdit === "src" ? styles.navEndpointActive : null]}
                >
                  <TextInput
                    value={navEdit === "src" ? searchQuery : start.label}
                    placeholder="Choose start"
                    placeholderTextColor={theme.subtle}
                    style={[
                      styles.navEndpointInput,
                      navEdit !== "src" && src === "user"
                        ? userPosition
                          ? styles.navEndpointStart
                          : styles.navEndpointUnavailable
                        : null,
                    ]}
                    onFocus={() => {
                      setNavEdit("src");
                      setSearchOpen(true);
                      setSearchQuery("");
                    }}
                    onChangeText={(value) => {
                      setNavEdit("src");
                      setSearchQuery(value);
                      setSearchOpen(true);
                    }}
                  />
                  {src || (navEdit === "src" && searchQuery.length > 0) ? (
                    <Pressable
                      accessibilityLabel="Clear start"
                      onPress={() => {
                        if (navEdit === "src" && searchQuery.length > 0) {
                          setSearchQuery("");
                        } else {
                          open(pathname, "", dst);
                          setNavEdit("src");
                          setSearchOpen(true);
                          setSearchQuery("");
                        }
                      }}
                      hitSlop={8}
                    >
                      <CloseIcon size={16} color={theme.muted} />
                    </Pressable>
                  ) : null}
                </View>
                <View
                  style={[styles.navEndpoint, navEdit === "dst" ? styles.navEndpointActive : null]}
                >
                  <TextInput
                    value={navEdit === "dst" ? searchQuery : end.label}
                    placeholder="Enter destination"
                    placeholderTextColor={theme.subtle}
                    style={styles.navEndpointInput}
                    onFocus={() => {
                      setNavEdit("dst");
                      setSearchOpen(true);
                      setSearchQuery("");
                    }}
                    onChangeText={(value) => {
                      setNavEdit("dst");
                      setSearchQuery(value);
                      setSearchOpen(true);
                    }}
                  />
                  <Pressable
                    accessibilityLabel="Swap start and destination"
                    onPress={() => {
                      clearSearch();
                      open(pathname, dst, src);
                    }}
                    hitSlop={8}
                  >
                    <SwapIcon size={18} color={theme.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.searchWrap, { top: searchTop }]}>
          <View style={styles.searchPill}>
            <View style={styles.searchIconBox}>
              <SearchIcon size={19} color={theme.muted} />
            </View>
            <TextInput
              value={searchFocused || searchQuery.length > 0 ? searchQuery : selectedPlaceTitle}
              placeholder="Search..."
              placeholderTextColor={theme.subtle}
              style={styles.search}
              onFocus={() => {
                setNavEdit(null);
                setSearchOpen(true);
                setSearchFocused(true);
              }}
              onBlur={() => setSearchFocused(false)}
              onChangeText={(value) => {
                setSearchQuery(value);
                setSearchOpen(true);
              }}
            />
            {searchFocused || searchQuery.length > 0 || selectedPlaceTitle ? (
              <Pressable
                accessibilityLabel={
                  selectedPlaceTitle && !searchFocused ? "Clear selection" : "Clear search"
                }
                onPress={() => {
                  if (searchFocused || searchQuery.length > 0) {
                    clearSearch();
                  } else {
                    setMapFloor(null);
                    open("/");
                  }
                }}
                hitSlop={8}
                style={styles.clearButton}
              >
                <CloseIcon size={18} color={theme.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
      {!showSearchResults && building ? (
        <View style={[styles.floors, { top: Math.round(Dimensions.get("window").height * 0.34) }]}>
          <FloorSwitcher
            floors={building.floors}
            current={activeFloor?.floor}
            onSelect={(level) => selectFloor(building.code, level)}
          />
        </View>
      ) : null}
      {gearOpen ? (
        <Pressable
          accessibilityLabel="Close menu"
          style={styles.dialBackdrop}
          onPress={() => setGearOpen(false)}
        />
      ) : null}
      {!showSearchResults &&
      !navOpen &&
      !aboutOpen &&
      (place.kind === "home" || place.kind === "pending") ? (
        <View style={[styles.gear, { bottom: insets.bottom + 24 }]}>
          <AccountDial
            open={gearOpen}
            signedIn={signedIn}
            onToggle={() => setGearOpen((open) => !open)}
            onSignIn={() => {
              setGearOpen(false);
              startSignIn(href(pathname, src || undefined, dst || undefined));
            }}
            onReviewSignIn={() => {
              setGearOpen(false);
              openReviewSignIn();
            }}
            onAccount={() => {
              setGearOpen(false);
              setAccountOpen(true);
            }}
            onAbout={() => {
              setGearOpen(false);
              setAboutOpen(true);
            }}
          />
        </View>
      ) : null}
      <AccountCardModal
        visible={accountOpen}
        name={user?.name}
        email={user?.email}
        onSignOut={() => {
          setAccountOpen(false);
          signOut().catch(() => undefined);
        }}
        onDismiss={() => setAccountOpen(false)}
      />
      <PromptCard
        visible={locationPromptVisible}
        title="Enable your location"
        body="Allow CMU Maps to use your current location to find routes and show where you are on campus."
        action="Allow this time"
        dismissLabel="Don't allow"
        onAction={() => {
          setLocationPromptVisible(false);
          requestUserLocation().catch(() => undefined);
        }}
        onDismiss={() => setLocationPromptVisible(false)}
      />
      <ReviewPasswordPrompt
        visible={reviewPromptOpen}
        error={reviewError}
        busy={reviewBusy}
        onSubmit={submitReviewSignIn}
        onDismiss={() => {
          if (!reviewBusy) {
            setReviewPromptOpen(false);
            setReviewError(null);
          }
        }}
      />
      <StepsSheet
        visible={stepsOpen && navigating}
        route={activeRoute}
        index={instructionIndex}
        destinationLabel={end.label || "Destination"}
        onSelectStep={(stepIdx) => setInstructionIndex(stepIdx)}
        onClose={() => setStepsOpen(false)}
        onEnd={() => {
          setStepsOpen(false);
          resetNav();
          open(pathname);
        }}
      />
      <ReportSheet
        visible={reportOpen}
        context={{
          path: href(pathname, src || undefined, dst || undefined),
          signedIn,
        }}
        onDismiss={() => setReportOpen(false)}
      />
      <View style={styles.bottom}>
        {aboutOpen ? (
          <AboutPanel visible onClose={() => setAboutOpen(false)} />
        ) : navOpen && !showSearchResults ? (
          <NavPanel
            routes={routes.data}
            selected={selectedRoute}
            navigating={navigating}
            error={navError}
            canGo={originReady && Boolean(routes.data?.[selectedRoute])}
            onSelect={setSelectedRoute}
            onGo={() => setNavigating(true)}
            onOpenSteps={() => setStepsOpen(true)}
            onEnd={() => {
              setStepsOpen(false);
              resetNav();
              open(pathname);
            }}
          />
        ) : !showSearchResults ? (
          <PlaceSheet
            place={place}
            title={placeTitle(place, buildings.data, rooms.data)}
            subtitle={
              place.kind === "room"
                ? rooms.data?.[place.roomName]?.alias
                  ? `${place.buildingCode} ${place.roomName}${building ? ` · ${building.name}` : ""}`
                  : (building?.name ?? place.buildingCode)
                : building
                  ? `${building.code}`
                  : ""
            }
            roomType={place.kind === "room" ? rooms.data?.[place.roomName]?.type : undefined}
            detail={
              place.kind === "room"
                ? `${rooms.data?.[place.roomName]?.type ?? "Room"} in ${building?.name ?? place.buildingCode}`
                : (building?.name ?? "")
            }
            sheet={sheet}
            onCycle={cycleSheet}
            onClose={() => {
              setMapFloor(null);
              open("/");
            }}
            needsSignIn={needsSignIn}
            onSignIn={() => startSignIn(pathname)}
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
      </View>
      {showSearchResults ? (
        <View style={styles.searchOverlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={clearSearch} />
          <View
            style={[styles.searchDropdownWrap, { top: navOpen ? searchTop + 158 : searchTop + 56 }]}
          >
            <SearchResults
              query={searchQuery}
              signedIn={signedIn}
              showYourLocation={navEdit !== null}
              pickingDestination={navEdit !== null || (Boolean(src) && !dst)}
              onPick={(value) => {
                if (navEdit === "src") {
                  open(pathname, value, dst);
                } else if (navEdit === "dst") {
                  open(pathname, src, value);
                } else {
                  open(pathname === "/" ? "/" : pathname, src, value);
                }
                clearSearch();
              }}
              onSelectBuilding={(code) => {
                if (navEdit) {
                  const next = navEdit === "src" ? [code, dst] : [src, code];
                  open(pathname, next[0], next[1]);
                  clearSearch();
                  return;
                }
                clearSearch();
                selectBuilding(code);
              }}
              onSelectFloor={(code, level) => {
                if (navEdit) {
                  const point = `floor:${code}-${level}`;
                  const next = navEdit === "src" ? [point, dst] : [src, point];
                  open(pathname, next[0], next[1]);
                  clearSearch();
                  return;
                }
                clearSearch();
                selectFloor(code, level);
              }}
              onSelectRoom={(code, roomName) => {
                if (navEdit) {
                  const point = `${code}-${roomName}`;
                  const next = navEdit === "src" ? [point, dst] : [src, point];
                  open(pathname, next[0], next[1]);
                  clearSearch();
                  return;
                }
                clearSearch();
                selectRoom(code, roomName);
              }}
              onNeedSignIn={startSignIn}
            />
          </View>
        </View>
      ) : null}
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
  searchPill: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 100,
    flexDirection: "row",
    height: 48,
    paddingLeft: 16,
    paddingRight: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIconBox: {
    marginRight: 10,
  },
  dialBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    zIndex: 24,
  },
  gear: {
    left: 20,
    position: "absolute",
    zIndex: 25,
  },
  search: {
    color: theme.ink,
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  bannerWrap: {
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  navHeader: {
    backgroundColor: theme.paper,
    borderRadius: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  navTitleRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  navTitle: {
    color: theme.subtle,
    fontSize: 14,
    fontWeight: "600",
  },
  navEndpoints: {
    flexDirection: "row",
    gap: 10,
  },
  navEndpointRail: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    width: 22,
  },
  navRailDots: {
    alignItems: "center",
    gap: 4,
  },
  navRailDot: {
    backgroundColor: theme.disabled,
    borderRadius: 2,
    height: 3.5,
    width: 3.5,
  },
  navEndpointFields: {
    flex: 1,
    gap: 8,
  },
  navEndpoint: {
    alignItems: "center",
    borderColor: theme.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  navEndpointActive: {
    borderColor: theme.brand,
  },
  navEndpointInput: {
    color: theme.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  navEndpointStart: {
    color: theme.brand,
  },
  navEndpointUnavailable: {
    color: theme.subtle,
  },
  floors: {
    left: -70,
    position: "absolute",
    zIndex: 20,
  },
  bottom: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 18,
  },
  searchDropdownWrap: {
    left: 16,
    position: "absolute",
    right: 16,
  },
});
