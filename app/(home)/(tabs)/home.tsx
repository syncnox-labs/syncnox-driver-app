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
import { useAuthStore } from '@/store/auth.store';
import { useRouteStore } from '@/store/route.store';
import { AssignedRoute } from '@/types/route.types';
import { formatDistance } from '@/utils/distance.utils';
import {
  getRouteLegLabel,
  getStopProgress,
  groupRouteStops,
  isStopFinished,
} from '@/utils/shuttleRoute.utils';

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

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function firstStopTimestamp(route: AssignedRoute): string {
  const first = (route.stops ?? []).find((s) => !!s.planned_arrival_time || !!s.planned_departure_time);
  return first?.planned_arrival_time || first?.planned_departure_time || route.scheduled_date || '';
}

function formatVehicleChip(vehicle?: AssignedRoute['vehicle'] | null): string | null {
  if (!vehicle) return null;
  if (vehicle.vehicle_summary) return vehicle.vehicle_summary;
  const parts = [vehicle.name];
  if (vehicle.license_plate) parts.push(vehicle.license_plate);
  if (vehicle.capacity) parts.push(`${vehicle.capacity} seats`);
  return parts.filter(Boolean).join(' • ') || null;
}

// ─── Single Route Card ────────────────────────────────────────────────────────
function RouteCard({
  route,
  tab,
  defaultTemplate,
  onPress,
  onStart,
}: {
  route: AssignedRoute;
  tab: RouteTab;
  defaultTemplate?: AssignedRoute['job_template_type'] | null;
  onPress: () => void;
  onStart: () => void;
}) {
  const tpl = route.job_template_type ?? defaultTemplate ?? 'pickup_delivery_job';
  const isShuttle = tpl === 'worker_shuttle';
  const allStops = route.stops ?? [];
  const jobStops = allStops.filter((s) => !!s.job);
  const groups = groupRouteStops(route, tpl);
  const visitGroups = groups.filter((g) => g.kind !== 'start' && g.kind !== 'end');

  const uniquePassengerIds = new Set(
    jobStops.map((s) => s.job?.id).filter((id): id is number => id != null),
  );
  const passengerCount = uniquePassengerIds.size || jobStops.length;

  const totalActions = jobStops.length > 0 ? jobStops.length : visitGroups.length;
  const completedActions = (jobStops.length > 0 ? jobStops : allStops).filter(isStopFinished).length;
  const totalStops = visitGroups.length > 0 ? visitGroups.length : allStops.length;
  const pct = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
  const isActive = tab === 'active';
  const isUpcoming = tab === 'upcoming';
  const isInProgress = route.assignment_status === 'in_progress';

  const distanceUnit = useRouteStore((s) => s.distanceUnit);

  // Format distance
  const distanceM = route.total_distance_meters ?? 0;
  const distanceMi = formatDistance(distanceM, distanceUnit);

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
  const legLabel = getRouteLegLabel(route);
  const vehicleChip = formatVehicleChip(route.vehicle);

  const primaryStatLabel = isShuttle ? 'Passengers' : 'Jobs';
  const primaryStatValue = isShuttle
    ? `${passengerCount}`
    : isUpcoming
      ? `${totalActions}`
      : `${completedActions}/${totalActions}`;

  const pillStatus = isInProgress ? 'in_progress' : tab === 'done' ? 'completed' : route.assignment_status === 'acknowledged' && isUpcoming ? 'upcoming' : tab;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ padding: 16, paddingBottom: 14 }}>
        {/* Route Name + status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3, lineHeight: 22, flex: 1, flexShrink: 1 }} numberOfLines={1}>
            {routeName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StatusPill status={pillStatus} />
            <ChevronRight />
          </View>
        </View>

        {/* Shuttle leg / Team Leader / Vehicle badges */}
        {(legLabel || route.is_team_leader || vehicleChip) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {legLabel && (
              <View
                style={{
                  backgroundColor: legLabel === 'GO' ? 'rgba(48,209,88,0.14)' : 'rgba(10,132,255,0.16)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: legLabel === 'GO' ? G : BLUE }}>
                  {legLabel} LEG
                </Text>
              </View>
            )}
            {route.is_team_leader && (
              <View
                style={{
                  backgroundColor: 'rgba(255,159,10,0.14)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: AMBER }}>Team Leader</Text>
              </View>
            )}
            {vehicleChip && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  maxWidth: '100%',
                }}
              >
                <Text style={{ fontSize: 11, color: '#D1D1D6' }} numberOfLines={1}>
                  🚐 {vehicleChip}
                </Text>
              </View>
            )}
          </View>
        )}

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
        <View style={{ flexDirection: 'row', gap: 18, marginBottom: !isUpcoming ? 12 : 0 }}>
          {[
            { label: primaryStatLabel, value: primaryStatValue },
            { label: 'Stops', value: `${totalStops}` },
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
      {isUpcoming && groups.length > 0 && (
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
          <Text style={{ fontSize: 12, color: LABEL, flex: 1 }} numberOfLines={1}>
            {(visitGroups[0] ?? groups[0])?.representative?.address_formatted ?? 'Route details pending'}
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
  const { assignedRoute, allRoutes, distanceUnit, isLoading, fetchMyRoutes, selectRoute } = useRouteStore();
  const authTemplate = useAuthStore((s) => s.jobTemplate);
  const [tab, setTab] = useState<RouteTab>('active');

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  // Current date label
  const today = new Date();
  const todayIso = localIsoDate(today);
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const sortChronological = (routes: AssignedRoute[]) =>
    [...routes].sort((a, b) => {
      const ta = firstStopTimestamp(a);
      const tb = firstStopTimestamp(b);
      if (ta !== tb) return ta.localeCompare(tb);
      if (a.leg === 'GO' && b.leg === 'RETURN') return -1;
      if (a.leg === 'RETURN' && b.leg === 'GO') return 1;
      return a.route_id - b.route_id;
    });

  // Split routes from allRoutes into active, upcoming, and done tabs
  const nonCompleted = allRoutes.filter((r) => r.assignment_status !== 'completed');
  const todayOpen = sortChronological(
    nonCompleted.filter(
      (r) =>
        r.assignment_status === 'in_progress' ||
        (r.scheduled_date && r.scheduled_date.slice(0, 10) === todayIso),
    ),
  );

  const currentActive =
    nonCompleted.find((r) => r.assignment_status === 'in_progress') ??
    nonCompleted.find((r) => r.assignment_status === 'acknowledged') ??
    nonCompleted.find((r) => r.assignment_status === 'pending') ??
    null;

  // Show all of today's open legs (e.g. GO + RETURN) under Active; fall back to currentActive if none are dated today
  const activeRoutes = todayOpen.length > 0 ? todayOpen : currentActive ? [currentActive] : [];
  const activeIdSet = new Set(activeRoutes.map((r) => r.route_id));
  const upcomingRoutes = sortChronological(nonCompleted.filter((r) => !activeIdSet.has(r.route_id)));
  const doneRoutes = allRoutes.filter((r) => r.assignment_status === 'completed');

  // Daily summary pills aggregate across all of today's routes (including completed morning legs)
  const todayAllRoutes = allRoutes.filter(
    (r) => r.scheduled_date && r.scheduled_date.slice(0, 10) === todayIso,
  );
  const summaryRoutes =
    todayAllRoutes.length > 0 ? todayAllRoutes : assignedRoute ? [assignedRoute] : [];

  const summaryJobStops = summaryRoutes.flatMap((r) => (r.stops ?? []).filter((s) => !!s.job));
  const summaryVisits = summaryRoutes.flatMap((r) =>
    groupRouteStops(r, r.job_template_type ?? authTemplate).filter(
      (g) => g.kind !== 'start' && g.kind !== 'end',
    ),
  );
  const totalJobCount = summaryJobStops.length;
  const completedJobCount = summaryJobStops.filter(
    (s) => getStopProgress(s) === 'completed',
  ).length;
  const driverScore =
    totalJobCount > 0 ? Math.round((completedJobCount / totalJobCount) * 100) : 0;

  const totalStops = summaryVisits.length;
  const completedCount = summaryVisits.filter(
    (g) => g.progress === 'completed' || g.progress === 'skipped',
  ).length;

  const distanceM = summaryRoutes.reduce((acc, r) => acc + (r.total_distance_meters ?? 0), 0);
  const distanceMi = formatDistance(distanceM, distanceUnit);

  const tabRoutes: Record<RouteTab, AssignedRoute[]> = {
    active: activeRoutes,
    upcoming: upcomingRoutes,
    done: doneRoutes,
  };
  const displayed = tabRoutes[tab];

  const openRouteDetail = (route: AssignedRoute) => {
    selectRoute(route.route_id);
    router.push({
      pathname: '/(home)/route-detail' as any,
      params: { routeId: String(route.route_id) },
    });
  };

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
                sub: distanceMi !== '—' ? ` ${distanceMi.split(' ')[1] ?? 'mi'}` : '',
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
              displayed.map((route) => (
                <RouteCard
                  key={route.route_id}
                  route={route}
                  tab={tab}
                  defaultTemplate={authTemplate}
                  onPress={() => openRouteDetail(route)}
                  onStart={() => openRouteDetail(route)}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
