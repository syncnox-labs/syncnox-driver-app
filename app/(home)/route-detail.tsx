import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouteStore } from '@/store/route.store';
import { RouteStop } from '@/types/route.types';
import { getStopStatus, isStopDone, formatTime } from './_components/homeScreen.utils';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const AMBER = '#FF9F0A';
const RED = '#FF453A';

// ─── Icons ───────────────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M10 3L5 8l5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NavIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
      <Path d="M8.5 2L14 8.5l-3-1-1 3.5L2 4l6.5 4V2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M12.5 10.5c-.5-.5-1.5-.5-2 0l-1 1c-1-.5-2-1.5-2.5-2.5l1-1c.5-.5.5-1.5 0-2L6.5 4.5c-.5-.5-1.5-.5-2 0L3 6c0 5 8 10 10 8l1.5-1.5c.5-.5.5-1.5 0-2z" stroke={color} strokeWidth="1.5" fill="none" />
    </Svg>
  );
}

function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M3 2h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Stop status config ───────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; dotBg: string }> = {
  completed: { label: 'Delivered', color: G, dotBg: 'rgba(48,209,88,0.12)' },
  pending:   { label: 'Pending',   color: LABEL, dotBg: '#2C2C2E' },
  failed:    { label: 'Failed',    color: RED,   dotBg: 'rgba(255,69,58,0.12)' },
};

// ─── Stop Row ─────────────────────────────────────────────────────────────────
function StopRow({
  stop,
  index,
  isLast,
  onPress,
}: {
  stop: RouteStop;
  index: number;
  isLast: boolean;
  onPress: () => void;
}) {
  const status = getStopStatus(stop);
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  // A stop is interactive (navigable) when it hasn't been completed or failed
  const isInteractive = status === 'pending';

  const name =
    [stop.job?.first_name, stop.job?.last_name].filter(Boolean).join(' ') ||
    stop.job?.business_name ||
    `Stop #${stop.sequence_order ?? index + 1}`;

  const address = stop.address_formatted || stop.job?.address_formatted || '';

  const pkgCount = (stop.job as any)?.quantity ?? 0;
  const eta = stop.planned_arrival_time ? formatTime(stop.planned_arrival_time) : '';

  return (
    <TouchableOpacity
      activeOpacity={isInteractive ? 0.7 : 1}
      onPress={isInteractive ? onPress : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: SEP,
      }}
    >
      {/* Sequence circle */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: cfg.dotBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderWidth: 0,
          borderColor: 'transparent',
        }}
      >
        {status === 'completed' ? (
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M2.5 7L5.5 10L11.5 4" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : status === 'failed' ? (
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M4 4L10 10M10 4L4 10" stroke={RED} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '600', color: LABEL, fontFamily: 'monospace' }}>
            {stop.sequence_order ?? index + 1}
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: status === 'failed' ? '#666' : '#fff',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.color, flexShrink: 0, marginLeft: 8 }}>
            {cfg.label}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: LABEL }} numberOfLines={1}>{address}</Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
          {pkgCount > 0 && (
            <Text style={{ fontSize: 12, color: LABEL }}>📦 {pkgCount} pkg</Text>
          )}
          {eta ? <Text style={{ fontSize: 12, color: LABEL }}>⏱ {eta}</Text> : null}
        </View>
      </View>

      {isInteractive && <ChevronRight />}
    </TouchableOpacity>
  );
}

