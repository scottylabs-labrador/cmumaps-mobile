import { useQueryClient } from "@tanstack/react-query";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { authClient } from "@/auth/client";
import { subscribeSession } from "@/auth/sessionEvents";
import { sessionScreen, signInReturnPath } from "@/auth/sessionPolicy";
import { MapScreen } from "@/components/MapScreen";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useMapStore } from "@/store";
import { theme } from "@/theme";

export const SessionGate = () => {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previouslyAuthenticated = useRef(false);
  const sessionGeneration = useRef(0);
  const [clearing, setClearing] = useState(false);
  const [forcedSignedOut, setForcedSignedOut] = useState(false);
  const returnPath = signInReturnPath(pathname, params);
  const clearPrivateState = useCallback(async () => {
    sessionGeneration.current++;
    setClearing(true);
    setForcedSignedOut(true);
    previouslyAuthenticated.current = false;
    await queryClient.cancelQueries();
    queryClient.clear();
    useMapStore.getState().resetSession();
    router.replace("/");
    setClearing(false);
  }, [queryClient]);

  useEffect(
    () =>
      subscribeSession((event) => {
        if (event === "signed-out") {
          void clearPrivateState();
        } else {
          const generation = sessionGeneration.current;
          // A map 401 can also mean an upstream token problem. Confirm that the
          // session really expired before discarding private state.
          void authClient
            .getSession({ query: { disableCookieCache: true } })
            .then((result) => {
              if (generation === sessionGeneration.current && !result.error && !result.data) {
                void clearPrivateState();
              }
            })
            .catch(() => undefined);
        }
      }),
    [clearPrivateState],
  );

  useEffect(() => {
    if (session.isPending || session.error) return;
    if (session.data) {
      previouslyAuthenticated.current = true;
    } else if (previouslyAuthenticated.current) {
      void clearPrivateState();
    }
  }, [session.data, session.isPending, session.error, clearPrivateState]);

  const authenticated = async () => {
    sessionGeneration.current++;
    const result = await authClient.getSession({ query: { disableCookieCache: true } });
    if (result.error || !result.data) throw new Error("Unable to restore session.");
    await session.refetch();
    setForcedSignedOut(false);
  };

  const screen = sessionScreen({
    hasSession: Boolean(session.data),
    pending: session.isPending,
    failed: Boolean(session.error),
    forcedSignedOut,
  });
  if (clearing || screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Restoring session" color={theme.brand} />
      </View>
    );
  }
  if (screen === "retry") {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Unable to restore your session. Check your connection.</Text>
        <Pressable accessibilityRole="button" onPress={() => void session.refetch()}>
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (screen === "map") return <MapScreen />;
  return <WelcomeScreen returnPath={returnPath} onAuthenticated={authenticated} />;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 16,
    backgroundColor: theme.paper,
  },
  text: { color: theme.ink, textAlign: "center" },
  retry: { color: theme.brand, padding: 16 },
});
