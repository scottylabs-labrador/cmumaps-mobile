import type { GeoCoordinate } from "@cmumaps/common";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBuildings, useFloorplan, useFloorplans, usePois } from "@/api/client";
import { signOut } from "@/auth/client";
import { AboutPanel } from "@/components/AboutPanel";
import { AccountCardModal, AccountDial } from "@/components/AccountControls";
import { CampusMap } from "@/components/CampusMap";
import { FloorSwitcher } from "@/components/FloorSwitcher";
import { CloseIcon, SearchIcon } from "@/components/Icons";
import { LocationPrompt } from "@/components/LocationPrompt";
import { NavHeader, NavPanel, StepsSheet, TurnByTurnBanner } from "@/components/NavigationChrome";
import { PlaceSheet } from "@/components/PlaceSheet";
import { ReportSheet } from "@/components/ReportSheet";
import { SearchResults } from "@/components/SearchResults";
import { env } from "@/env";
import { useRoutes } from "@/hooks/useRoutes";
import { useShakeGesture } from "@/hooks/useShakeGesture";
import { requestUserLocation, useUserLocation } from "@/hooks/useUserLocation";
import { useSignedInUser } from "@/hooks/useWaypoint";
import {
  type FloorRef,
  formatFloorCode,
  parseCampusTarget,
  targetBuildingCode,
  targetDetail,
  targetFocusedFloor,
  targetHref,
  targetPath,
  targetShareUrl,
  targetSubtitle,
  targetTitle,
  targetWaypointToken,
} from "@/lib/campusTarget";
import {
  deriveCamera,
  deriveChromeVisibility,
  mapFloorAfterClosingPlaceSheet,
  resolveNavigationStep,
  resolveViewportFloor,
  visibleAdjacentFloorCodes,
  visibleRoomLabels,
} from "@/lib/mapSession";
import { useMapStore } from "@/store";
import { theme } from "@/theme";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ src?: string; dst?: string; floor?: string }>();
  const src = one(params.src) ?? "";
  const dst = one(params.dst) ?? "";
  const floorParam = one(params.floor) ?? "";

  const [navEdit, setNavEdit] = useState<"src" | "dst" | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mapFloor, setMapFloor] = useState<FloorRef | null>(null);
  const [viewRegion, setViewRegion] = useState<Region | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const sheet = useMapStore((state) => state.sheet);
  const setSheet = useMapStore((state) => state.setSheet);
  const cycleSheet = useMapStore((state) => state.cycleSheet);
  const activeModal = useMapStore((state) => state.activeModal);
  const openModal = useMapStore((state) => state.openModal);
  const closeModal = useMapStore((state) => state.closeModal);
  const toggleDial = useMapStore((state) => state.toggleDial);
  const searchOpen = useMapStore((state) => state.searchOpen);
  const setSearchOpen = useMapStore((state) => state.setSearchOpen);
  const searchQuery = useMapStore((state) => state.searchQuery);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const navigating = useMapStore((state) => state.navigating);
  const startNavigation = useMapStore((state) => state.startNavigation);
  const stepNavigation = useMapStore((state) => state.stepNavigation);
  const jumpToStep = useMapStore((state) => state.jumpToStep);
  const instructionIndex = useMapStore((state) => state.instructionIndex);
  const selectedRoute = useMapStore((state) => state.selectedRoute);
  const setSelectedRoute = useMapStore((state) => state.setSelectedRoute);
  const userPosition = useMapStore((state) => state.userPosition);
  const locationPromptVisible = useMapStore((state) => state.locationPromptVisible);
  const setLocationPromptVisible = useMapStore((state) => state.setLocationPromptVisible);
  const resetNav = useMapStore((state) => state.resetNav);

  useUserLocation();
  const { user } = useSignedInUser();
  useShakeGesture(() => openModal("report"), activeModal !== "report");

  const buildings = useBuildings();
  const target = parseCampusTarget(pathname, buildings.data, floorParam);
  const floor = targetFocusedFloor(target, buildings.data);
  const activeFloor = floor ?? mapFloor;
  const targetBuilding = targetBuildingCode(target);
  const buildingCode = targetBuilding ?? activeFloor?.buildingCode ?? floor?.buildingCode;
  const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
  const floorCode = activeFloor ? formatFloorCode(activeFloor) : null;
  const rooms = useFloorplan(floorCode);
  const pois = usePois(floorCode);

  const screenWidth = Dimensions.get("window").width;
  const inViewFloorCodes = visibleAdjacentFloorCodes(
    buildings.data,
    viewRegion,
    screenWidth,
    buildingCode,
  );
  const inViewFloorplans = useFloorplans(inViewFloorCodes, inViewFloorCodes.length > 0);
  const mergedRooms = (() => {
    const base = rooms.data;
    if (inViewFloorCodes.length === 0) {
      return base;
    }
    const merged: Record<string, NonNullable<typeof base>[string]> = {};
    if (base) {
      for (const [roomName, room] of Object.entries(base)) {
        merged[`${room.floor.buildingCode}:${roomName}`] = room;
      }
    }
    for (const result of inViewFloorplans) {
      if (result.data) {
        for (const [roomName, room] of Object.entries(result.data)) {
          merged[`${room.floor.buildingCode}:${roomName}`] = room;
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : base;
  })();
  const roomLabels = visibleRoomLabels(mergedRooms, viewRegion, screenWidth);

  const { start, end, plan } = useRoutes(src, dst, selectedRoute);
  const navOpen = Boolean(src || dst);
  const step = resolveNavigationStep(plan.activeRoute, instructionIndex, navigating);
  const camera = deriveCamera({
    target,
    buildings: buildings.data,
    rooms: rooms.data,
    navOpen,
    navigating,
    plan,
    step,
    instructionIndex,
    src,
    dst,
    focusKey,
  });

  useEffect(() => {
    setSheet("default");
  }, [pathname, setSheet]);

  useEffect(() => {
    if (!step.stepFloor) {
      return;
    }
    const nextFloor = step.stepFloor;
    setMapFloor((current) =>
      current?.buildingCode === nextFloor.buildingCode && current.floor === nextFloor.floor
        ? current
        : nextFloor,
    );
  }, [step.stepFloor]);

  const open = useCallback(
    (path: string, nextSrc = src, nextDst = dst) => {
      router.replace(targetHref(path, nextSrc || undefined, nextDst || undefined));
      setSearchOpen(false);
      setSearchQuery("");
    },
    [dst, setSearchOpen, setSearchQuery, src],
  );

  const selectBuilding = (code: string) => {
    setFocusKey((key) => key + 1);
    open(`/${code}`);
  };
  const selectFloor = (code: string, level: string) => {
    setFocusKey((key) => key + 1);
    open(`/${code}-${level}`);
  };
  const selectRoom = (code: string, roomName: string) => {
    setFocusKey((key) => key + 1);
    open(`/${code}-${roomName}`);
  };

  const onRegionChangeComplete = (region: Region) => {
    setViewRegion(region);
    const resolved = resolveViewportFloor(buildings.data, region, screenWidth);
    if (resolved.kind === "none") {
      setMapFloor((current) => (current ? null : current));
      return;
    }
    setMapFloor((current) =>
      current?.buildingCode === resolved.floor.buildingCode &&
      current.floor === resolved.floor.floor
        ? current
        : resolved.floor,
    );
  };

  const searchTop = insets.top + 12;
  const selectedTargetTitle =
    target.kind !== "home" && target.kind !== "pending"
      ? targetTitle(target, buildings.data, rooms.data)
      : "";
  const showSearchResults = searchOpen && (searchQuery.trim().length > 0 || navEdit !== null);
  const chrome = deriveChromeVisibility({
    target,
    navOpen,
    showSearchResults,
    activeModal,
    hasBuilding: Boolean(building),
  });

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
    setSearchFocused(false);
    setNavEdit(null);
    Keyboard.dismiss();
  }, [setSearchOpen, setSearchQuery]);

  const exitNavigation = useCallback(() => {
    clearSearch();
    resetNav();
    open(pathname, "", "");
  }, [clearSearch, open, pathname, resetNav]);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showSearchResults) {
        clearSearch();
        return true;
      }
      exitNavigation();
      return true;
    });
    return () => subscription.remove();
  }, [clearSearch, exitNavigation, navOpen, showSearchResults]);

  return (
    <View style={styles.fill}>
      <CampusMap
        buildings={buildings.data}
        rooms={mergedRooms}
        roomLabels={roomLabels}
        pois={pois.data}
        line={plan.line}
        completedLine={step.progressLines?.completed}
        remainingLine={step.progressLines?.remaining}
        selectedBuilding={buildingCode}
        selectedRoom={target.kind === "room" ? target.roomName : undefined}
        userPosition={userPosition}
        camera={camera.region}
        cameraIntent={camera.intent}
        onSelectBuilding={selectBuilding}
        onSelectRoom={(roomBuildingCode, roomName) => {
          const code = roomBuildingCode || targetBuilding || buildingCode;
          if (code) {
            selectRoom(code, roomName);
          }
        }}
        onPressMap={() => {
          closeModal();
          clearSearch();
          if (!navigating && target.kind !== "home") {
            setMapFloor((current) => mapFloorAfterClosingPlaceSheet(activeFloor, current));
            open("/");
          }
        }}
        onLongPress={(coordinate: GeoCoordinate) =>
          open(`/${coordinate.latitude},${coordinate.longitude}`)
        }
        onRegionChangeComplete={onRegionChangeComplete}
      />

      {navigating && step.instructions.length > 0 ? (
        <View style={[styles.topOverlay, { top: searchTop }]}>
          <TurnByTurnBanner
            instructions={step.instructions}
            index={instructionIndex}
            destinationLabel={end.label || "Destination"}
            buildingLabel={
              end.buildingCode
                ? buildings.data?.[end.buildingCode]?.name
                : (targetBuilding ?? buildingCode)
            }
            onPrev={() => stepNavigation(-1, step.instructions.length)}
            onNext={() => stepNavigation(1, step.instructions.length)}
          />
        </View>
      ) : navOpen ? (
        <View style={[styles.topOverlay, { top: searchTop }]}>
          <NavHeader
            src={src}
            startLabel={start.label}
            endLabel={end.label}
            userLocationAvailable={Boolean(userPosition)}
            editingField={navEdit}
            searchQuery={searchQuery}
            onBack={exitNavigation}
            onFocusField={(field) => {
              setNavEdit(field);
              setSearchOpen(true);
              setSearchQuery("");
            }}
            onChangeQuery={(field, value) => {
              setNavEdit(field);
              setSearchQuery(value);
              setSearchOpen(true);
            }}
            onClearStart={() => {
              if (navEdit === "src" && searchQuery.length > 0) {
                setSearchQuery("");
              } else {
                open(pathname, "", dst);
                setNavEdit("src");
                setSearchOpen(true);
                setSearchQuery("");
              }
            }}
            onSwap={() => {
              clearSearch();
              open(pathname, dst, src);
            }}
          />
        </View>
      ) : (
        <View style={[styles.topOverlay, { top: searchTop }]}>
          <View style={styles.searchPill}>
            <View style={styles.searchIconBox}>
              <SearchIcon size={19} color={theme.muted} />
            </View>
            <TextInput
              value={searchFocused || searchQuery.length > 0 ? searchQuery : selectedTargetTitle}
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
            {searchFocused || searchQuery.length > 0 || selectedTargetTitle ? (
              <Pressable
                accessibilityLabel={
                  selectedTargetTitle && !searchFocused ? "Clear selection" : "Clear search"
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

      {chrome.showFloorSwitcher && building ? (
        <View style={[styles.floors, { top: Math.round(Dimensions.get("window").height * 0.34) }]}>
          <FloorSwitcher
            floors={building.floors}
            current={activeFloor?.floor}
            onSelect={(level) => selectFloor(building.code, level)}
          />
        </View>
      ) : null}

      {chrome.showDialBackdrop ? (
        <Pressable
          accessibilityLabel="Close menu"
          style={styles.dialBackdrop}
          onPress={closeModal}
        />
      ) : null}

      {chrome.showAccountDial ? (
        <View style={[styles.dialWrap, { bottom: insets.bottom + 24 }]}>
          <AccountDial
            open={activeModal === "dial"}
            onToggle={toggleDial}
            onAccount={() => openModal("account")}
            onAbout={() => openModal("about")}
          />
        </View>
      ) : null}

      <AccountCardModal
        visible={activeModal === "account"}
        name={user?.name}
        email={user?.email}
        onSignOut={() => {
          closeModal();
          signOut().catch(() => undefined);
        }}
        onDismiss={closeModal}
      />

      <LocationPrompt
        visible={locationPromptVisible}
        onAllow={() => {
          setLocationPromptVisible(false);
          requestUserLocation().catch(() => undefined);
        }}
        onDismiss={() => setLocationPromptVisible(false)}
      />

      <StepsSheet
        visible={activeModal === "steps" && navigating}
        plan={plan}
        summary={step.summary}
        index={instructionIndex}
        destinationLabel={end.label || "Destination"}
        onSelectStep={(stepIdx) => jumpToStep(stepIdx, step.instructions.length)}
        onClose={closeModal}
        onEnd={exitNavigation}
      />

      <ReportSheet
        visible={activeModal === "report"}
        context={{
          path: targetHref(pathname, src || undefined, dst || undefined),
        }}
        onDismiss={closeModal}
      />

      <View style={styles.bottom}>
        {chrome.bottomPanel === "about" ? (
          <AboutPanel visible onClose={closeModal} />
        ) : chrome.bottomPanel === "nav" ? (
          <NavPanel
            plan={plan}
            summary={step.summary}
            navigating={navigating}
            onSelect={setSelectedRoute}
            onGo={startNavigation}
            onOpenSteps={() => openModal("steps")}
            onEnd={exitNavigation}
          />
        ) : chrome.bottomPanel === "place" ? (
          <PlaceSheet
            target={target}
            title={targetTitle(target, buildings.data, rooms.data)}
            subtitle={targetSubtitle(target, buildings.data, rooms.data)}
            roomType={target.kind === "room" ? rooms.data?.[target.roomName]?.type : undefined}
            detail={targetDetail(target, buildings.data, rooms.data)}
            sheet={sheet}
            onCycle={cycleSheet}
            onClose={() => {
              setMapFloor((current) => mapFloorAfterClosingPlaceSheet(activeFloor, current));
              open("/");
            }}
            onDirections={() => {
              const nextDst = targetWaypointToken(target);
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
                message: targetShareUrl(
                  target,
                  { src: src || undefined, dst: dst || undefined },
                  env.webOrigin,
                ),
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
              showYourLocation={navEdit !== null}
              pickingWaypoint={navEdit !== null || (Boolean(src) && !dst)}
              onPickWaypoint={(value) => {
                if (navEdit === "src") {
                  open(pathname, value, dst);
                } else if (navEdit === "dst") {
                  open(pathname, src, value);
                } else {
                  open(pathname === "/" ? "/" : pathname, src, value);
                }
                clearSearch();
              }}
              onSelectTarget={(nextTarget) => {
                clearSearch();
                setFocusKey((key) => key + 1);
                open(targetPath(nextTarget));
              }}
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
  topOverlay: {
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
  dialWrap: {
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
  floors: {
    left: -100,
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
