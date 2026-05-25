import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteStop } from '@/types/route.types';
import {
  formatTime,
  getJobTypeLabel,
  getJobTypeIcon,
  getStopStatus,
} from './homeScreen.utils';

interface StopCardProps {
  stop: RouteStop;
  onPress: () => void;
}

export default function StopCard({ stop, onPress }: StopCardProps) {
  const stopStatus = getStopStatus(stop);
  const isDone = stopStatus !== 'pending';
  const jobType = stop.job?.job_type || stop.stop_type || 'delivery';
  const label = `${getJobTypeLabel(jobType)} — ${formatTime(stop.planned_arrival_time)}`;
  const address = stop.job?.address_formatted || 'No address';
  const duration = stop.job?.service_duration;
  const stopNum = stop.sequence_order ?? '–';

  const dotColor =
    stopStatus === 'completed' ? '#4ade80' :
    stopStatus === 'failed'    ? '#f87171' :
    '#9ca3af';
  const statusLabel =
    stopStatus === 'completed' ? 'Completed' :
    stopStatus === 'failed'    ? 'Failed'    :
    null;
  const statusColor = stopStatus === 'completed' ? '#4ade80' : '#f87171';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mx-4 mb-2">
      <View
        className="flex-row items-center px-4 py-3 rounded-xl border border-white/[0.07]"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        {/* Sequence badge */}
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3 flex-shrink-0"
          style={{ backgroundColor: isDone ? 'rgba(255,255,255,0.06)' : 'rgba(110,180,110,0.18)' }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: isDone ? 'rgba(255,255,255,0.4)' : '#6EB46E' }}
          >
            {stopNum}
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1 min-w-0">
          {/* Title row */}
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <Ionicons
              name={getJobTypeIcon(jobType) as any}
              size={13}
              color={isDone ? 'rgba(255,255,255,0.35)' : '#6EB46E'}
            />
            <Text
              className="text-[13px] font-semibold flex-shrink"
              style={{ color: isDone ? 'rgba(255,255,255,0.45)' : '#ffffff' }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>

          {/* Address */}
          <Text
            className="text-xs mb-1.5"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            numberOfLines={1}
          >
            {address}
          </Text>

          {/* Bottom row: dot + stop # + duration | status label */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
              <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Stop: {stopNum}{duration ? `  |  ${duration} min` : ''}
              </Text>
            </View>
            {statusLabel && (
              <Text className="text-[11px] font-semibold" style={{ color: statusColor }}>
                {statusLabel}
              </Text>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255,255,255,0.25)"
          style={{ marginLeft: 8 }}
        />
      </View>
    </TouchableOpacity>
  );
}
