import type { GeoCoordinate } from "@cmumaps/common";
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
import { useRoutes } from "@/hooks/useRoutes";
import { useShakeGesture } from "@/hooks/useShakeGesture";
import { requestUserLocation, useUserLocation } from "@/hooks/useUserLocation";
import { useSignedInUser } from "@/hooks/useWaypoint";
import { env } from "@/env";
import {
  canViewFloor,
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
  buildingAt,
  buildingsInView,
  FLOOR_ZOOM_DENSITY,
  regionForCoordinates,
} from "@/lib/geometry";
import { useMapStore } from "@/store";
import { theme } from "@/theme";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

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
  const target = parseCampusTarget(pathname, buildings.data, floorParam);
  const floor = targetFocusedFloor(target, buildings.data);
  const activeFloor = floor ?? mapFloor;
  const targetBuilding = targetBuildingCode(target);
  const buildingCode = targetBuilding ?? activeFloor?.buildingCode ?? floor?.buildingCode;
  const floorCode = activeFloor ? formatFloorCode(activeFloor) : null;
  const canSeeFloor = Boolean(activeFloor) && canViewFloor(activeFloor?.buildingCode, signedIn);
  const rooms = useFloorplan(floorCode, canSeeFloor);
  const pois = usePois(floorCode, canSeeFloor);
  const density = viewRegion && Dimensions.get("window").width / viewRegion.longitudeDelta;
  const showInViewFloors = Boolean(density && density >= FLOOR_ZOOM_DENSITY && buildings.data);
  const inViewFloorCodes =
    showInViewFloors && buildings.data && viewRegion
      ? buildingsInView(buildings.data, viewRegion)
          .filter(
            (building) => canViewFloor(building.code, signedIn) && building.code !== buildingCode,
          )
          .slice(0, 8)
          .map((building) => {
            const level = building.defaultFloor ?? building.floors[0];
            return level ? formatFloorCode({ buildingCode: building.code, floor: level }) : null;
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
  const { start, end, plan } = useRoutes(src, dst, selectedRoute);

  useEffect(() => {
    setSheet("default");
  }, [pathname, setSheet]);

  useEffect(() => {
    if (!navigating) {
      return;
    }
    const route = plan.activeRoute;
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
    if (!canViewFloor(floor.buildingCode, signedIn)) {
      return;
    }
    setMapFloor((current) =>
      current?.buildingCode === floor.buildingCode && current.floor === floor.level
        ? current
        : { buildingCode: floor.buildingCode, floor: floor.level },
    );
  }, [navigating, instructionIndex, plan.activeRoute, signedIn]);

  const open = (path: string, nextSrc = src, nextDst = dst) => {
    router.replace(targetHref(path, nextSrc || undefined, nextDst || undefined));
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
    if (!canViewFloor(code, signedIn)) {
      startSignIn(`/${code}-${level}`);
      return;
    }
    open(`/${code}-${level}`);
  };
  const selectRoom = (code: string, roomName: string) => {
    if (!canViewFloor(code, signedIn)) {
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
    if (!canViewFloor(hit.code, signedIn)) {
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
  const line = plan.line;
  const activeRoute = plan.activeRoute;
  const instructions = activeRoute?.instructions ?? [];
  const currentInstruction = instructions[instructionIndex];
  const progressLines = (() => {
    if (!navigating || !activeRoute) {
      return null;
    }
    const path = activeRoute.path.path;
    if (instructionIndex >= activeRoute.instructions.length) {
      return {
        completed: path.map((node) => node.coordinate),
        remaining: [],
      };
    }
    const currentNodeId =
      instructionIndex > 0 ? activeRoute.instructions[instructionIndex - 1]?.nodeId : path[0]?.id;
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
      return `nav:${plan.selectedKind}:${instructionIndex}`;
    }
    if (navOpen && line.length > 1) {
      return `route:${src}:${dst}:${plan.selectedKind}`;
    }
    if (target.kind === "coordinate") {
      return `coord:${target.latitude},${target.longitude}`;
    }
    if (target.kind === "room") {
      return `room:${target.buildingCode}-${target.roomName}`;
    }
    if (target.kind === "floor") {
      return `floor:${target.buildingCode}-${target.floor}`;
    }
    if (target.kind === "building") {
      return `building:${target.buildingCode}`;
    }
    return "";
  })();

  const camera = (() => {
    if (!cameraIntent) {
      return null;
    }
    if (navigating && currentInstruction && activeRoute) {
      const node =
        instructionIndex === 0
          ? activeRoute.path.path[0]
          : activeRoute.path.path.find(
              (entry) => entry.id === activeRoute.instructions[instructionIndex - 1]?.nodeId,
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
    if (target.kind === "coordinate") {
      return {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }
    if (target.kind === "room") {
      const room = rooms.data?.[target.roomName];
      if (room) {
        return {
          latitude: room.labelPosition.latitude,
          longitude: room.labelPosition.longitude,
          latitudeDelta: 0.0015,
          longitudeDelta: 0.0015,
        };
      }
    }
    if (targetBuilding && building) {
      return {
        latitude: building.labelLatitude,
        longitude: building.labelLongitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }
    return null;
  })();

  const searchTop = insets.top + 12;
  const selectedPlaceTitle =
    target.kind !== "home" && target.kind !== "pending"
      ? targetTitle(target, buildings.data, rooms.data)
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
        selectedBuilding={targetBuilding}
        selectedRoom={target.kind === "room" ? target.roomName : undefined}
        userPosition={userPosition}
        camera={camera}
        cameraIntent={cameraIntent}
        onSelectBuilding={selectBuilding}
        onSelectRoom={(roomName) => {
          if (targetBuilding || buildingCode) {
            selectRoom(targetBuilding ?? buildingCode ?? "", roomName);
          }
        }}
        onPressMap={() => {
          setGearOpen(false);
          setAboutOpen(false);
          if (!navigating && target.kind !== "home") {
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
                : (targetBuilding ?? buildingCode)
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
      (target.kind === "home" || target.kind === "pending") ? (
        <View style={[styles.gear, { bottom: insets.bottom + 24 }]}>
          <AccountDial
            open={gearOpen}
            signedIn={signedIn}
            onToggle={() => setGearOpen((open) => !open)}
            onSignIn={() => {
              setGearOpen(false);
              startSignIn(targetHref(pathname, src || undefined, dst || undefined));
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
        plan={plan}
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
          path: targetHref(pathname, src || undefined, dst || undefined),
          signedIn,
        }}
        onDismiss={() => setReportOpen(false)}
      />
      <View style={styles.bottom}>
        {aboutOpen ? (
          <AboutPanel visible onClose={() => setAboutOpen(false)} />
        ) : navOpen && !showSearchResults ? (
          <NavPanel
            plan={plan}
            navigating={navigating}
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
            target={target}
            title={targetTitle(target, buildings.data, rooms.data)}
            subtitle={targetSubtitle(target, buildings.data, rooms.data)}
            roomType={target.kind === "room" ? rooms.data?.[target.roomName]?.type : undefined}
            detail={targetDetail(target, buildings.data, rooms.data)}
            sheet={sheet}
            onCycle={cycleSheet}
            onClose={() => {
              setMapFloor(null);
              open("/");
            }}
            needsSignIn={needsSignIn}
            onSignIn={() => startSignIn(pathname)}
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
                  {
                    src: src || undefined,
                    dst: dst || undefined,
                  },
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
              signedIn={signedIn}
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
                open(targetPath(nextTarget));
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
