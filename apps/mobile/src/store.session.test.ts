import { afterEach, expect, test, vi } from "vite-plus/test";

// The store only needs this pure clamp from mapSession; avoid native map imports.
vi.mock("@/lib/mapSession", () => ({
  clampInstructionIndex: (index: number, count: number) => Math.max(0, Math.min(index, count)),
}));
import { useMapStore } from "./store";

afterEach(() => useMapStore.getState().resetSession());

test("session reset clears private search, route, position, and open UI while preserving actions", () => {
  const initial = useMapStore.getInitialState();
  useMapStore.setState({
    sheet: "expanded",
    activeModal: "report",
    searchOpen: true,
    searchQuery: "private room",
    navigating: true,
    instructionIndex: 8,
    selectedRoute: "Inside",
    userPosition: { latitude: 40.443, longitude: -79.943 },
    locationPromptVisible: true,
  });
  useMapStore.getState().resetSession();
  expect(useMapStore.getState()).toEqual(initial);
  // Actions survive the reset and remain usable on the next authenticated map.
  useMapStore.getState().setSearchQuery("new session");
  expect(useMapStore.getState().searchQuery).toBe("new session");
});
