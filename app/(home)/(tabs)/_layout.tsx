import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const G = '#30D158';
const INACTIVE = '#3A3A3C';

// ── Custom SVG Icons matching Figma ─────────────────────────────────────────

function RoutesIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Path d="M4 5h14M4 11h10M4 17h6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Rect x="3" y="4" width="16" height="15" rx="3" stroke={c} strokeWidth={sw} fill={active ? 'rgba(48,209,88,0.08)' : 'none'} />
      <Path d="M3 9h16" stroke={c} strokeWidth={active ? 1.8 : 1.5} />
      <Path d="M8 2v4M14 2v4" stroke={c} strokeWidth={active ? 2 : 1.8} strokeLinecap="round" />
      <Circle cx="8" cy="14" r="1.2" fill={c} />
      <Circle cx="14" cy="14" r="1.2" fill={c} />
    </Svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Path d="M11 2C7.7 2 5 4.7 5 8c0 4.4 6 12 6 12s6-7.6 6-12c0-3.3-2.7-6-6-6z" stroke={c} strokeWidth={sw} fill={active ? 'rgba(48,209,88,0.1)' : 'none'} />
      <Circle cx="11" cy="8" r="2" stroke={c} strokeWidth="1.8" />
    </Svg>
  );
}

function DriverIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="8" r="3.5" stroke={c} strokeWidth={sw} />
      <Path d="M4 19c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

function TimelineIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={c} strokeWidth={sw} />
      <Path d="M11 7v4l3 2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? G : INACTIVE;
  const sw = active ? 2 : 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="11" r="3" stroke={c} strokeWidth={sw} fill={active ? 'rgba(48,209,88,0.1)' : 'none'} />
      <Path
        d="M11 2v2M11 18v2M2 11h2M18 11h2M4.6 4.6l1.4 1.4M16 16l1.4 1.4M4.6 17.4l1.4-1.4M16 6l1.4-1.4"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: G,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: 'rgba(0,0,0,0.92)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 3,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Routes',
          tabBarIcon: ({ focused }) => <RoutesIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => <CalendarIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <MapIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="driver"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ focused }) => <TimelineIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <SettingsIcon active={focused} />,
        }}
      />
    </Tabs>
  );
}
