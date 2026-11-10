import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import SyncnoxMark from "@/components/SyncnoxMark";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';

// ─── Logo Mark ────────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <View
      style={{
        width: 84,
        height: 84,
        borderRadius: 26,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
      }}
    >
      <SyncnoxMark size={64} />
    </View>
  );
}

// ─── Underline 12-Digit Activation Key Input ──────────────────────────────────
function UnderlineKeyInput({
  setCode,
  setError,
  onSubmit,
}: {
  setCode: (c: string) => void;
  setError: (e: string) => void;
  onSubmit: () => void;
}) {
  const [digits, setDigits] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 12);
    setDigits(cleaned);
    setError("");
    setCode(cleaned);
  };

  return (
    <View className="items-center justify-center my-3 w-full">
      {/* Tap the real input directly: deferred focus cannot open the iOS web keyboard. */}
      <TextInput
        accessibilityLabel="12-digit activation key"
        value={digits}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect={false}
        maxLength={12}
        caretHidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          fontSize: 16,
          color: "transparent",
          backgroundColor: "transparent",
          opacity: 0.01,
        }}
      />

      {/* Underline Groups Display (3 compact groups of 4 slots with dashes in between) */}
      <View pointerEvents="none" className="flex-row items-center justify-center gap-1.5 my-1">
        {[0, 1, 2].map((groupIdx) => (
          <React.Fragment key={groupIdx}>
            {groupIdx > 0 && (
              <Text className="text-white/40 text-base font-bold px-0.5">
                {" "}
              </Text>
            )}
            <View className="flex-row items-center gap-1">
              {[0, 1, 2, 3].map((slotIdx) => {
                const index = groupIdx * 4 + slotIdx;
                const char = digits[index];
                const isCurrent = isFocused && index === digits.length;
                const isFilled = char !== undefined;

                return (
                  <View
                    key={index}
                    className={`w-[18px] h-8 items-center justify-center border-b-2 ${
                      isCurrent
                        ? "border-brand-green"
                        : isFilled
                        ? "border-white"
                        : "border-white/25"
                    }`}
                  >
                    <Text className="text-white text-base font-bold">
                      {char || ""}
                    </Text>
                    {isCurrent && (
                      <View className="absolute h-4 w-[2px] bg-brand-green rounded-full" />
                    )}
                  </View>
                );
              })}
            </View>
          </React.Fragment>
        ))}
      </View>

      <Text pointerEvents="none" className="text-text-secondary text-xs mt-3 font-normal text-center">
        Enter your key here
      </Text>
    </View>
  );
}

export default function LoginScreen() {
  const { login, setCode, code } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    if (!code.trim()) {
      setError('Activation key is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 800));
      const res = await login();
      if (!res.success) {
        setError(res.error || 'Invalid key. Contact your dispatcher.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Main content (Centered Vertically and Horizontally) ── */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 20 }}>
              {/* Logo + headline (Center Aligned) */}
              <View style={{ alignItems: 'center', marginBottom: 32, width: '100%' }}>
                <LogoMark />
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    color: '#ffffff',
                    letterSpacing: -0.5,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Syncnox Driver
                </Text>
              </View>

              {/* Input & Activate Button Container */}
              <View style={{ width: '100%', maxWidth: 400 }}>
                {/* Underline 12-Digit Input with NativeWind Styling */}
                <UnderlineKeyInput setCode={setCode} setError={setError} onSubmit={handleActivate} />

                {/* Error */}
                {!!error && (
                  <Text style={{ fontSize: 13, color: '#FF453A', marginBottom: 12, textAlign: 'center' }}>
                    {error}
                  </Text>
                )}

                {/* Activate button */}
                <TouchableOpacity
                  onPress={handleActivate}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: loading ? '#3A3A3C' : G,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: loading ? 'transparent' : G,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: loading ? 0 : 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: loading ? '#8E8E93' : '#000',
                      letterSpacing: -0.2,
                    }}
                  >
                    {loading ? 'Activating…' : 'Activate Device'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Footer (Centered) ── */}
            <View style={{ paddingBottom: 16, width: '100%', gap: 16, alignItems: 'center' }}>
              <View style={{ width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: '#8E8E93' }}>Need a key?</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, color: G, fontWeight: '600' }}>Contact Dispatcher →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
