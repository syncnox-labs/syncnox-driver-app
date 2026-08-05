import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useRouteSocket } from '@/hooks/useRouteSocket';
import { useRouteStore } from '@/store/route.store';
import { isStopDone, getStopStatus } from '../_components/homeScreen.utils';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const AMBER = '#FF9F0A';
const BLUE = '#0A84FF';

type RouteTab = 'active' | 'upcoming' | 'done';

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  if (status === 'in_progress')
    return (
      <View style={{ backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: G }}>In Progress</Text>
      </View>
    );
  if (status === 'upcoming' || status === 'acknowledged')
    return (
      <View style={{ backgroundColor: 'rgba(10,132,255,0.12)', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: BLUE }}>Scheduled</Text>
      </View>
    );
  if (status === 'completed')
    return (
      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: LABEL }}>Done</Text>
      </View>
    );
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: LABEL }}>Ready</Text>
    </View>
  );
}

// ─── Chevron Icon ─────────────────────────────────────────────────────────────
function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Play Icon ────────────────────────────────────────────────────────────────
function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M3 2L11 7L3 12V2Z" fill={color} />
    </Svg>
  );
}

// ─── Calendar Icon ────────────────────────────────────────────────────────────
function CalIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
      <Rect x="1" y="2" width="9" height="8" rx="1.5" stroke={LABEL} strokeWidth="1.2" />
      <Path d="M1 4.5h9" stroke={LABEL} strokeWidth="1" />
      <Path d="M3.5 1v2M7.5 1v2" stroke={LABEL} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Clock Icon ───────────────────────────────────────────────────────────────
function ClockIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
      <Circle cx="5.5" cy="5.5" r="4.2" stroke={LABEL} strokeWidth="1.2" />
      <Path d="M5.5 3.5v2l1.5 1" stroke={LABEL} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

// ─── MapPin Icon ──────────────────────────────────────────────────────────────
function MapPinIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
      <Path d="M5.5 1C3.6 1 2 2.6 2 4.5c0 2.7 3.5 6.5 3.5 6.5S9 7.2 9 4.5C9 2.6 7.4 1 5.5 1z" stroke={LABEL} strokeWidth="1.2" fill="none" />
      <Circle cx="5.5" cy="4.5" r="1" stroke={LABEL} strokeWidth="1" />
    </Svg>
  );
}

// ─── Single Route Card ────────────────────────────────────────────────────────
function RouteCard({
  route,
  tab,
  onPress,
  onStart,
}: {
  route: any;
  tab: RouteTab;
  onPress: () => void;
  onStart: () => void;
}) {
  const allStops = route.stops ?? [];
  const jobStops = allStops.filter((s: any) => !!s.job);
  const effectiveStops = jobStops.length > 0 ? jobStops : allStops;
  const totalStops = effectiveStops.length;
  const completedStops = effectiveStops.filter((s: any) => isStopDone(s)).length;
  const pct = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
  const isActive = tab === 'active';
  const isUpcoming = tab === 'upcoming';
  const isInProgress = route.assignment_status === 'in_progress';

  // Format distance
  const distanceM = route.total_distance_meters ?? 0;
  const distanceMi = distanceM > 0 ? `${(distanceM / 1609.34).toFixed(1)} mi` : '—';

  // Format duration
  const durSec = route.total_duration_seconds ?? 0;
  const durH = Math.floor(durSec / 3600);
  const durMin = Math.floor((durSec % 3600) / 60);
  const durationLabel = durSec > 0 ? `${durH}h ${durMin}m` : '—';

  // Date label
  const dateLabel = route.scheduled_date
    ? new Date(route.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

  const routeName = route.name ?? `Route #${route.route_id}`;

  const stopsLabel = isUpcoming
    ? `${totalStops}`
    : `${completedStops}/${totalStops}`;

  const pillStatus = isInProgress ? 'in_progress' : tab === 'done' ? 'completed' : tab;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ padding: 16, paddingBottom: 14 }}>
        {/* Route Name + status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3, lineHeight: 22 }} numberOfLines={1}>
              {routeName}
            </Text>
            <StatusPill status={pillStatus} />
          </View>
          <ChevronRight />
        </View>

        {/* Date + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CalIcon />
            <Text style={{ fontSize: 13, color: LABEL }}>{dateLabel}</Text>
          </View>
          {durationLabel !== '—' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ClockIcon />
              <Text style={{ fontSize: 13, color: LABEL }}>{durationLabel}</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: !isUpcoming ? 12 : 0 }}>
          {[
            { label: 'Stops', value: stopsLabel },
            { label: 'Distance', value: distanceMi },
            { label: 'Est.', value: durationLabel },
          ].map((s) => (
            <View key={s.label}>
              <Text style={{ fontSize: 11, color: LABEL, marginBottom: 1 }}>{s.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'monospace' }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Progress bar — active + done only */}
        {!isUpcoming && (
          <View style={{ height: 3, backgroundColor: '#2C2C2E', borderRadius: 99, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: tab === 'done' ? '#3A3A3C' : G,
                borderRadius: 99,
              }}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Start / Continue CTA — active routes */}
      {isActive && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <TouchableOpacity
            onPress={onStart}
            activeOpacity={0.85}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: isInProgress ? 'rgba(48,209,88,0.1)' : G,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: isInProgress ? 1.5 : 0,
              borderColor: isInProgress ? 'rgba(48,209,88,0.25)' : 'transparent',
            }}
          >
            <PlayIcon color={isInProgress ? G : '#000'} />
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: isInProgress ? G : '#000',
              }}
            >
              {isInProgress ? 'Continue Route' : 'Start Route'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upcoming: address strip */}
      {isUpcoming && route.stops && route.stops.length > 0 && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: SEP,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MapPinIcon />
          <Text style={{ fontSize: 12, color: LABEL }} numberOfLines={1}>
            {route.stops[0]?.address_formatted ?? 'Route details pending'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyTab({ tab }: { tab: RouteTab }) {
  const msgs: Record<RouteTab, { title: string; sub: string }> = {
    active: { title: 'No active routes', sub: 'Check Upcoming for scheduled routes.' },
    upcoming: { title: 'No upcoming routes', sub: "Your dispatcher hasn't shared any yet." },
    done: { title: 'No completed routes', sub: 'Completed routes will appear here.' },
  };
  const { title, sub } = msgs[tab];
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 17, color: LABEL, marginBottom: 6 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: '#3A3A3C', textAlign: 'center' }}>{sub}</Text>
    </View>
  );
}

