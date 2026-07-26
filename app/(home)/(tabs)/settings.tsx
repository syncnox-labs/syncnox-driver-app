import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import GradientBackground from "@/components/ui/GradientBackground";
import SyncnoxMark from "@/components/SyncnoxMark";
import { useAuthStore } from "@/store/auth.store";

// ------------------------------------------------------------------ //
// Settings Section & Row Helpers
// ------------------------------------------------------------------ //

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="text-[10px] font-bold tracking-widest px-5 mt-6 mb-2 uppercase"
      style={{ color: "rgba(229,236,233,0.3)" }}
    >
      {title}
    </Text>
  );
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  isDestructive = false,
}: SettingRowProps) {
  const content = (
    <View
      className="flex-row items-center justify-between py-4 px-5 border-b border-white/[0.05]"
      style={{ backgroundColor: "#1C1C1E" }}
    >
      <View className="flex-row items-center gap-3.5">
        <Ionicons
          name={icon}
          size={18}
          color={isDestructive ? "#FF453A" : "#30D158"}
        />
        <Text
          className="text-[15px] font-medium"
          style={{
            color: isDestructive ? "#FF453A" : "#FFFFFF",
          }}
        >
          {label}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {value && (
          <Text className="text-xs text-text-muted font-semibold">{value}</Text>
        )}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={16} color="#30D158" />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ------------------------------------------------------------------ //
// Main Settings Screen
// ------------------------------------------------------------------ //

export default function SettingsTabScreen() {
  const { logout } = useAuthStore();
  const [workingNow, setWorkingNow] = useState(true);
  const [useCircleMarkers, setUseCircleMarkers] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out? You will need your activation code to log in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => logout(),
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. To delete your driver account, please contact your logistics coordinator or fleet dispatcher.",
      [{ text: "OK" }],
    );
  };

  const triggerDiagnostics = () => {
    Alert.alert(
      "Diagnostics",
      "Network connection: OK\nWebSocket sync: Active\nLocation services: Enabled\nApp version: v1.0.4",
      [{ text: "Close" }],
    );
  };

  const handleNavigationSelect = () => {
    Alert.alert(
      "Default Navigation",
      "Choose your preferred navigation application:",
      [
        { text: "Google Maps", onPress: () => {} },
        { text: "Waze", onPress: () => {} },
        { text: "Apple Maps (iOS)", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  return (
    <GradientBackground isBlack>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-white/[0.05]">
          <View className="flex-row items-center gap-2">
            <SyncnoxMark size={24} />
            <Text className="text-text-primary text-xl font-extrabold tracking-tight">
              Settings
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ON DUTY section */}
          <SectionHeader title="On Duty" />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Working right now"
            rightElement={
              <Switch
                disabled={true}
                value={workingNow}
                onValueChange={setWorkingNow}
                trackColor={{ false: "#2C2C2E", true: "rgba(48,209,88,0.3)" }}
                thumbColor={workingNow ? "#30D158" : "#8E8E93"}
                ios_backgroundColor="#2C2C2E"
              />
            }
          />

          {/* MAP section */}
          {/* <SectionHeader title="Map" />
          <SettingRow
            icon="disc-outline"
            label="Use circle markers"
            rightElement={
              <Switch
                value={useCircleMarkers}
                onValueChange={setUseCircleMarkers}
                trackColor={{ false: "#1c1c1e", true: "rgba(48,209,88,0.3)" }}
                thumbColor={useCircleMarkers ? "#30D158" : "#9ca3af"}
                ios_backgroundColor="#1c1c1e"
              />
            }
          /> */}

          {/* NAVIGATION section */}
          <SectionHeader title="Navigation" />
          <SettingRow
            icon="navigate-outline"
            label="Default navigation"
            value="Google Maps"
            onPress={handleNavigationSelect}
          />

          {/* APPLICATION section */}
          <SectionHeader title="Application" />
          <SettingRow
            icon="information-circle-outline"
            label="About Syncnox"
            value="v1.0.4"
          />
          <SettingRow
            icon="globe-outline"
            label="Language"
            value="English (US)"
          />
          <SettingRow
            icon="color-palette-outline"
            label="Color theme"
            value="Dark"
          />
          {/* <SettingRow
            icon="pulse-outline"
            label="Application diagnostics"
            onPress={triggerDiagnostics}
          /> */}

          {/* ACCOUNT section */}
          <SectionHeader title="Account" />
          <SettingRow
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            isDestructive={true}
          />
          {/* <SettingRow
            icon="trash-outline"
            label="Delete account"
            onPress={handleDeleteAccount}
            isDestructive={true}
          /> */}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
