import { create } from "zustand";

export type SheetState = "collapsed" | "default" | "expanded";
export type RouteKind = "Fastest" | "Inside";

interface Position {
  latitude: number;
  longitude: number;
}

interface MapState {
  sheet: SheetState;
  searchOpen: boolean;
  searchQuery: string;
  navigating: boolean;
  instructionIndex: number;
  selectedRoute: RouteKind;
  userPosition: Position | null;
  signInVisible: boolean;
  locationPromptVisible: boolean;
  setSheet: (sheet: SheetState) => void;
  cycleSheet: () => void;
  setSearchOpen: (searchOpen: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  setNavigating: (navigating: boolean) => void;
  setInstructionIndex: (instructionIndex: number) => void;
  setSelectedRoute: (selectedRoute: RouteKind) => void;
  setUserPosition: (userPosition: Position | null) => void;
  setSignInVisible: (signInVisible: boolean) => void;
  setLocationPromptVisible: (locationPromptVisible: boolean) => void;
  resetNav: () => void;
}

const nextSheet: Record<SheetState, SheetState> = {
  collapsed: "default",
  default: "expanded",
  expanded: "collapsed",
};

export const useMapStore = create<MapState>((set) => ({
  sheet: "default",
  searchOpen: false,
  searchQuery: "",
  navigating: false,
  instructionIndex: 0,
  selectedRoute: "Fastest",
  userPosition: null,
  signInVisible: false,
  locationPromptVisible: false,
  setSheet: (sheet) => set({ sheet }),
  cycleSheet: () => set((state) => ({ sheet: nextSheet[state.sheet] })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setNavigating: (navigating) => set({ navigating, instructionIndex: navigating ? 0 : 0 }),
  setInstructionIndex: (instructionIndex) => set({ instructionIndex }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setUserPosition: (userPosition) => set({ userPosition }),
  setSignInVisible: (signInVisible) => set({ signInVisible }),
  setLocationPromptVisible: (locationPromptVisible) => set({ locationPromptVisible }),
  resetNav: () => set({ navigating: false, instructionIndex: 0 }),
}));
