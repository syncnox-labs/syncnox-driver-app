import { openNavigation } from '@/utils/navigation';
import { Alert } from '@/utils/alert';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import GradientBackground from '@/components/ui/GradientBackground';
import NavigateButton, { NavigationIcon } from '@/components/ui/NavigateButton';
import { useRouteStore, findStopInRoutes } from '@/store/route.store';
import { useAuthStore } from '@/store/auth.store';
import { RouteStop } from '@/types/route.types';
import { getStopKind } from '@/utils/shuttleRoute.utils';
import ShuttleStopScreen from './_components/ShuttleStopScreen';

import {
  formatTime,
  getJobTypeLabel,
  getStopStatus,
} from './_components/homeScreen.utils';

// ─────────────────────────────────────────────────────────────── //
// Status configuration
// ─────────────────────────────────────────────────────────────── //

const STATUS_CONFIG = {
  completed: {
    color: '#30D158',
    bg: 'rgba(48,209,88,0.1)',
    border: 'rgba(48,209,88,0.25)',
    label: 'Completed',
    icon: 'checkmark-circle' as const,
  },
  failed: {
    color: '#FF453A',
    bg: 'rgba(255,69,58,0.1)',
    border: 'rgba(255,69,58,0.25)',
    label: 'Failed',
    icon: 'close-circle' as const,
  },
  pending: {
    color: '#FF9F0A',
    bg: 'rgba(255,159,10,0.1)',
    border: 'rgba(255,159,10,0.25)',
    label: 'Pending',
    icon: 'time' as const,
  },
};

// ─────────────────────────────────────────────────────────────── //
// Section Header
// ─────────────────────────────────────────────────────────────── //

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: 'rgba(229,236,233,0.35)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      {title}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────── //
// Info Row
// ─────────────────────────────────────────────────────────────── //

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: 'rgba(48,209,88,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={15} color="rgba(48,209,88,0.5)" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ color: valueColor || '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 20 }}>
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={14} color="rgba(48,209,88,0.4)" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─────────────────────────────────────────────────────────────── //
// Main Screen
// ─────────────────────────────────────────────────────────────── //

