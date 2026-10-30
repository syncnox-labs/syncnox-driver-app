import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '@/store/auth.store';
import { useRouteStore } from '@/store/route.store';
import { AssignedRoute, JobTemplateType, RouteStop, StopProgress } from '@/types/route.types';
import {
  getDoneLabel,
  getFailLabel,
  getRouteLegLabel,
  getStopKind,
  getStopPassenger,
  getStopProgress,
  isStopFinished,
  StopKind,
} from '@/utils/shuttleRoute.utils';
import { formatTime } from '../_components/homeScreen.utils';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const AMBER = '#FF9F0A';
const RED = '#FF453A';
const BLUE = '#0A84FF';

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function statusColor(status: StopProgress): string {
  if (status === 'completed') return G;
  if (status === 'failed') return RED;
  if (status === 'skipped') return LABEL;
  return AMBER;
}

function statusLabel(status: StopProgress, kind: StopKind, template?: JobTemplateType | null): string {
  if (status === 'completed') return getDoneLabel(kind, template);
  if (status === 'failed') return getFailLabel(kind, template);
  if (status === 'skipped') return 'Skipped';
  return 'Pending';
}

interface TimelineItem {
  route: AssignedRoute;
  stop: RouteStop;
}

export default function TimelineScreen() {
  const { assignedRoute, allRoutes, fetchMyRoutes, selectRoute } = useRouteStore();
  const authTemplate = useAuthStore((s) => s.jobTemplate);

  useEffect(() => {
    if (allRoutes.length === 0) {
      fetchMyRoutes();
    }
  }, []);

  const today = new Date();
  const todayIso = localIsoDate(today);
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const todayRoutes = allRoutes.filter(
    (r) => r.scheduled_date && r.scheduled_date.slice(0, 10) === todayIso,
  );
  const sourceRoutes =
    todayRoutes.length > 0
      ? todayRoutes
      : assignedRoute
        ? [assignedRoute]
        : allRoutes.slice(0, 1);

  const isShuttle =
    sourceRoutes.some((r) => r.job_template_type === 'worker_shuttle') ||
    authTemplate === 'worker_shuttle';

  const allItems: TimelineItem[] = sourceRoutes.flatMap((route) =>
    (route.stops ?? []).filter((s) => !!s.job).map((stop) => ({ route, stop })),
  );

  const doneItems = allItems
    .filter(({ stop }) => isStopFinished(stop))
    .sort((a, b) => {
      const aTime = a.stop.actual_departure_time || a.stop.actual_arrival_time || a.stop.job?.completed_at || '';
      const bTime = b.stop.actual_departure_time || b.stop.actual_arrival_time || b.stop.job?.completed_at || '';
      return bTime.localeCompare(aTime);
    });

  const totalStops = allItems.length;
  const completedCount = doneItems.filter(({ stop }) => getStopProgress(stop) === 'completed').length;
  const failedCount = doneItems.filter(({ stop }) => getStopProgress(stop) === 'failed').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>{dateLabel}</Text>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40 }}>
            Timeline
          </Text>
        </View>

        {/* ── Summary row ── */}
        {doneItems.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
            {[
              { label: 'Completed', value: `${completedCount}`, color: G },
              { label: isShuttle ? 'No-shows' : 'Failed', value: `${failedCount}`, color: failedCount > 0 ? RED : LABEL },
              { label: 'Remaining', value: `${Math.max(0, totalStops - doneItems.length)}`, color: '#fff' },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 10, color: LABEL, marginBottom: 4 }}>{s.label}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: s.color, letterSpacing: -0.5 }}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Timeline list ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {doneItems.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 17, color: LABEL, marginBottom: 6 }}>
                {isShuttle ? 'No activity yet' : 'No deliveries yet'}
              </Text>
              <Text style={{ fontSize: 13, color: '#3A3A3C', textAlign: 'center' }}>
                {isShuttle
                  ? 'Passenger boardings and drop-offs will appear here as you progress through your trips.'
                  : 'Completed stops will appear here as you progress through your route.'}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
              {doneItems.map(({ route, stop }, i) => {
                const tpl = route.job_template_type ?? authTemplate ?? 'pickup_delivery_job';
                const kind = getStopKind(stop, tpl);
                const status = getStopProgress(stop);
                const sColor = statusColor(status);
                const sLabel = statusLabel(status, kind, tpl);
                const isLast = i === doneItems.length - 1;
                const legLabel = getRouteLegLabel(route);

                const name =
                  tpl === 'worker_shuttle'
                    ? getStopPassenger(stop).name
                    : [stop.job?.first_name, stop.job?.last_name].filter(Boolean).join(' ') ||
                      stop.job?.business_name ||
                      `Stop #${stop.sequence_order ?? i + 1}`;

                const address = stop.address_formatted || stop.job?.address_formatted || '';
                const completedTime = stop.actual_departure_time || stop.job?.completed_at;
                const timeStr = completedTime
                  ? formatTime(completedTime)
                  : stop.actual_arrival_time
                    ? formatTime(stop.actual_arrival_time)
                    : '';

                return (
                  <TouchableOpacity
                    key={`${route.route_id}-${stop.id}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      selectRoute(route.route_id);
                      router.push({
                        pathname: '/(home)/stop-detail',
                        params: { stopId: String(stop.id), routeId: String(route.route_id) },
                      });
                    }}
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
                    {/* Status dot */}
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: sColor,
                        flexShrink: 0,
                      }}
                    />

                    {/* Content */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '600', color: '#fff', flexShrink: 1 }}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        {legLabel && (
                          <View
                            style={{
                              backgroundColor: legLabel === 'GO' ? 'rgba(48,209,88,0.14)' : 'rgba(10,132,255,0.16)',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: legLabel === 'GO' ? G : BLUE }}>
                              {legLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        {timeStr ? (
                          <Text style={{ fontSize: 13, color: LABEL }}>
                            {timeStr}
                          </Text>
                        ) : null}
                        {address ? (
                          <Text style={{ fontSize: 13, color: '#3A3A3C', flex: 1 }} numberOfLines={1}>
                            · {address}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Status badge + chevron */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: sColor,
                        }}
                      >
                        {sLabel}
                      </Text>
                      <ChevronRight />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Summary footer */}
          {doneItems.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 13, color: LABEL }}>
                {doneItems.length} {isShuttle ? 'actions' : 'stops'} · {completedCount} {isShuttle ? 'completed' : 'delivered'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: doneItems.length === totalStops ? G : completedCount > 0 ? AMBER : LABEL,
                }}
              >
                {totalStops > 0 ? `${Math.round((doneItems.length / totalStops) * 100)}% complete` : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
