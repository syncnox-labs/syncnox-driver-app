import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import GradientBackground from "@/components/ui/GradientBackground";
import PrimaryButton from "@/components/ui/PrimaryButton";
import CodeInput from "@/components/ui/CodeInput";
import { useAuthStore } from "@/store/auth.store";

const REQUIRED_LENGTH = 12;

export default function LoginScreen() {
  const { login, setCode, code } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const isComplete = code.length === REQUIRED_LENGTH;
  const canActivate = isComplete;

  const handleActivate = async () => {
    if (!canActivate) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const res = await login();
      if (res.success) {
        router.replace("/(home)/(tabs)/home");
      } else {
        setSnackbarMsg(
          res.error || "Failed to save your activation key. Please try again.",
        );
      }
    } catch {
      setSnackbarMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Back button — outside scroll, always top-left */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-2 ml-5 w-[38px] h-[38px] rounded-full bg-white/[0.08] items-center justify-center"
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>

          <ScrollView
            contentContainerClassName="px-6 pt-8 pb-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header — centered like Optimo */}
            <View className="items-center mb-14 mt-6">
              <Text className="text-white text-[28px] font-extrabold tracking-tight text-center">
                Enter Activation Key
              </Text>
            </View>

            {/* Code input block */}
            <View className="items-center mb-2 mt-16">
              <CodeInput value={code} onChange={(v) => { setCode(v); setSnackbarMsg(""); }} autoFocus />
              <Text className="text-white/40 text-sm text-center mt-3">
                Enter your key here
              </Text>
            </View>

            <View>
              <Text className="text-red-700 text-sm text-center mt-3">
                {snackbarMsg || ""}
              </Text>
            </View>

            {/* Spacer */}
            <View className="h-20" />

            {/* Activate button */}
            <PrimaryButton
              label="Activate"
              onPress={handleActivate}
              disabled={!canActivate}
              loading={loading}
              style={
                canActivate
                  ? {
                      shadowColor: "#6EB46E",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 8,
                    }
                  : undefined
              }
            />

            {/* <TouchableOpacity
              className="flex-row items-center gap-2.5 mt-4 mb-6"
              onPress={() => setTermsAccepted((v) => !v)}
              activeOpacity={0.8}
            >
              <View
                className={`w-[22px] h-[22px] rounded-md border-[1.5px] items-center justify-center flex-shrink-0 ${
                  termsAccepted
                    ? "bg-primary border-primary-light"
                    : "bg-bg-input border-brand-green/35"
                }`}
              >
                {termsAccepted && (
                  <Ionicons name="checkmark" size={13} color="white" />
                )}
              </View>
              <Text className="text-white/60 text-[13px] leading-5 flex-1">
                I agree to Syncnox's{" "}
                <Text className="text-primary-light font-semibold">
                  Terms of Service
                </Text>
              </Text>
            </TouchableOpacity> */}

            {/* Help text */}
            <Text className="text-white/55 text-[13px] leading-5 mt-10">
              <Text className="text-white font-bold">
                Can't find your key?{" "}
              </Text>
              Ask your dispatcher to send it to you. If you are an
              Administrator, you can get an activation key from the Syncnox web
              dashboard.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
