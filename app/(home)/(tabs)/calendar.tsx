import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useRouteStore } from '@/store/route.store';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';
const BLUE = '#0A84FF';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

function isoOf(d: Date) {
  return d.toISOString().slice(0, 10);
}

function sameDay(a: Date, b: Date) {
  return isoOf(a) === isoOf(b);
}

// ─── Chevron Icons ────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M10 12L6 8l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Calendar Screen ──────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { assignedRoute } = useRouteStore();
  const today = new Date();
  const [selected, setSelected] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);

  const week = getWeekDates(weekAnchor);
  const monthLabel = `${MONTHS[week[0].getMonth()]} ${week[0].getFullYear()}`;

  const prevWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
  };
  const nextWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
  };

  // Map the assigned route to a date for the calendar dot
  const routeDate = assignedRoute?.scheduled_date
    ? assignedRoute.scheduled_date.slice(0, 10)
    : isoOf(today);

  const hasRouteOnDay = (d: Date) => isoOf(d) === routeDate;

  // Stats for the week
  const weekHasRoute = week.some((d) => hasRouteOnDay(d));
  const totalStops = weekHasRoute ? (assignedRoute?.stops?.length ?? 0) : 0;
  const distanceM = weekHasRoute ? (assignedRoute?.total_distance_meters ?? 0) : 0;
  const distanceMi = distanceM > 0 ? `${(distanceM / 1609.34).toFixed(1)} mi` : '0.0 mi';

  // Routes for the selected day
  const selectedRoutes =
    assignedRoute && isoOf(selected) === routeDate ? [assignedRoute] : [];

  const durSec = assignedRoute?.total_duration_seconds ?? 0;
  const durH = Math.floor(durSec / 3600);
  const durMin = Math.floor((durSec % 3600) / 60);
  const durationLabel = durSec > 0 ? `${durH}h ${durMin}m` : '';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>Schedule</Text>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40, marginBottom: 16 }}>
            Calendar
          </Text>
        </View>

        {/* ── Week navigator ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          {/* Month + nav arrows */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <TouchableOpacity
              onPress={prevWeek}
              activeOpacity={0.7}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevLeft />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: -0.3 }}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={nextWeek}
              activeOpacity={0.7}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevRight />
            </TouchableOpacity>
          </View>

          {/* Day strip */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
            {week.map((d, i) => {
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const hasDot = hasRouteOnDay(d);

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelected(d)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    paddingVertical: 9,
                    paddingHorizontal: 4,
                    borderRadius: 14,
                    backgroundColor: isSelected ? G : isToday ? 'rgba(48,209,88,0.08)' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '500', color: isSelected ? 'rgba(0,0,0,0.6)' : LABEL }}>
                    {DAYS[d.getDay()]}
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: isSelected ? '#000' : isToday ? G : '#fff', letterSpacing: -0.3 }}>
                    {d.getDate()}
                  </Text>
                  {/* Route dot */}
                  <View style={{ height: 5, alignItems: 'center', justifyContent: 'center' }}>
                    {hasDot && (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: isSelected ? 'rgba(0,0,0,0.4)' : G,
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Week summary strip */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Routes this week', value: weekHasRoute ? '1' : '0' },
              { label: 'Total stops', value: `${totalStops}` },
              { label: 'Total distance', value: distanceMi },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 10, color: LABEL, marginBottom: 3, lineHeight: 14 }}>{s.label}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'monospace', letterSpacing: -0.3 }}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Day separator ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: sameDay(selected, today) ? G : '#fff' }}>
            {sameDay(selected, today)
              ? 'Today'
              : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            {'  '}
            <Text style={{ fontSize: 13, fontWeight: '400', color: LABEL }}>
              · {selectedRoutes.length} route{selectedRoutes.length !== 1 ? 's' : ''}
            </Text>
          </Text>
        </View>

        {/* ── Routes for selected day ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {selectedRoutes.length === 0 ? (
            <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, color: LABEL, marginBottom: 6 }}>No routes scheduled</Text>
              <Text style={{ fontSize: 14, color: '#3A3A3C' }}>Free day</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden' }}>
              {selectedRoutes.map((route, i) => {
                const routeStops = route.stops?.length ?? 0;
                const completedCount = route.stops?.filter((s: any) => {
                  const status = s.job?.status;
                  return status === 'completed' || status === 'failed';
                }).length ?? 0;
                const pct = routeStops > 0 ? (completedCount / routeStops) * 100 : 0;
                const routeName = route.name ?? `Route #${route.route_id}`;

                return (
                  <View
                    key={i}
                    style={{
                      padding: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: i < selectedRoutes.length - 1 ? 1 : 0,
                      borderBottomColor: SEP,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {/* Color stripe */}
                      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, backgroundColor: G, flexShrink: 0 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{routeName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                          {durationLabel ? (
                            <Text style={{ fontSize: 12, color: LABEL }}>⏱ {durationLabel}</Text>
                          ) : null}
                          <Text style={{ fontSize: 12, color: LABEL }}>📍 {routeStops} stops</Text>
                        </View>
                        {/* Progress bar */}
                        <View style={{ height: 2, backgroundColor: '#2C2C2E', borderRadius: 99 }}>
                          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: G, borderRadius: 99 }} />
                        </View>
                        <View style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: G, backgroundColor: 'rgba(48,209,88,0.1)', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' }}>
                            {route.assignment_status === 'in_progress' ? 'In Progress' : 'Active'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
