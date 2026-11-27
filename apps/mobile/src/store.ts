import { create } from "zustand";
import { type ActiveModal, clampInstructionIndex } from "@/lib/mapSession";
import type { RouteKind } from "@/lib/routePlan";

export type { ActiveModal } from "@/lib/mapSession";
export type { RouteKind } from "@/lib/routePlan";
export type SheetState = "collapsed" | "default" | "expanded";

interface Position {
  latitude: number;
  longitude: number;
}

interface MapState {
  sheet: SheetState;
  activeModal: ActiveModal;
  searchOpen: boolean;
  searchQuery: string;
  navigating: boolean;
  instructionIndex: number;
  selectedRoute: RouteKind;
  userPosition: Position | null;
  locationPromptVisible: boolean;
  setSheet: (sheet: SheetState) => void;
  cycleSheet: () => void;
  openModal: (modal: ActiveModal) => void;
  closeModal: () => void;
  toggleDial: () => void;
  setSearchOpen: (searchOpen: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  startNavigation: () => void;
  stepNavigation: (delta: number, instructionCount: number) => void;
  jumpToStep: (index: number, instructionCount: number) => void;
  setSelectedRoute: (selectedRoute: RouteKind) => void;
  setUserPosition: (userPosition: Position | null) => void;
  setLocationPromptVisible: (locationPromptVisible: boolean) => void;
  resetNav: () => void;
  resetSession: () => void;
}

const nextSheet: Record<SheetState, SheetState> = {
  collapsed: "default",
  default: "expanded",
  expanded: "collapsed",
};

export const useMapStore = create<MapState>((set) => ({
  sheet: "default",
  activeModal: "none",
  searchOpen: false,
  searchQuery: "",
  navigating: false,
  instructionIndex: 0,
  selectedRoute: "Fastest",
  userPosition: null,
  locationPromptVisible: false,
  setSheet: (sheet) => set({ sheet }),
  cycleSheet: () => set((state) => ({ sheet: nextSheet[state.sheet] })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: "none" }),
  toggleDial: () =>
    set((state) => ({ activeModal: state.activeModal === "dial" ? "none" : "dial" })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  startNavigation: () => set({ navigating: true, instructionIndex: 0, activeModal: "none" }),
  stepNavigation: (delta, instructionCount) =>
    set((state) => ({
      instructionIndex: clampInstructionIndex(state.instructionIndex + delta, instructionCount),
    })),
  jumpToStep: (index, instructionCount) =>
    set({ instructionIndex: clampInstructionIndex(index, instructionCount) }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setUserPosition: (userPosition) => set({ userPosition }),
  setLocationPromptVisible: (locationPromptVisible) => set({ locationPromptVisible }),
  resetNav: () => set({ navigating: false, instructionIndex: 0, activeModal: "none" }),
  resetSession: () =>
    set({
      sheet: "default",
      activeModal: "none",
      searchOpen: false,
      searchQuery: "",
      navigating: false,
      instructionIndex: 0,
      selectedRoute: "Fastest",
      userPosition: null,
      locationPromptVisible: false,
    }),
}));
