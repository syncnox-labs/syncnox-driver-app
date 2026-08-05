import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useRouteStore } from '@/store/route.store';
import { formatDistance } from '@/utils/distance.utils';
import { isStopDone } from '../_components/homeScreen.utils';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = '#30D158';
const CARD = '#1C1C1E';
const LABEL = '#8E8E93';
const SEP = 'rgba(255,255,255,0.08)';

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

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(new Date(year, month, d));
  }
  return grid;
}

function isoOf(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return isoOf(a) === isoOf(b);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
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

function CalendarIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
      <Rect x="2" y="3" width="12" height="11" rx="2" stroke={G} strokeWidth="1.4" />
      <Path d="M2 6.5h12" stroke={G} strokeWidth="1" />
      <Path d="M5 1.5v3M11 1.5v3" stroke={G} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M2.5 4.5L6 8l3.5-3.5" stroke={LABEL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M1 1l12 12M13 1L1 13" stroke={LABEL} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Calendar Screen ──────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { assignedRoute, allRoutes, distanceUnit, fetchMyRoutes } = useRouteStore();
  const today = new Date();
  const [selected, setSelected] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  // Date Picker Modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

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

  const openPicker = () => {
    setPickerYear(selected.getFullYear());
    setPickerMonth(selected.getMonth());
    setPickerVisible(true);
  };

  const handleSelectDate = (d: Date) => {
    setSelected(d);
    setWeekAnchor(d);
    setPickerVisible(false);
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setSelected(now);
    setWeekAnchor(now);
    setPickerVisible(false);
  };

  // Map routes to dates for the calendar dot
  const routeDate = assignedRoute?.scheduled_date
    ? assignedRoute.scheduled_date.slice(0, 10)
    : isoOf(today);

  const hasRouteOnDay = (d: Date) => {
    const targetIso = isoOf(d);
    if (allRoutes && allRoutes.length > 0) {
      const foundInAll = allRoutes.some(
        (r) => r.scheduled_date && r.scheduled_date.slice(0, 10) === targetIso
      );
      if (foundInAll) return true;
    }
    return targetIso === routeDate && !!assignedRoute;
  };

  const monthHasRoute = (mIdx: number) => {
    if (allRoutes && allRoutes.length > 0) {
      return allRoutes.some((r) => {
        if (!r.scheduled_date) return false;
        const dt = new Date(r.scheduled_date);
        return dt.getFullYear() === pickerYear && dt.getMonth() === mIdx;
      });
    }
    if (assignedRoute?.scheduled_date) {
      const dt = new Date(assignedRoute.scheduled_date);
      return dt.getFullYear() === pickerYear && dt.getMonth() === mIdx;
    }
    return false;
  };

  // Stats for the week
  const weekHasRoute = week.some((d) => hasRouteOnDay(d));
  const totalStops = weekHasRoute ? (assignedRoute?.stops?.length ?? 0) : 0;
  const distanceM = weekHasRoute ? (assignedRoute?.total_distance_meters ?? 0) : 0;
  const distanceMi = formatDistance(distanceM, distanceUnit);

  // Routes for the selected day
  const selectedRoutes = (allRoutes ?? []).filter(
    (r) => r.scheduled_date && r.scheduled_date.slice(0, 10) === isoOf(selected)
  );
  if (selectedRoutes.length === 0 && assignedRoute && isoOf(selected) === routeDate) {
    selectedRoutes.push(assignedRoute);
  }

  const durSec = assignedRoute?.total_duration_seconds ?? 0;
  const durH = Math.floor(durSec / 3600);
  const durMin = Math.floor((durSec % 3600) / 60);
  const durationLabel = durSec > 0 ? `${durH}h ${durMin}m` : '';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 13, color: LABEL, marginBottom: 2 }}>Schedule</Text>
            <Text style={{ fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40 }}>
              Calendar
            </Text>
          </View>
          {!sameDay(selected, today) && (
            <TouchableOpacity
              onPress={handleJumpToToday}
              activeOpacity={0.75}
              style={{
                backgroundColor: 'rgba(48,209,88,0.15)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(48,209,88,0.3)',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: G }}>Jump to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Week Navigator ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          {/* Month + nav arrows + interactive picker button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <TouchableOpacity
              onPress={prevWeek}
              activeOpacity={0.7}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevLeft />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openPicker}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#1C1C1E',
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <CalendarIcon />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: -0.3 }}>{monthLabel}</Text>
              <ChevronDownIcon />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={nextWeek}
              activeOpacity={0.7}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }}
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
              : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
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
                const allStops = route.stops ?? [];
                const jobStops = allStops.filter((s: any) => !!s.job);
                const totalJobs = jobStops.length > 0 ? jobStops.length : allStops.length;
                const completedJobs = (jobStops.length > 0 ? jobStops : allStops).filter((s: any) => isStopDone(s)).length;
                const totalStops = allStops.length;
                const pct = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
                const routeName = route.name ?? `Route #${route.route_id}`;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() =>
                      router.push({
                        pathname: '/(home)/route-detail' as any,
                        params: { routeId: route.route_id },
                      })
                    }
                    activeOpacity={0.7}
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
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', flex: 1, flexShrink: 1 }} numberOfLines={1}>{routeName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                          {durationLabel ? (
                            <Text style={{ fontSize: 12, color: LABEL }}>⏱ {durationLabel}</Text>
                          ) : null}
                          <Text style={{ fontSize: 12, color: LABEL }}>{completedJobs}/{totalJobs} jobs ({totalStops} stops)</Text>
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── Fast Date Picker Modal ── */}
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: '#1C1C1E',
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setPickerVisible(false)}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CloseIcon />
                </TouchableOpacity>
              </View>

              {/* Year Navigation */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2C2C2E', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setPickerYear((y) => y - 1)}
                  style={{ padding: 6 }}
                >
                  <ChevLeft />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: '700', color: G, letterSpacing: -0.3 }}>{pickerYear}</Text>
                <TouchableOpacity
                  onPress={() => setPickerYear((y) => y + 1)}
                  style={{ padding: 6 }}
                >
                  <ChevRight />
                </TouchableOpacity>
              </View>

              {/* Months Grid (12 Months) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {MONTHS.map((m, idx) => {
                  const isCur = idx === pickerMonth;
                  const hasMonthRoute = monthHasRoute(idx);
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setPickerMonth(idx)}
                      style={{
                        width: '23%',
                        paddingVertical: 6,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCur ? G : 'rgba(255,255,255,0.05)',
                        position: 'relative',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: isCur ? '#000' : '#fff' }}>
                        {m.slice(0, 3)}
                      </Text>
                      {hasMonthRoute && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 4,
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: isCur ? '#000' : G,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Days Header */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {DAYS.map((d, idx) => (
                  <Text key={idx} style={{ width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600', color: LABEL }}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Month Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {getMonthGrid(pickerYear, pickerMonth).map((d, idx) => {
                  if (!d) {
                    return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 44 }} />;
                  }
                  const isSel = sameDay(d, selected);
                  const isTod = sameDay(d, today);
                  const hasDot = hasRouteOnDay(d);
                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      onPress={() => handleSelectDate(d)}
                      style={{
                        width: '14.28%',
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSel ? G : 'transparent',
                          borderWidth: isTod && !isSel ? 1.5 : 0,
                          borderColor: G,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isSel || isTod ? '700' : '500',
                            color: isSel ? '#000' : isTod ? G : '#fff',
                          }}
                        >
                          {d.getDate()}
                        </Text>
                      </View>
                      {/* Green dot indicator for route */}
                      <View style={{ height: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        {hasDot && (
                          <View
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: isSel ? '#000' : G,
                            }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Route Indicator Legend */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: G }} />
                <Text style={{ fontSize: 11, color: LABEL }}>Date with scheduled route</Text>
              </View>

              {/* Quick Actions */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: SEP }}>
                <TouchableOpacity
                  onPress={handleJumpToToday}
                  style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(48,209,88,0.12)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: G }}>Jump to Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPickerVisible(false)}
                  style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
