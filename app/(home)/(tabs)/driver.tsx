import { Alert } from '@/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useAuthStore } from '@/store/auth.store';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const AMBER = '#FF9F0A';
const RED = '#FF453A';

type Tab = 'compliance' | 'vehicle' | 'settings';

// ─── Shared Primitives ────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        color: LABEL,
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 6,
        paddingLeft: 2,
        fontWeight: '600',
      }}
    >
      {text}
    </Text>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  noBorder,
}: {
  label: string;
  value: string;
  valueColor?: string;
  noBorder?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: noBorder ? 0 : 1,
        borderBottomColor: SEP,
      }}
    >
      <Text style={{ fontSize: 15, color: LABEL }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '500', color: valueColor || '#fff', fontFamily: 'monospace' }}>
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({
  ratio,
  color,
  height = 6,
}: {
  ratio: number;
  color: string;
  height?: number;
}) {
  return (
    <View style={{ height, backgroundColor: '#2C2C2E', borderRadius: 99, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${Math.min(ratio * 100, 100)}%`,
          backgroundColor: color,
          borderRadius: 99,
        }}
      />
    </View>
  );
}

function ratioColor(ratio: number): string {
  if (ratio < 0.7) return G;
  if (ratio < 0.9) return AMBER;
  return RED;
}

// ─── Compliance Tab ───────────────────────────────────────────────────────────
function ComplianceTab() {
  // Mock compliance data matching Figma design
  const compliance = {
    licenseNumber: 'CDL-NY-48210-C',
    licenseClass: 'Class C',
    licenseExpiry: '2026-09-14',
    medicalCertExpiry: '2026-12-01',
    dailyDrivingLimitHrs: 9,
    dailyDrivingDoneHrs: 3.2,
    continuousLimitHrs: 4.5,
    continuousDoneHrs: 1.8,
    weeklyLimitHrs: 56,
    weeklyDoneHrs: 38.5,
    regularWorkdayHrs: 8,
    workedTodayHrs: 6.5,
    overtimeTodayHrs: 0,
    nextBreakDueIn: '2h 42m',
    lastBreakAt: new Date(Date.now() - 108 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const licDays = Math.ceil(
    (new Date(compliance.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const medDays = Math.ceil(
    (new Date(compliance.medicalCertExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const licColor = licDays > 60 ? G : licDays > 30 ? AMBER : RED;
  const medColor = medDays > 60 ? G : medDays > 30 ? AMBER : RED;

  const dailyRatio = compliance.dailyDrivingDoneHrs / compliance.dailyDrivingLimitHrs;
  const contRatio = compliance.continuousDoneHrs / compliance.continuousLimitHrs;
  const weeklyRatio = compliance.weeklyDoneHrs / compliance.weeklyLimitHrs;

  return (
    <View>
      {/* Licence */}
      <SectionLabel text="LICENCE" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        <InfoRow label="Number" value={compliance.licenseNumber} />
        <InfoRow label="Class" value={compliance.licenseClass} />
        <InfoRow label="Expiry" value={compliance.licenseExpiry} valueColor={licColor} />
        <InfoRow label="Expires in" value={`${licDays} days`} valueColor={licColor} />
        <InfoRow label="Medical cert" value={`${medDays} days`} valueColor={medColor} noBorder />
      </View>

      {/* Daily driving */}
      <SectionLabel text="HOURS OF SERVICE — TODAY" />
      {[
        { label: 'Daily Driving', done: compliance.dailyDrivingDoneHrs, limit: compliance.dailyDrivingLimitHrs },
        { label: 'Continuous Driving', done: compliance.continuousDoneHrs, limit: compliance.continuousLimitHrs },
      ].map((card) => {
        const ratio = card.done / card.limit;
        const color = ratioColor(ratio);
        return (
          <View key={card.label} style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 13, color: LABEL, marginBottom: 3 }}>{card.label}</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color, letterSpacing: -0.5, fontFamily: 'monospace' }}>
                  {card.done.toFixed(1)}
                  <Text style={{ fontSize: 14, fontWeight: '500', color: LABEL }}>/{card.limit}hrs</Text>
                </Text>
              </View>
            </View>
            <ProgressBar ratio={ratio} color={color} />
            <Text style={{ fontSize: 12, color: LABEL, marginTop: 6 }}>
              {(card.limit - card.done).toFixed(1)}hrs remaining · {(ratio * 100).toFixed(0)}% used
            </Text>
          </View>
        );
      })}

      {/* Break info */}
      <View
        style={{
          backgroundColor: CARD,
          borderRadius: 14,
          padding: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>Next mandatory break</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: G }}>in {compliance.nextBreakDueIn}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>Last break</Text>
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#fff', fontFamily: 'monospace' }}>
            {compliance.lastBreakAt}
          </Text>
        </View>
      </View>

      {/* Weekly */}
      <SectionLabel text="WEEKLY HOURS" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 10 }}>
        <Text style={{ fontSize: 13, color: LABEL, marginBottom: 3 }}>Weekly Driving (EU 56h rule)</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: ratioColor(weeklyRatio), letterSpacing: -0.5, fontFamily: 'monospace', marginBottom: 10 }}>
          {compliance.weeklyDoneHrs.toFixed(1)}
          <Text style={{ fontSize: 14, fontWeight: '500', color: LABEL }}>/{compliance.weeklyLimitHrs}hrs</Text>
        </Text>
        <ProgressBar ratio={weeklyRatio} color={ratioColor(weeklyRatio)} />
      </View>

      {/* Work hours */}
      <SectionLabel text="WORK HOURS — TODAY" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        <InfoRow label="Regular hours" value={`${compliance.regularWorkdayHrs}h`} />
        <InfoRow label="Worked today" value={`${compliance.workedTodayHrs.toFixed(1)}h`} />
        <InfoRow
          label="Overtime today"
          value={compliance.overtimeTodayHrs > 0 ? `+${compliance.overtimeTodayHrs.toFixed(1)}h` : '—'}
          valueColor={compliance.overtimeTodayHrs > 0 ? AMBER : G}
          noBorder
        />
      </View>
    </View>
  );
}

// ─── Vehicle Tab ──────────────────────────────────────────────────────────────
function VehicleTab() {
  const vehicle = {
    make: 'Mercedes-Benz',
    model: 'Sprinter 314 CDI',
    plate: 'NY-PLT-4821',
    year: 2023,
    type: 'High-roof Panel Van',
    maxWeightKg: 1100,
    currentWeightKg: 682,
    maxVolumeCbm: 10.5,
    currentVolumeCbm: 7.1,
    fuelPercent: 0.61,
    nextServiceKm: 340,
    odometerKm: 41280,
    lastInspection: '2026-05-02',
  };

  const weightRatio = vehicle.currentWeightKg / vehicle.maxWeightKg;
  const volRatio = vehicle.currentVolumeCbm / vehicle.maxVolumeCbm;
  const weightColor = ratioColor(weightRatio);
  const volColor = ratioColor(volRatio);
  const fuelColor = vehicle.fuelPercent < 0.2 ? RED : vehicle.fuelPercent < 0.4 ? AMBER : G;

  return (
    <View>
      {/* Vehicle identity */}
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: '#2C2C2E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <Rect x="1" y="5" width="24" height="11" rx="2" stroke={LABEL} strokeWidth="1.5" />
              <Path d="M1 9h4l2-4h10l2 4h6" stroke={LABEL} strokeWidth="1.5" strokeLinejoin="round" />
              <Circle cx="6" cy="16" r="2.5" fill={LABEL} />
              <Circle cx="20" cy="16" r="2.5" fill={LABEL} />
            </Svg>
          </View>
          <View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
              {vehicle.make} {vehicle.model}
            </Text>
            <Text style={{ fontSize: 13, color: LABEL }}>
              {vehicle.plate} · {vehicle.year} · {vehicle.type}
            </Text>
          </View>
        </View>
      </View>

      {/* Weight + Volume */}
      {[
        {
          label: 'WEIGHT CAPACITY',
          current: vehicle.currentWeightKg,
          max: vehicle.maxWeightKg,
          unit: 'kg',
          ratio: weightRatio,
          color: weightColor,
        },
        {
          label: 'VOLUME CAPACITY',
          current: vehicle.currentVolumeCbm,
          max: vehicle.maxVolumeCbm,
          unit: 'm³',
          ratio: volRatio,
          color: volColor,
          decimal: true,
        },
      ].map((cap) => (
        <View key={cap.label}>
          <SectionLabel text={cap.label} />
          <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 13, color: LABEL, marginBottom: 3 }}>Current {cap.unit === 'kg' ? 'load' : 'volume'}</Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: cap.color, letterSpacing: -1, fontFamily: 'monospace' }}>
                  {cap.decimal ? (cap.current as number).toFixed(1) : cap.current}
                  <Text style={{ fontSize: 15, fontWeight: '500', color: LABEL }}> {cap.unit}</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, color: LABEL, marginBottom: 3 }}>Max</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', fontFamily: 'monospace' }}>
                  {cap.max} {cap.unit}
                </Text>
              </View>
            </View>
            <ProgressBar ratio={cap.ratio} color={cap.color} height={8} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: LABEL }}>
                {cap.decimal
                  ? `${(cap.max - (cap.current as number)).toFixed(1)} ${cap.unit} remaining`
                  : `${cap.max - (cap.current as number)} ${cap.unit} remaining`}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: cap.color }}>{(cap.ratio * 100).toFixed(0)}% loaded</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Load overview visual */}
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 10 }}>
        <Text style={{ fontSize: 13, color: LABEL, marginBottom: 12 }}>Load overview</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Weight', ratio: weightRatio, color: weightColor },
            { label: 'Volume', ratio: volRatio, color: volColor },
            { label: 'Fuel', ratio: vehicle.fuelPercent, color: fuelColor },
          ].map((v) => (
            <View key={v.label} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', height: 80, backgroundColor: '#2C2C2E', borderRadius: 10, overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: v.color,
                    height: `${v.ratio * 100}%`,
                    opacity: 0.25,
                  }}
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: v.color, fontFamily: 'monospace' }}>
                    {(v.ratio * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: LABEL }}>{v.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Vehicle details */}
      <SectionLabel text="VEHICLE DETAILS" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        <InfoRow label="Odometer" value={`${vehicle.odometerKm.toLocaleString()} km`} />
        <InfoRow
          label="Next service"
          value={`in ${vehicle.nextServiceKm} km`}
          valueColor={vehicle.nextServiceKm < 500 ? AMBER : G}
        />
        <InfoRow label="Last inspection" value={vehicle.lastInspection} noBorder />
      </View>
    </View>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const [notifs, setNotifs] = useState(true);
  const [gps, setGps] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [offline, setOffline] = useState(false);

  return (
    <View>
      <SectionLabel text="ACCOUNT" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        {[
          { label: 'Phone', value: '+1 (555) 847-2291' },
          { label: 'Zone', value: 'Zone A — Downtown' },
        ].map((r, i, a) => (
          <InfoRow key={r.label} label={r.label} value={r.value} noBorder={i === a.length - 1} />
        ))}
      </View>

      <SectionLabel text="PREFERENCES" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        {[
          { label: 'Push Notifications', value: notifs, set: setNotifs },
          { label: 'GPS Tracking', value: gps, set: setGps },
          { label: 'Haptic Feedback', value: haptics, set: setHaptics },
          { label: 'Offline Mode', value: offline, set: setOffline },
        ].map((r, i, a) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 13,
              paddingHorizontal: 16,
              borderBottomWidth: i < a.length - 1 ? 1 : 0,
              borderBottomColor: SEP,
            }}
          >
            <Text style={{ fontSize: 15, color: '#fff' }}>{r.label}</Text>
            <Switch
              value={r.value}
              onValueChange={r.set}
              trackColor={{ false: '#3A3A3C', true: 'rgba(48,209,88,0.5)' }}
              thumbColor={r.value ? G : '#636366'}
              ios_backgroundColor="#3A3A3C"
            />
          </View>
        ))}
      </View>

      <SectionLabel text="SUPPORT" />
      <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
        {['Help & Guides', 'Contact Dispatcher', 'Privacy Policy', 'App Version 2.4.1'].map(
          (item, i, a) => (
            <TouchableOpacity
              key={item}
              activeOpacity={i < a.length - 1 ? 0.7 : 1}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderBottomWidth: i < a.length - 1 ? 1 : 0,
                borderBottomColor: SEP,
              }}
            >
              <Text style={{ fontSize: 15, color: i === a.length - 1 ? LABEL : '#fff' }}>{item}</Text>
              {i < a.length - 1 && (
                <Svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <Path d="M6 3l4 4-4 4" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
          ),
        )}
      </View>

      <View style={{ marginTop: 20, marginBottom: 10 }}>
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.8}
          style={{
            height: 50,
            borderRadius: 14,
            backgroundColor: 'rgba(255,69,58,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: RED }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Driver Screen (Main) ─────────────────────────────────────────────────────
export default function DriverScreen() {
  const { logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('compliance');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'compliance', label: 'Compliance' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'settings', label: 'Settings' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need your activation key to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>Alex Rivera · DRV-4821</Text>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40, marginBottom: 16 }}>
            Driver
          </Text>

          {/* ── 3-Tab Switcher ── */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#1C1C1E',
              borderRadius: 12,
              padding: 3,
              marginBottom: 4,
              gap: 2,
            }}
          >
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: tab === t.key ? G : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: tab === t.key ? '#000' : LABEL,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'compliance' && <ComplianceTab />}
          {tab === 'vehicle' && <VehicleTab />}
          {tab === 'settings' && <SettingsTab onLogout={handleLogout} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