export default function StopDetailScreen() {
  const { stopId, routeId, groupStopIds } = useLocalSearchParams<{
    stopId: string;
    routeId?: string;
    groupStopIds?: string;
  }>();
  const { allRoutes, updateStopStatus } = useRouteStore();
  const jobTemplate = useAuthStore((s) => s.jobTemplate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Look the stop up across ALL routes so GO / RETURN / upcoming trips all open correctly.
  const found = useMemo(
    () => findStopInRoutes(allRoutes, Number(stopId), routeId ? Number(routeId) : null),
    [allRoutes, stopId, routeId],
  );
  const stop: RouteStop | undefined = found?.stop;

  // ── Not Found State ──
  if (!stop) {
    return (
      <GradientBackground isBlack>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(48,209,88,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="alert-circle-outline" size={24} color="#30D158" />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Stop Not Found</Text>
          <Text style={{ color: '#8E8E93', fontSize: 13 }}>This stop may have been removed.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(48,209,88,0.1)' }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#30D158', fontSize: 13, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Worker shuttle: passenger manifest for every stop at this location ──
  const template = found?.route.job_template_type ?? jobTemplate;
  const kind = getStopKind(stop, template);
  if (template === 'worker_shuttle' && (kind === 'pickup' || kind === 'dropoff') && found) {
    const ids = (groupStopIds ?? '').split(',').map(Number).filter(Boolean);
    const groupStops = ids.length
      ? found.route.stops.filter((s) => ids.includes(s.id))
      : [stop];
    return (
      <ShuttleStopScreen
        key={groupStops.map((s) => s.id).join('-')}
        route={found.route}
        stops={groupStops.length ? groupStops : [stop]}
      />
    );
  }

  // ── Data ──
  const job = stop.job;
  const jobType = job?.job_type || stop.stop_type || 'delivery';
  const stopStatus = getStopStatus(stop);
  const isDone = stopStatus !== 'pending';
  const config = STATUS_CONFIG[stopStatus];

  const customerName =
    [job?.first_name, job?.last_name].filter(Boolean).join(' ') ||
    job?.business_name ||
    null;

  const address =
    stop.address_formatted || job?.address_formatted || null;

  // ── Handlers ──
  async function handleStatusUpdate(id: number, newStatus: 'completed' | 'failed' | 'pending') {
    const actionLabel =
      newStatus === 'completed' ? 'Complete' : newStatus === 'failed' ? 'Mark as Failed' : 'Undo';
    Alert.alert(
      actionLabel,
      newStatus === 'pending'
        ? 'Reset this stop back to pending?'
        : `Are you sure you want to mark this stop as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus === 'failed' ? 'destructive' : 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await updateStopStatus(id, newStatus, { routeId: found?.route.route_id });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to update stop status. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }

  function handleNavigate() {
    if (!stop) return;
    void openNavigation({
      lat: stop.location?.lat ?? job?.location?.lat,
      lng: stop.location?.lng ?? job?.location?.lng,
      address: address ?? undefined,
    });
  }

  function handleCall() {
    if (job?.phone_number) {
      Linking.openURL(`tel:${job.phone_number}`);
    }
  }

  return (
    <GradientBackground isBlack>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* ─── Header ─── */}
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
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Stop Details</Text>
          </View>
          {/* Status badge in header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: config.bg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: config.border,
            }}
          >
            <Ionicons name={config.icon} size={12} color={config.color} />
            <Text style={{ color: config.color, fontSize: 11, fontWeight: '700' }}>{config.label}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ─── Hero Card ─── */}
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: '#1C1C1E',
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(48,209,88,0.1)',
              }}
            >
              {/* Accent bar */}
              <View style={{ height: 3, backgroundColor: config.color, opacity: 0.6 }} />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  gap: 16,
                }}
              >
                {/* Type icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: config.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      jobType.toLowerCase() === "pickup"
                        ? "package-variant-minus"
                        : jobType.toLowerCase() === "service"
                          ? "wrench-clock"
                          : "truck-fast"
                    }
                    size={22}
                    color={config.color}
                  />
                </View>

                {/* Content Info */}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                      {getJobTypeLabel(jobType)}
                    </Text>

                    {/* Stop number badge */}
                    {stop.sequence_order && (
                      <View
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700' }}>
                          Stop #{stop.sequence_order}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Scheduled time */}
                  {stop.planned_arrival_time && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Ionicons name="time-outline" size={13} color="#8E8E93" />
                      <Text style={{ color: '#8E8E93', fontSize: 13 }}>
                        Scheduled at{' '}
                        <Text style={{ color: '#30D158', fontWeight: '700' }}>
                          {formatTime(stop.planned_arrival_time)}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* ─── Quick Actions (pending only) ─── */}
          {!isDone && (
            <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', gap: 10 }}>
              {/* Navigate */}
              <NavigateButton onPress={handleNavigate} style={{ flex: 1 }} />

              {/* Complete */}
              <TouchableOpacity
                onPress={() => handleStatusUpdate(stop.id, 'completed')}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: 'rgba(48,209,88,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(48,209,88,0.2)',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#30D158" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#30D158" />
                    <Text style={{ color: '#30D158', fontSize: 14, fontWeight: '700' }}>Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Call Button (if phone available) ─── */}
          {job?.phone_number && !isDone && (
            <TouchableOpacity
              onPress={handleCall}
              style={{
                marginHorizontal: 16,
                marginTop: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(59,130,246,0.2)',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={16} color="#60A5FA" />
              <Text style={{ color: '#60A5FA', fontSize: 14, fontWeight: '600' }}>
                Call {customerName || 'Customer'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ─── Customer Information ─── */}
          {(customerName || job?.phone_number || job?.business_name) && (
            <View style={{ marginHorizontal: 16 }}>
              <SectionLabel title="CUSTOMER INFORMATION" />
              <View
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {customerName && (
                  <InfoRow
                    icon="person"
                    label="NAME"
                    value={customerName}
                    isLast={!job?.phone_number && !job?.business_name}
                  />
                )}
                {job?.phone_number && (
                  <InfoRow
                    icon="call"
                    label="PHONE"
                    value={job.phone_number}
                    valueColor="#60A5FA"
                    onPress={handleCall}
                    isLast={!job?.business_name}
                  />
                )}
                {job?.business_name && customerName !== job.business_name && (
                  <InfoRow
                    icon="business"
                    label="BUSINESS"
                    value={job.business_name}
                    isLast
                  />
                )}
              </View>
            </View>
          )}

          {/* ─── Location ─── */}
          {address && (
            <View style={{ marginHorizontal: 16 }}>
              <SectionLabel title="LOCATION" />
              <TouchableOpacity
                onPress={handleNavigate}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(48,209,88,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="location" size={15} color="rgba(48,209,88,0.5)" />
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20, flex: 1 }}>
                  {address}
                </Text>
                <NavigationIcon color="#30D158" />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Schedule Details ─── */}
          {(job?.time_window_start || job?.service_duration || stop.actual_arrival_time || stop.actual_departure_time || job?.completed_at) && (
            <View style={{ marginHorizontal: 16 }}>
              <SectionLabel title="SCHEDULE" />
              <View
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {job?.time_window_start && (
                  <InfoRow
                    icon="calendar-outline"
                    label="TIME WINDOW"
                    value={`${formatTime(job.time_window_start)}${job.time_window_end ? ' – ' + formatTime(job.time_window_end) : ''}`}
                    isLast={!job?.service_duration && !stop.actual_arrival_time && !stop.actual_departure_time && !job?.completed_at}
                  />
                )}
                {job?.service_duration && (
                  <InfoRow
                    icon="hourglass-outline"
                    label="SERVICE DURATION"
                    value={`${job.service_duration} min`}
                    isLast={!stop.actual_arrival_time && !stop.actual_departure_time && !job?.completed_at}
                  />
                )}
                {stop.actual_arrival_time && (
                  <InfoRow
                    icon="enter-outline"
                    label="ARRIVED AT"
                    value={formatTime(stop.actual_arrival_time)}
                    valueColor="#30D158"
                    isLast={!stop.actual_departure_time && !job?.completed_at}
                  />
                )}
                {(job?.completed_at || stop.actual_departure_time) && (
                  <InfoRow
                    icon={job?.status === 'failed' ? "close-circle-outline" : "checkmark-circle-outline"}
                    label={job?.status === 'failed' ? "FAILED AT" : "COMPLETED AT"}
                    value={formatTime(job?.completed_at || stop.actual_departure_time)}
                    valueColor={job?.status === 'failed' ? "#FF453A" : "#30D158"}
                    isLast
                  />
                )}
              </View>
            </View>
          )}

          {/* ─── Additional Notes ─── */}
          {job?.additional_notes && (
            <View style={{ marginHorizontal: 16 }}>
              <SectionLabel title="NOTES" />
              <View
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(48,209,88,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="document-text" size={15} color="rgba(48,209,88,0.5)" />
                </View>
                <Text style={{ color: 'rgba(229,236,233,0.7)', fontSize: 14, lineHeight: 21, flex: 1 }}>
                  {job.additional_notes}
                </Text>
              </View>
            </View>
          )}

          {/* ─── Undo (finished stops can be corrected while the route is open) ─── */}
          {isDone && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(stop.id, 'pending')}
              disabled={isSubmitting}
              style={{
                marginHorizontal: 16,
                marginTop: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,159,10,0.25)',
                backgroundColor: 'rgba(255,159,10,0.06)',
                opacity: isSubmitting ? 0.4 : 1,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={16} color="#FF9F0A" />
              <Text style={{ color: '#FF9F0A', fontSize: 13, fontWeight: '600' }}>Undo — set back to pending</Text>
            </TouchableOpacity>
          )}

          {/* ─── Mark Failed (pending only) ─── */}
          {!isDone && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(stop.id, 'failed')}
              disabled={isSubmitting}
              style={{
                marginHorizontal: 16,
                marginTop: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,69,58,0.2)',
                backgroundColor: 'rgba(255,69,58,0.05)',
                opacity: isSubmitting ? 0.4 : 1,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color="#FF453A" />
              <Text style={{ color: '#FF453A', fontSize: 13, fontWeight: '600' }}>
                Mark as Failed
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
