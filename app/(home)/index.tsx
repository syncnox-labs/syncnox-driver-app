import React from 'react';
import { View, Text, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Divider } from 'react-native-paper';
import GradientBackground from '@/components/ui/GradientBackground';
import SyncnoxMark from '@/components/SyncnoxMark';
import { useAuth } from '@/hooks/useAuth';

/**
 * Home screen stub (Phase 1).
 * Shows authenticated state confirmation and a logout button.
 * Will be replaced with Orders list in Phase 3.
 */
export default function HomeScreen() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure? You will need your activation key to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <View className="flex-row items-center gap-2.5">
            <SyncnoxMark size={28} />
            <Text className="text-white text-lg font-bold tracking-tight">
              Syncnox Driver
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <Divider className="bg-white/[0.08]" />

        {/* Body */}
        <View className="flex-1 items-center justify-center px-7">
          <View
            className="w-full border border-border-subtle rounded-2xl p-9 items-center gap-3"
            style={{ backgroundColor: '#0D2E1A' }}
          >
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-2"
              style={{ backgroundColor: 'rgba(110,180,110,0.10)' }}
            >
              <Ionicons name="cube-outline" size={48} color="#6EB46E" />
            </View>
            <Text className="text-white text-[22px] font-bold tracking-tight">
              Home Screen
            </Text>
            <Text className="text-white/60 text-sm text-center leading-5">
              Orders, Map, and Settings coming in the next phase.{'\n'}
              Activation successful! ✅
            </Text>
          </View>
        </View>

      </SafeAreaView>
    </GradientBackground>
  );
}
