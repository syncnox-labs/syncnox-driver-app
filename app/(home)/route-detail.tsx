import React, { useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { useRouteStore } from '@/store/route.store';
import { useAuthStore } from '@/store/auth.store';
import { formatDistance } from '@/utils/distance.utils';
import { JobTemplateType, RouteStop } from '@/types/route.types';
import {
  GroupedRouteStop,
  formatWaiting,
  getDoneLabel,
  getFailLabel,
  getGroupPassengers,
  getKindLabel,
  groupRouteStops,
  isStopFinished,
} from '@/utils/shuttleRoute.utils';
import { formatTime } from './_components/homeScreen.utils';

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
const PROGRESS_COLOR = {
  pending: LABEL,
  partial: AMBER,
  completed: G,
  failed: RED,
  skipped: LABEL,
} as const;

const PROGRESS_BG = {
  pending: '#2C2C2E',
  partial: 'rgba(255,159,10,0.12)',
  completed: 'rgba(48,209,88,0.12)',
  failed: 'rgba(255,69,58,0.12)',
  skipped: '#2C2C2E',
} as const;

// ─── Waiting banner (scheduled wait between two stops) ────────────────────────
function WaitingBanner({ stop }: { stop: RouteStop }) {
  const label = formatWaiting(stop.waiting_time_to_next_stop_seconds);
  if (!label) return null;
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 16, backgroundColor: 'rgba(255,159,10,0.08)' }}>
      <Text style={{ fontSize: 12, color: AMBER, fontWeight: '600' }}>
        ⏱ Wait {label} {stop.waiting_position === 'right' ? 'at the next stop' : 'here before leaving'}
      </Text>
    </View>
  );
}

