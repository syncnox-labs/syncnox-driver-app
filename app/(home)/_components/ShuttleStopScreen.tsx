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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '@/components/ui/GradientBackground';
import NavigateButton from '@/components/ui/NavigateButton';
import { useRouteStore } from '@/store/route.store';
import { AssignedRoute, RouteStop, StopProgress } from '@/types/route.types';
import {
  formatWaiting,
  getDoneLabel,
  getFailLabel,
  getKindLabel,
  getStopKind,
  getStopPassenger,
  StopPassenger,
} from '@/utils/shuttleRoute.utils';
import { formatTime } from './homeScreen.utils';

type Choice = 'completed' | 'failed' | 'pending';

const COLORS = {
  completed: '#30D158',
  failed: '#FF453A',
  pending: '#FF9F0A',
  skipped: '#8E8E93',
};

interface Props {
  route: AssignedRoute;
  /** Every raw stop at this physical location (one per passenger). */
  stops: RouteStop[];
}

/**
 * Worker-shuttle stop screen: a manifest of everyone boarding / alighting at this location.
 * Pending passengers default to "ready to confirm"; the driver flips individual no-shows,
 * and can change any passenger's status again later (undo).
 */
export default function ShuttleStopScreen({ route, stops }: Props) {
  const updateBatchStopStatus = useRouteStore((s) => s.updateBatchStopStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const first = stops[0];
  const kind = getStopKind(first, 'worker_shuttle');
  const isPickup = kind !== 'dropoff';
  const kindLabel = getKindLabel(kind, 'worker_shuttle');
  const doneLabel = getDoneLabel(kind, 'worker_shuttle');
  const failLabel = isPickup ? getFailLabel(kind, 'worker_shuttle') : 'Issue';
  const address = first.address_formatted || first.job?.address_formatted;
  const waiting = formatWaiting(first.waiting_time_to_next_stop_seconds);

  const passengers = useMemo(() => stops.filter((s) => !!s.job).map(getStopPassenger), [stops]);

  const [draft, setDraft] = useState<Record<number, Choice>>(() => {
    const init: Record<number, Choice> = {};
    for (const p of passengers) {
      init[p.stopId] = p.progress === 'pending' || p.progress === 'skipped' ? 'completed' : p.progress;
    }
    return init;
  });

  const changes = passengers.filter((p) => {
    if (p.progress === 'skipped') return false;
    const choice = draft[p.stopId];
    return choice !== (p.progress as StopProgress) && !(p.progress === 'pending' && choice === 'pending');
  });
  const counts = {
    completed: passengers.filter((p) => p.progress !== 'skipped' && draft[p.stopId] === 'completed').length,
    failed: passengers.filter((p) => p.progress !== 'skipped' && draft[p.stopId] === 'failed').length,
    pending: passengers.filter((p) => p.progress !== 'skipped' && draft[p.stopId] === 'pending').length,
  };

  async function handleConfirm() {
    if (changes.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateBatchStopStatus(
        route.route_id,
        changes.map((p) => ({ stopId: p.stopId, status: draft[p.stopId], noShowScope: 'this_leg' })),
      );
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNavigate() {
    const lat = first.location?.lat;
    const lng = first.location?.lng;
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}`,
        default: `google.navigation:q=${lat},${lng}`,
      });
      Linking.openURL(url!).catch(() =>
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
      );
    } else if (address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`).catch(() =>
        Alert.alert('Error', 'Could not open maps application.'),
      );
    }
  }

  const choiceLabel = (c: Choice) => (c === 'completed' ? doneLabel : c === 'failed' ? failLabel : 'Pending');

  function PassengerRow({ p, isLast }: { p: StopPassenger; isLast: boolean }) {
    const skipped = p.progress === 'skipped';
    const choice = draft[p.stopId];
    return (
      <View
        style={{
          paddingVertical: 12,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
              {p.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {p.isTeamLeader && (
                <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '700' }}>Team Leader (You)</Text>
              )}
              {!!p.candidateId && (
                <Text style={{ color: '#8E8E93', fontSize: 11 }}>ID {p.candidateId}</Text>
              )}
              {!!p.pickupTime && (
                <Text style={{ color: '#8E8E93', fontSize: 11 }}>{formatTime(p.pickupTime)}</Text>
              )}
            </View>
          </View>
          {!!p.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(59,130,246,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={16} color="#60A5FA" />
            </TouchableOpacity>
          )}
        </View>

        {skipped ? (
          <Text style={{ color: COLORS.skipped, fontSize: 12, marginTop: 8 }}>
            Skipped — passenger did not board
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['completed', 'failed', 'pending'] as Choice[]).map((c) => {
              const active = choice === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setDraft((d) => ({ ...d, [p.stopId]: c }))}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: active ? COLORS[c] : 'rgba(255,255,255,0.08)',
                    backgroundColor: active ? `${COLORS[c]}22` : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? COLORS[c] : '#8E8E93', fontSize: 12, fontWeight: '700' }}>
                    {choiceLabel(c)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  const confirmLabel =
    changes.length === 0
      ? 'No changes'
      : isPickup
        ? `Confirm Boarding (${counts.completed} boarded${counts.failed ? `, ${counts.failed} no-show` : ''})`
        : `Confirm Drop-off (${counts.completed} dropped off${counts.failed ? `, ${counts.failed} issue` : ''})`;

  return (
    <GradientBackground isBlack>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#30D158" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{kindLabel}</Text>
            <Text style={{ color: '#8E8E93', fontSize: 12 }} numberOfLines={1}>
              {route.leg ? `${route.leg} • ` : ''}
              {route.name ?? `Route #${route.route_id}`}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View
            style={{
              margin: 16,
              backgroundColor: '#1C1C1E',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(48,209,88,0.1)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                {passengers.length} {passengers.length === 1 ? 'passenger' : 'passengers'}
              </Text>
              {!!first.planned_arrival_time && (
                <Text style={{ color: '#30D158', fontSize: 14, fontWeight: '700' }}>
                  {formatTime(first.planned_arrival_time)}
                </Text>
              )}
            </View>
            {!!address && (
              <Text style={{ color: '#E5ECE9', fontSize: 14, lineHeight: 20, marginTop: 8 }}>{address}</Text>
            )}
            {!!waiting && (
              <Text style={{ color: '#FF9F0A', fontSize: 12, fontWeight: '600', marginTop: 8 }}>
                ⏱ Scheduled wait: {waiting} (
                {first.waiting_position === 'right' ? 'at the next stop' : 'at this stop'})
              </Text>
            )}
            <NavigateButton onPress={handleNavigate} style={{ marginTop: 14 }} />
          </View>

          <View style={{ marginHorizontal: 16 }}>
            <Text
              style={{
                color: 'rgba(229,236,233,0.35)',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.5,
                marginBottom: 10,
              }}
            >
              PASSENGERS ({counts.completed} {doneLabel.toUpperCase()} · {counts.failed} {failLabel.toUpperCase()} ·{' '}
              {counts.pending} PENDING)
            </Text>
            <View
              style={{
                backgroundColor: '#1C1C1E',
                borderRadius: 16,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              {passengers.map((p, i) => (
                <PassengerRow key={p.stopId} p={p} isLast={i === passengers.length - 1} />
              ))}
            </View>
          </View>

          {passengers.some((p) => !!p.notes) && (
            <View style={{ marginHorizontal: 16, marginTop: 16 }}>
              <Text style={{ color: 'rgba(229,236,233,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 }}>
                NOTES
              </Text>
              <View style={{ backgroundColor: '#1C1C1E', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                {passengers.filter((p) => !!p.notes).map((p) => (
                  <Text key={p.stopId} style={{ color: 'rgba(229,236,233,0.7)', fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
                    {p.name}: {p.notes}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isSubmitting || changes.length === 0}
            activeOpacity={0.8}
            style={{
              marginHorizontal: 16,
              marginTop: 24,
              paddingVertical: 15,
              borderRadius: 14,
              alignItems: 'center',
              backgroundColor: changes.length === 0 ? 'rgba(255,255,255,0.06)' : '#30D158',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text
                style={{
                  color: changes.length === 0 ? '#8E8E93' : '#000',
                  fontSize: 15,
                  fontWeight: '800',
                }}
              >
                {confirmLabel}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

