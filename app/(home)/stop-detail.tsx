import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '@/components/ui/GradientBackground';
import { useRouteStore } from '@/store/route.store';
import { RouteStop } from '@/types/route.types';

import {
  formatTime,
  getJobTypeLabel,
  getJobTypeIcon,
  getStopStatus,
} from './_components/homeScreen.utils';

// ------------------------------------------------------------------ //
// Detail row component
// ------------------------------------------------------------------ //

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="py-3.5 border-b border-white/[0.06]">
      <Text className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </Text>
      <Text className="text-[15px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {value}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------ //
// Main screen
// ------------------------------------------------------------------ //

export default function StopDetailScreen() {
  const { stopId } = useLocalSearchParams<{ stopId: string }>();
  const { assignedRoute, updateStopStatus } = useRouteStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stop: RouteStop | undefined = useMemo(() =>
    assignedRoute?.stops.find((s) => s.id === Number(stopId)),
    [assignedRoute, stopId]
  );

  if (!stop) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-white/60">Stop not found</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // stop is narrowed to RouteStop here
  const job = stop.job;
  const jobType = job?.job_type || stop.stop_type || 'delivery';
  const stopStatus = getStopStatus(stop);
  const isDone = stopStatus !== 'pending';

  const customerName = [job?.first_name, job?.last_name].filter(Boolean).join(' ')
    || job?.business_name
    || null;

  async function handleStatusUpdate(id: number, newStatus: 'completed' | 'failed') {
    const actionLabel = newStatus === 'completed' ? 'Complete' : 'Mark as Failed';
    Alert.alert(
      actionLabel,
      `Are you sure you want to mark this stop as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus === 'failed' ? 'destructive' : 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await updateStopStatus(id, newStatus);
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to update stop status. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  function handleNavigate() {
    const address = encodeURIComponent(job?.address_formatted || '');
    const url = `https://maps.google.com/?q=${address}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open maps application.')
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-white/[0.06]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Stop Details</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Type / time hero */}
          <View className="items-center py-7 border-b border-white/[0.06] mx-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: isDone ? 'rgba(255,255,255,0.06)' : 'rgba(110,180,110,0.15)' }}
            >
              <Ionicons
                name={getJobTypeIcon(jobType)}
                size={28}
                color={isDone ? 'rgba(255,255,255,0.3)' : '#6EB46E'}
              />
            </View>

            <Text className="text-white text-xl font-extrabold mb-1">
              {getJobTypeLabel(jobType)}
            </Text>

            {stop.planned_arrival_time && (
              <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Scheduled at:{' '}
                <Text style={{ color: '#6EB46E', fontWeight: '700' }}>
                  {formatTime(stop.planned_arrival_time)}
                </Text>
              </Text>
            )}

            {/* Done badge */}
            {isDone && (
              <View
                className="flex-row items-center gap-1.5 mt-3 px-3 py-1 rounded-full"
                style={{
                  backgroundColor: stopStatus === 'completed'
                    ? 'rgba(74,222,128,0.12)'
                    : 'rgba(248,113,113,0.12)',
                  borderWidth: 1,
                  borderColor: stopStatus === 'completed' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                }}
              >
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stopStatus === 'completed' ? '#4ade80' : '#f87171' }}
                />
                <Text
                  className="text-xs font-bold"
                  style={{ color: stopStatus === 'completed' ? '#4ade80' : '#f87171' }}
                >
                  {stopStatus === 'completed' ? 'Completed' : 'Failed'}
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons — only for pending stops */}
          {!isDone && (
            <View className="flex-row gap-3 mx-4 mt-5 mb-2">
              <TouchableOpacity
                onPress={handleNavigate}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ backgroundColor: '#1a4a8a' }}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-outline" size={18} color="#fff" />
                <Text className="text-white font-semibold text-[13px]">Navigate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStatusUpdate(stop.id, 'completed')}
                disabled={isSubmitting}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ backgroundColor: '#166534', opacity: isSubmitting ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#4ade80" />
                <Text className="font-semibold text-[13px]" style={{ color: '#4ade80' }}>
                  {isSubmitting ? 'Saving...' : 'Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Detail rows */}
          <View className="mx-4 mt-4">
            {customerName && <DetailRow label="CUSTOMER" value={customerName} />}
            {job?.phone_number && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${job.phone_number}`)}>
                <View className="py-3.5 border-b border-white/[0.06]">
                  <Text className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    PHONE
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[15px]" style={{ color: '#6EB46E' }}>{job.phone_number}</Text>
                    <Ionicons name="call-outline" size={14} color="#6EB46E" />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            <DetailRow label="ADDRESS" value={job?.address_formatted} />
            {job?.time_window_start && (
              <DetailRow
                label="TIME WINDOW"
                value={`${job.time_window_start}${job.time_window_end ? ' – ' + job.time_window_end : ''}`}
              />
            )}
            {job?.service_duration && (
              <DetailRow label="DURATION" value={`${job.service_duration} minutes`} />
            )}
            <DetailRow label="NOTES" value={job?.additional_notes} />
          </View>

          {/* Mark Failed button — only for pending */}
          {!isDone && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(stop.id, 'failed')}
              disabled={isSubmitting}
              className="mx-4 mt-6 py-3.5 rounded-xl items-center border"
              style={{ borderColor: 'rgba(248,113,113,0.4)', opacity: isSubmitting ? 0.5 : 1 }}
              activeOpacity={0.8}
            >
              <Text className="font-semibold text-[13px]" style={{ color: '#f87171' }}>
                Mark as Failed
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
