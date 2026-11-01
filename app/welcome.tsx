import React, { useEffect, useState } from "react";
import { View, Text, Animated, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SyncnoxMark from "@/components/SyncnoxMark";

/**
 * Welcome Screen
 * Staggered entrance animations: logo → content → CTA button.
 * Centered layout with dark theme (#000000) and brand green accents (#30D158).
 */
export default function WelcomeScreen() {
  const [logoAnim] = useState(() => new Animated.ValueXY({ x: 0, y: -20 }));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [contentY] = useState(() => new Animated.Value(30));
  const [btnOpacity] = useState(() => new Animated.Value(0));
  const [btnY] = useState(() => new Animated.Value(40));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim.y, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(btnY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [logoAnim, logoOpacity, contentOpacity, contentY, btnOpacity, btnY]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView
        style={{ flex: 1 }}
        className="flex-1 justify-between items-center px-6 pt-6 pb-6"
        edges={["top", "bottom"]}
      >
        {/* Main Content Area — Centered Vertically and Horizontally */}
        <View className="flex-1 justify-center items-center w-full max-w-md">
          {/* Animated Logo Container */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ translateY: logoAnim.y }],
            }}
            className="items-center mb-6"
          >
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 26,
                // backgroundColor: "rgba(48,209,88,0.12)",
                // borderColor: "rgba(48,209,88,0.25)",
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                // shadowColor: "#30D158",
                // shadowOffset: { width: 0, height: 6 },
                // shadowOpacity: 0.25,
                // shadowRadius: 16,
                // elevation: 6,
              }}
            >
              <SyncnoxMark size={64} />
            </View>
          </Animated.View>

          {/* Main Text Content */}
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            }}
            className="w-full items-center"
          >
            <Text className="text-white text-3xl font-bold tracking-tight text-center mb-3">
              Syncnox Driver
            </Text>
            <Text
              className="text-[#8E8E93] text-base leading-6 text-center mb-6 px-2"
              style={{ fontWeight: "400" }}
            >
              Smart delivery management for drivers. Receive routes from your dispatcher, navigate efficiently, and track every stop in real time.
            </Text>

            {/* Feature Pills (Centered) */}
            <View className="flex-row flex-wrap justify-center gap-2.5">
              {["📍 Live Dispatch", "✅ Stop Tracking"].map(
                (label) => (
                  <View
                    key={label}
                    style={{
                      backgroundColor: "#1C1C1E",
                      borderColor: "rgba(48,209,88,0.25)",
                      borderWidth: 1,
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: "#30D158", fontSize: 13, fontWeight: "600" }}>
                      {label}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </Animated.View>
        </View>

        {/* Bottom CTA Action Area */}
        <Animated.View
          style={{
            opacity: btnOpacity,
            transform: [{ translateY: btnY }],
          }}
          className="w-full pb-2 gap-3 items-center"
        >
          <PrimaryButton
            label="I have an activation key"
            onPress={() => router.push("/login")}
            style={{
              width: "100%",
              shadowColor: "#30D158",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          />

          <Text style={{ fontSize: 13, color: "#8E8E93", textAlign: "center" }}>
            Key provided by your fleet dispatcher
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