// ─── Main Routes Screen ───────────────────────────────────────────────────────
export default function RoutesScreen() {
  const { assignedRoute, allRoutes, isLoading, fetchMyRoutes } = useRouteStore();
  const [tab, setTab] = useState<RouteTab>('active');

  useRouteSocket();

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  // Summary pills are based on the active route (non-completed)
  const activeRoute = assignedRoute ?? null;
  const allStops = activeRoute?.stops ?? [];
  const allJobStops = allStops.filter((s) => !!s.job);
  const completedStops = allJobStops.filter(isStopDone);
  const pendingStops = allJobStops.filter((s) => !isStopDone(s));

  // Driver score (simple version based on completion)
  const totalStops = allJobStops.length;
  const completedCount = completedStops.filter((s) => getStopStatus(s) === 'completed').length;
  const driverScore = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  // Distance and duration formatting
  const distanceM = activeRoute?.total_distance_meters ?? 0;
  const distanceMi = distanceM > 0 ? `${(distanceM / 1609.34).toFixed(1)} mi` : '—';
  const durSec = activeRoute?.total_duration_seconds ?? 0;
  const durH = Math.floor(durSec / 3600);
  const durMin = Math.floor((durSec % 3600) / 60);
  const durationLabel = durSec > 0 ? `${durH}h ${durMin}m` : '—';

  // Current date label
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Split routes from allRoutes into active vs done tabs
  const activeRoutes = allRoutes.filter((r) => r.assignment_status !== 'completed');
  const upcomingRoutes: any[] = []; // real API doesn't return these yet
  const doneRoutes = allRoutes.filter((r) => r.assignment_status === 'completed');

  const tabRoutes: Record<RouteTab, any[]> = {
    active: activeRoutes,
    upcoming: upcomingRoutes,
    done: doneRoutes,
  };
  const displayed = tabRoutes[tab];

  const TAB_CFG: { key: RouteTab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'done', label: 'Done' },
  ];

  const tabBg = (key: RouteTab) => {
    if (tab !== key) return 'transparent';
    if (key === 'active') return G;
    if (key === 'upcoming') return 'rgba(10,132,255,0.2)';
    return '#2C2C2E';
  };

  const tabTextColor = (key: RouteTab) => {
    if (tab !== key) return LABEL;
    if (key === 'active') return '#000';
    if (key === 'upcoming') return BLUE;
    return '#fff';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>{dateLabel}</Text>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40, marginBottom: 16 }}>
            Routes
          </Text>

          {/* ── Summary Pills ── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
            {[
              {
                label: 'Driver Score',
                value: driverScore > 0 ? `${driverScore}` : '—',
                sub: driverScore > 0 ? '/100' : '',
                color: driverScore >= 90 ? G : driverScore >= 75 ? AMBER : driverScore > 0 ? '#FF453A' : LABEL,
              },
              {
                label: 'Stops Done',
                value: totalStops > 0 ? `${completedCount}` : '—',
                sub: totalStops > 0 ? `/${totalStops}` : '',
                color: totalStops > 0 ? G : LABEL,
              },
              {
                label: 'Distance',
                value: distanceMi !== '—' ? distanceMi.split(' ')[0] : '—',
                sub: distanceMi !== '—' ? ' mi' : '',
                color: '#fff',
              },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 10, color: LABEL, marginBottom: 4 }}>{s.label}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: s.color, letterSpacing: -0.5, lineHeight: 22 }}>
                  {s.value}
                  <Text style={{ fontSize: 12, fontWeight: '500', color: LABEL }}>{s.sub}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* ── 3-Tab Switcher ── */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#1C1C1E',
              borderRadius: 12,
              padding: 3,
              marginBottom: 16,
              gap: 2,
            }}
          >
            {TAB_CFG.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: tabBg(key),
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: tabTextColor(key) }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Content ── */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={G} size="large" />
            <Text style={{ color: LABEL, fontSize: 13, marginTop: 12 }}>Loading routes...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={fetchMyRoutes} tintColor={G} colors={[G]} />
            }
          >
            {displayed.length === 0 ? (
              <EmptyTab tab={tab} />
            ) : (
              displayed.map((route, idx) => (
                <RouteCard
                  key={idx}
                  route={route}
                  tab={tab}
                  onPress={() =>
                    router.push({
                      pathname: '/(home)/route-detail' as any,
                      params: { routeId: route.route_id },
                    })
                  }
                  onStart={() =>
                    router.push({
                      pathname: '/(home)/route-detail' as any,
                      params: { routeId: route.route_id },
                    })
                  }
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