// ─── Route Detail Screen ──────────────────────────────────────────────────────
export default function RouteDetailScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { assignedRoute, allRoutes } = useRouteStore();

  // Find target route matching routeId, fallback to assignedRoute or first available route
  const route =
    allRoutes.find((r) => String(r.route_id) === String(routeId)) ??
    (assignedRoute && String(assignedRoute.route_id) === String(routeId)
      ? assignedRoute
      : assignedRoute ?? allRoutes[0]);

  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Text style={{ color: LABEL, fontSize: 17 }}>Route not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: G, fontSize: 15 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allStops = route.stops ?? [];
  const jobStops = allStops.filter((s) => !!s.job);
  const totalJobs = jobStops.length > 0 ? jobStops.length : allStops.length;
  const completedJobs = (jobStops.length > 0 ? jobStops : allStops).filter(isStopDone).length;
  const totalStops = allStops.length;
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  // Find the next pending stop to navigate to
  const nextStop = allStops.find((s) => getStopStatus(s) === 'pending');

  // Distance & time
  const distanceM = route.total_distance_meters ?? 0;
  const distanceMi = distanceM > 0 ? `${(distanceM / 1609.34).toFixed(1)}\nmi` : '—';
  const durSec = route.total_duration_seconds ?? 0;
  const durH = Math.floor(durSec / 3600);
  const durMin = Math.floor((durSec % 3600) / 60);
  const durationLabel = durSec > 0 ? `${durH}h ${durMin}m` : '—';

  const isLive = route.assignment_status === 'in_progress' || route.assignment_status === 'acknowledged';

  function handleNavigateTo(stop: RouteStop) {
    const lat = stop.location?.lat || stop.job?.location?.lat;
    const lng = stop.location?.lng || stop.job?.location?.lng;
    const addr = stop.address_formatted || stop.job?.address_formatted;
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}`,
        default: `google.navigation:q=${lat},${lng}`,
      });
      Linking.openURL(url!).catch(() =>
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
      );
    } else if (addr) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#2C2C2E',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BackArrow />
            </TouchableOpacity>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.5, lineHeight: 26 }} numberOfLines={2}>
                {route.name ?? `Route #${route.route_id}`}
              </Text>
            </View>
            {isLive && (
              <View style={{ backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: G }}>Live</Text>
              </View>
            )}
          </View>

          {/* ── Stats grid ── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Jobs', value: `${completedJobs}/${totalJobs}` },
              { label: 'Total Stops', value: `${totalStops}` },
              { label: 'Distance', value: distanceMi },
              { label: 'Time', value: durationLabel },
            ].map((s) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: CARD,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 10, color: LABEL, marginBottom: 3 }}>{s.label}</Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#fff',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}
                >
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Progress bar ── */}
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: LABEL }}>Route progress</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: pct === 100 ? G : '#fff', fontFamily: 'monospace' }}>
                {pct}%
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: '#2C2C2E', borderRadius: 99 }}>
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: G,
                  borderRadius: 99,
                }}
              />
            </View>
          </View>

          {/* ── Navigate to next stop CTA ── */}
          {nextStop && (
            <TouchableOpacity
              onPress={() => handleNavigateTo(nextStop)}
              activeOpacity={0.85}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: 'rgba(48,209,88,0.1)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(48,209,88,0.25)',
                marginBottom: 14,
              }}
            >
              <NavIcon color={G} />
              <Text style={{ fontSize: 17, fontWeight: '600', color: G }}>
                Navigate to Stop #{nextStop.sequence_order ?? '?'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Dispatcher card ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, color: LABEL, marginBottom: 2 }}>Dispatcher</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Operations Team</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { color: G, icon: <PhoneIcon color={G} /> },
              { color: '#0A84FF', icon: <ChatIcon color="#0A84FF" /> },
            ].map(({ color, icon }, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: `${color}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Stop list ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 11, color: LABEL, letterSpacing: 1, marginBottom: 8, paddingLeft: 4, fontFamily: 'monospace', fontWeight: '600' }}>
            ALL STOPS ({totalStops})
          </Text>
          <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
            {allStops.map((stop, i) => (
              <StopRow
                key={stop.id}
                stop={stop}
                index={i}
                isLast={i === allStops.length - 1}
                onPress={() =>
                  router.push({
                    pathname: '/(home)/stop-detail',
                    params: { stopId: stop.id },
                  })
                }
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
