import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "@/components/ui/GradientBackground";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SyncnoxMark from "@/components/SyncnoxMark";

/**
 * Welcome Screen
 * Staggered entrance animations: logo → content → CTA button.
 * Authenticated users are pre-redirected by the root _layout before reaching here.
 */
export default function WelcomeScreen() {
  const logoAnim = useRef(new Animated.ValueXY({ x: 0, y: -20 })).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(30)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
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
    ]).start();
  }, []);

  return (
    <GradientBackground>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView className="flex-1 flex-col justify-around px-7 pt-4" edges={["top", "bottom"]}>
        {/* Hero — logo centred in a decorative ring */}
        <View className="flex-[0.55] items-center justify-center">
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ translateY: logoAnim.y }],
            }}
            className="items-center"
          >
            <View
              className="w-40 h-40 rounded-full items-center justify-center border border-brand-green/15"
              style={{ backgroundColor: "rgba(110,180,110,0.08)" }}
            >
              <View
                className="w-28 h-28 rounded-full items-center justify-center border border-brand-green/25"
                style={{ backgroundColor: "rgba(110,180,110,0.12)" }}
              >
                <SyncnoxMark size={72} />
              </View>
            </View>
          </Animated.View>

          {/* Decorative dot grid */}
          {/* <View className="absolute bottom-5 right-0 flex-row flex-wrap w-[75px] gap-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <View
                key={i}
                className="w-1 h-1 rounded-full bg-brand-green/25"
              />
            ))}
          </View> */}
        </View>

        {/* Text content */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          }}
          className="pb-8"
        >
          <Text className="text-white text-4xl font-extrabold tracking-tight mb-3">
            Syncnox Driver
          </Text>
          <Text className="text-white/60 text-[15px] leading-6 mb-6">
            Smart delivery management for drivers.{"\n"}
            Receive routes from your dispatcher and{"\n"}
            track every stop seamlessly.
          </Text>

          {/* Feature pills */}
          <View className="flex-row flex-wrap gap-2">
            {["📍 Live Routes", "✅ Stop Tracking", "🔒 Secure"].map(
              (label) => (
                <View
                  key={label}
                  className="border border-brand-green/25 rounded-full px-3 py-1"
                  style={{ backgroundColor: "rgba(110,180,110,0.12)" }}
                >
                  <Text className="text-primary-light text-xs font-medium">
                    {label}
                  </Text>
                </View>
              ),
            )}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View
          style={{ opacity: btnOpacity, transform: [{ translateY: btnY }] }}
          className="pb-3 gap-4"
        >
          <PrimaryButton
            label="I have an activation key"
            onPress={() => router.push("/login")}
            style={{
              shadowColor: "#6EB46E",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          />
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}
