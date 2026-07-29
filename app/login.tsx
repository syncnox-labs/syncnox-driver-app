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
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';

// ─── Logo Mark ────────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: 'rgba(48,209,88,0.12)',
        borderColor: 'rgba(48,209,88,0.25)',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}
    >
      <Image
        source={require('@/assets/images/logo-syncnox.png')}
        style={{ width: 40, height: 40 }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function LoginScreen() {
  const { login, setCode, code } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

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
      if (res.success) {
        router.replace('/(home)/(tabs)/home');
      } else {
        setError(res.error || 'Invalid key. Contact your dispatcher.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Main content ── */}
            <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center', paddingBottom: 40, paddingTop: 60 }}>
              {/* Logo + headline */}
              <View style={{ marginBottom: 40 }}>
                <LogoMark />
                <Text
                  style={{
                    fontSize: 34,
                    fontWeight: '700',
                    color: '#fff',
                    letterSpacing: -1,
                    lineHeight: 40,
                    marginBottom: 8,
                  }}
                >
                  Syncnox Driver
                </Text>
                <Text style={{ fontSize: 17, color: '#8E8E93', fontWeight: '400', lineHeight: 24 }}>
                  Enter the activation key provided by your fleet dispatcher.
                </Text>
              </View>

              {/* Input */}
              <View style={{ marginBottom: error ? 4 : 16 }}>
                <View
                  style={{
                    backgroundColor: '#1C1C1E',
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: focused ? G : 'transparent',
                    height: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                  }}
                >
                  <TextInput
                    value={code}
                    onChangeText={(v) => { setCode(v); setError(''); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={handleActivate}
                    placeholder="e.g. DRV-2024-DEMO"
                    placeholderTextColor="#3A3A3C"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      fontSize: 17,
                      fontWeight: '500',
                      color: '#fff',
                      fontFamily: 'monospace',
                      letterSpacing: 1,
                    }}
                  />
                </View>
              </View>

              {/* Error */}
              {!!error && (
                <Text style={{ fontSize: 13, color: '#FF453A', marginBottom: 12, paddingLeft: 4 }}>
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
                    fontWeight: '600',
                    color: loading ? '#8E8E93' : '#000',
                    letterSpacing: -0.2,
                  }}
                >
                  {loading ? 'Activating…' : 'Activate Device'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Footer ── */}
            <View style={{ paddingHorizontal: 32, paddingBottom: 32, gap: 20 }}>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#8E8E93' }}>Need a key?</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, color: G, fontWeight: '500' }}>Contact Dispatcher →</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: '#3A3A3C', textAlign: 'center' }}>
                Encrypted · GDPR compliant · Offline capable
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