// ─── Start / End terminal row (not an actionable job) ─────────────────────────
function TerminalRow({
  group,
  isLast,
  onNavigate,
}: {
  group: GroupedRouteStop;
  isLast: boolean;
  onNavigate: () => void;
}) {
  const stop = group.representative;
  const address = stop.address_formatted || '';
  const time = stop.planned_arrival_time ? formatTime(stop.planned_arrival_time) : '';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: SEP,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#2C2C2E',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: LABEL }}>{group.kind === 'start' ? '⚑' : '⚐'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
          {group.kind === 'start' ? 'Start' : 'End'}
          {time ? `  ·  ${time}` : ''}
        </Text>
        {!!address && (
          <Text style={{ fontSize: 12, color: LABEL, marginTop: 2 }} numberOfLines={1}>
            {address}
          </Text>
        )}
      </View>
      {(!!stop.location || !!address) && (
        <TouchableOpacity onPress={onNavigate} activeOpacity={0.7} hitSlop={8}>
          <NavIcon color={G} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Stop group row (one physical visit; many passengers may share it) ────────
function GroupRow({
  group,
  template,
  isLast,
  onPress,
}: {
  group: GroupedRouteStop;
  template?: JobTemplateType | null;
  isLast: boolean;
  onPress: () => void;
}) {
  const shuttle = template === 'worker_shuttle';
  const rep = group.representative;
  const progress = group.progress;
  const color = PROGRESS_COLOR[progress];
  const address = rep.address_formatted || rep.job?.address_formatted || '';
  const eta = rep.planned_arrival_time ? formatTime(rep.planned_arrival_time) : '';
  const kindLabel = getKindLabel(group.kind, template);
  const doneLabel = getDoneLabel(group.kind, template);
  const failLabel = getFailLabel(group.kind, template);

  const passengers = shuttle ? getGroupPassengers(group) : [];
  const single = [rep.job?.first_name, rep.job?.last_name].filter(Boolean).join(' ') || rep.job?.business_name;
  const title = shuttle
    ? passengers.length > 1
      ? `${kindLabel} · ${passengers.length} passengers`
      : `${kindLabel} · ${passengers[0]?.name ?? 'Passenger'}`
    : single || `Stop #${group.displayNumber ?? ''}`;
  const preview =
    shuttle && passengers.length > 1
      ? passengers.slice(0, 2).map((p) => p.name).join(', ') +
        (passengers.length > 2 ? ` +${passengers.length - 2} more` : '')
      : address;

  const completedAt = rep.job?.completed_at || rep.actual_departure_time;
  const statusText =
    progress === 'pending'
      ? 'Pending'
      : progress === 'partial'
        ? `${group.finishedCount}/${group.stops.length} done`
        : progress === 'completed'
          ? `${shuttle ? doneLabel : 'Delivered'}${completedAt ? ` at ${formatTime(completedAt)}` : ''}`
          : progress === 'skipped'
            ? 'Skipped'
            : failLabel;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
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
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: PROGRESS_BG[progress],
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {progress === 'completed' ? (
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M2.5 7L5.5 10L11.5 4" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : progress === 'failed' || progress === 'skipped' ? (
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M4 4L10 10M10 4L4 10" stroke={progress === 'failed' ? RED : LABEL} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '600', color: progress === 'partial' ? AMBER : LABEL, fontFamily: 'monospace' }}>
            {group.displayNumber ?? ''}
          </Text>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: progress === 'failed' ? '#666' : '#fff', flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color, flexShrink: 0, marginLeft: 8 }}>{statusText}</Text>
        </View>
        <Text style={{ fontSize: 13, color: LABEL }} numberOfLines={1}>{preview}</Text>
        {shuttle && passengers.length > 1 && !!address && (
          <Text style={{ fontSize: 12, color: LABEL, marginTop: 2 }} numberOfLines={1}>{address}</Text>
        )}
        {!!eta && <Text style={{ fontSize: 12, color: LABEL, marginTop: 4 }}>⏱ {eta}</Text>}
      </View>

      <ChevronRight />
    </TouchableOpacity>
  );
}

// ─── Route Detail Screen ──────────────────────────────────────────────────────
export default function RouteDetailScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { assignedRoute, allRoutes, distanceUnit, startRoute, selectRoute } = useRouteStore();
  const authTemplate = useAuthStore((s) => s.jobTemplate);
  const [isStarting, setIsStarting] = useState(false);

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

  const template: JobTemplateType | null = route.job_template_type ?? authTemplate;
  const shuttle = template === 'worker_shuttle';
  const allStops = route.stops ?? [];
  const groups = groupRouteStops(route, template);
  const visitGroups = groups.filter((g) => g.kind !== 'start' && g.kind !== 'end');
  const jobStops = allStops.filter((s) => !!s.job);
  const totalJobs = jobStops.length > 0 ? jobStops.length : allStops.length;
  const completedJobs = (jobStops.length > 0 ? jobStops : allStops).filter(isStopFinished).length;
  const totalStops = visitGroups.length;
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  // Next visit to navigate to: the first group with anything still pending
  const nextGroup = visitGroups.find((g) => g.progress === 'pending' || g.progress === 'partial');
  const nextStop = nextGroup?.representative;
  const canStart = shuttle && (route.assignment_status === 'pending' || route.assignment_status === 'acknowledged');

  async function handleStart() {
    setIsStarting(true);
    try {
      await startRoute(route!.route_id);
    } catch {
      Alert.alert('Error', 'Could not start the route. Please try again.');
    } finally {
      setIsStarting(false);
    }
  }

  function openStop(group: GroupedRouteStop) {
    router.push({
      pathname: '/(home)/stop-detail',
      params: {
        stopId: group.representative.id,
        routeId: route!.route_id,
        groupStopIds: group.stops.map((s) => s.id).join(','),
      },
    });
  }

  function openOnMap() {
    selectRoute(route!.route_id);
    router.push('/(home)/(tabs)/map' as any);
  }

  // Distance & time
  const distanceM = route.total_distance_meters ?? 0;
  const distanceMi = formatDistance(distanceM, distanceUnit, true);
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
              {(route.leg || route.is_team_leader || route.vehicle) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {(route.leg === 'GO' || route.leg === 'RETURN') && (
                    <View style={{ backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: G }}>{route.leg}</Text>
                    </View>
                  )}
                  {route.is_team_leader && (
                    <View style={{ backgroundColor: 'rgba(10,132,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0A84FF' }}>Team Leader</Text>
                    </View>
                  )}
                  {!!route.vehicle && (
                    <Text style={{ fontSize: 11, color: LABEL, alignSelf: 'center' }} numberOfLines={1}>
                      {[route.vehicle.name, route.vehicle.license_plate, route.vehicle.capacity ? `${route.vehicle.capacity} seats` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={openOnMap}
              activeOpacity={0.7}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2C2C2E' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: G }}>Map</Text>
            </TouchableOpacity>
            {isLive && (
              <View style={{ backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: G }}>Live</Text>
              </View>
            )}
          </View>

          {/* ── Stats grid ── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: shuttle ? 'Done' : 'Jobs', value: `${completedJobs}/${totalJobs}` },
              { label: shuttle ? 'Stops' : 'Total Stops', value: `${totalStops}` },
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

          {/* ── Start route (shuttle): auto check-in for a team leader ── */}
          {canStart && (
            <TouchableOpacity
              onPress={handleStart}
              disabled={isStarting}
              activeOpacity={0.85}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: G,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                opacity: isStarting ? 0.6 : 1,
              }}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#000' }}>Start route</Text>
              )}
            </TouchableOpacity>
          )}

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
                Navigate to Stop #{nextGroup?.displayNumber ?? '?'}
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
            {groups.map((group, i) => (
              <View key={group.key}>
                {group.kind === 'start' || group.kind === 'end' ? (
                  <TerminalRow
                    group={group}
                    isLast={i === groups.length - 1}
                    onNavigate={() => handleNavigateTo(group.representative)}
                  />
                ) : (
                  <GroupRow
                    group={group}
                    template={template}
                    isLast={i === groups.length - 1}
                    onPress={() => openStop(group)}
                  />
                )}
                {i < groups.length - 1 && <WaitingBanner stop={group.stops[group.stops.length - 1]} />}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
