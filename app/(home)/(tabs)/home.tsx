import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import GradientBackground from "@/components/ui/GradientBackground";
import SyncnoxMark from "@/components/SyncnoxMark";
import { useAuthStore } from "@/store/auth.store";
import { useRouteSocket } from "@/hooks/useRouteSocket";
import { useRouteStore } from "@/store/route.store";
import StopCard from "../_components/StopCard";
import { isStopDone, getStopStatus } from "../_components/homeScreen.utils";

// ------------------------------------------------------------------ //
// Empty states
// ------------------------------------------------------------------ //

function WaitingState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-5"
        style={{ backgroundColor: "rgba(110,180,110,0.1)" }}
      >
        <Ionicons name="time-outline" size={40} color="#6EB46E" />
      </View>
      <Text className="text-white text-lg font-bold text-center mb-2">
        Waiting for Route
      </Text>
      <Text className="text-white/50 text-sm text-center leading-5">
        Your dispatcher hasn't shared a route yet.{"\n"}You'll be notified as
        soon as it's ready.
      </Text>
    </View>
  );
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center pt-16">
      <Ionicons
        name="checkmark-circle-outline"
        size={44}
        color="rgba(110, 180, 110, 0.4)"
      />
      <Text className="text-white/30 text-sm mt-3">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { logout } = useAuthStore();
  const { assignedRoute, isLoading, fetchMyRoute } = useRouteStore();
  const [activeTab, setActiveTab] = useState<"todo" | "completed">("todo");

  useRouteSocket();

  useEffect(() => {
    fetchMyRoute();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure? You will need your activation key to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() },
      ],
    );
  };

  const allStops = assignedRoute?.stops ?? [];
  const todoStops = allStops.filter((s) => !isStopDone(s));
  const doneStops = allStops.filter(isStopDone);
  const totalStops = allStops.filter((s) => !!s.job).length;
  const completedCount = doneStops.filter(
    (s) => getStopStatus(s) === "completed",
  ).length;
  const displayStops = activeTab === "todo" ? todoStops : doneStops;

  return (
    <GradientBackground isBlack>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <View className="flex-row items-center gap-2">
            <SyncnoxMark size={24} />
            <Text className="text-white text-xl font-extrabold tracking-tight">
              My Route
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Progress pill */}
            {assignedRoute && (
              <View
                className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(110,180,110,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(110,180,110,0.3)",
                }}
              >
                <View className="w-2 h-2 rounded-full bg-green-400" />
                <Text className="text-[11px] font-bold text-green-400 tracking-wide">
                  {completedCount}/{totalStops} DONE
                </Text>
              </View>
            )}

            {/* Logout (quick shortcut, though also in settings tab) */}
            {/* <TouchableOpacity
              onPress={handleLogout}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color="#6EB46E"
              />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* ── Tabs ── */}
        <View
          className="flex-row mx-4 mb-3 rounded-xl overflow-hidden border border-white/[0.07]"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          {(["todo", "completed"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const tabLabel = tab === "todo" ? "To Do" : "Completed";
            const count = tab === "todo" ? todoStops.length : doneStops.length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
                style={
                  isActive
                    ? { backgroundColor: "#003220", borderRadius: 10 }
                    : {}
                }
                activeOpacity={0.7}
              >
                <Text
                  className="text-lg font-bold"
                  style={{
                    color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {tabLabel}
                </Text>
                {count > 0 && (
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(110,180,110,0.25)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text
                      className="text-[12px] font-bold"
                      style={{
                        color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Body ── */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6EB46E" size="large" />
            <Text className="text-white/40 text-sm mt-3">
              Loading your route...
            </Text>
          </View>
        ) : !assignedRoute ? (
          <WaitingState />
        ) : (
          <>
            {/* Section header */}
            <View className="flex-row justify-between items-center px-5 mb-2">
              <Text
                className="text-[10px] font-bold tracking-widest"
                style={{ color: "#FFFFFF" }}
              >
                {activeTab === "todo" ? "UP NEXT" : "TODAY"}
              </Text>
              <Text
                className="text-[10px] font-bold tracking-widest"
                style={{ color: "#ffffff" }}
              >
                {completedCount}/{totalStops} COMPLETED
              </Text>
            </View>

            <FlatList
              data={displayStops}
              keyExtractor={(s) => String(s.id)}
              renderItem={({ item }) => (
                <StopCard
                  stop={item}
                  onPress={() =>
                    router.push({
                      pathname: "/(home)/stop-detail",
                      params: { stopId: item.id },
                    })
                  }
                />
              )}
              ListEmptyComponent={
                <EmptyTabState
                  label={
                    activeTab === "todo"
                      ? "All stops complete! 🎉"
                      : "No completed stops yet."
                  }
                />
              }
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchMyRoute}
                  tintColor="#6EB46E"
                  colors={["#6EB46E"]}
                />
              }
              contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
