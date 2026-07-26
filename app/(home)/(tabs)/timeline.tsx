import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouteStore } from '@/store/route.store';
import { getStopStatus, isStopDone, formatTime } from '../_components/homeScreen.utils';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const AMBER = '#FF9F0A';
const RED = '#FF453A';

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#3A3A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function statusColor(status: string): string {
  if (status === 'completed') return G;
  if (status === 'failed') return RED;
  if (status === 'pending') return AMBER;
  return LABEL;
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Delivered';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending';
  return 'Unknown';
}

export default function TimelineScreen() {
  const { assignedRoute } = useRouteStore();

  const allStops = assignedRoute?.stops ?? [];
  const doneStops = allStops
    .filter(isStopDone)
    .sort((a, b) => {
      const aTime = a.actual_departure_time || a.actual_arrival_time || '';
      const bTime = b.actual_departure_time || b.actual_arrival_time || '';
      return bTime.localeCompare(aTime);
    });

  const totalStops = allStops.length;
  const completedCount = doneStops.filter((s) => getStopStatus(s) === 'completed').length;
  const failedCount = doneStops.filter((s) => getStopStatus(s) === 'failed').length;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
        {doneStops.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
            {[
              { label: 'Completed', value: `${completedCount}`, color: G },
              { label: 'Failed', value: `${failedCount}`, color: failedCount > 0 ? RED : LABEL },
              { label: 'Remaining', value: `${totalStops - doneStops.length}`, color: '#fff' },
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
          {doneStops.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 17, color: LABEL, marginBottom: 6 }}>No deliveries yet</Text>
              <Text style={{ fontSize: 13, color: '#3A3A3C', textAlign: 'center' }}>
                Completed stops will appear here as you progress through your route.
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
              {doneStops.map((stop, i) => {
                const status = getStopStatus(stop);
                const sColor = statusColor(status);
                const sLabel = statusLabel(status);
                const isLast = i === doneStops.length - 1;

                const name =
                  [stop.job?.first_name, stop.job?.last_name].filter(Boolean).join(' ') ||
                  stop.job?.business_name ||
                  `Stop #${stop.sequence_order ?? i + 1}`;

                const address = stop.address_formatted || stop.job?.address_formatted || '';
                const timeStr = stop.actual_departure_time
                  ? formatTime(stop.actual_departure_time)
                  : stop.actual_arrival_time
                  ? formatTime(stop.actual_arrival_time)
                  : '';

                return (
                  <TouchableOpacity
                    key={stop.id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({ pathname: '/(home)/stop-detail', params: { stopId: stop.id } })
                    }
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
                      <Text
                        style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        {timeStr ? (
                          <Text style={{ fontSize: 13, color: LABEL }}>
                            {timeStr}
                          </Text>
                        ) : null}
                        {address ? (
                          <Text style={{ fontSize: 13, color: '#3A3A3C' }} numberOfLines={1}>
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
          {doneStops.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 13, color: LABEL }}>
                {doneStops.length} stops · {completedCount} delivered
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: completedCount === totalStops ? G : completedCount > 0 ? AMBER : LABEL,
                }}
              >
                {totalStops > 0 ? `${Math.round((completedCount / totalStops) * 100)}% complete` : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
