import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MapScreen } from "@/components/MapScreen";

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <StatusBar style="dark" />
        <View style={styles.fill}>
          <MapScreen />
          <View style={styles.routeSlot} pointerEvents="none">
            <Stack screenOptions={{ headerShown: false, animation: "none" }} />
          </View>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  routeSlot: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
});
