import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import { RouteStop } from "@/types/route.types";
import {
  getDoneLabel,
  getFailLabel,
  getKindLabel,
  getStopKind,
  getStopPassenger,
  getStopProgress,
  isShuttleStop,
} from "@/utils/shuttleRoute.utils";
import { formatTime } from "./homeScreen.utils";

interface StopCardProps {
  stop: RouteStop;
  onPress: () => void;
}

export default function StopCard({ stop, onPress }: StopCardProps) {
  const authTemplate = useAuthStore((s) => s.jobTemplate);
  const template = stop.job?.job_template_type ?? authTemplate ?? "pickup_delivery_job";
  const shuttle = isShuttleStop(stop, template);
  const kind = getStopKind(stop, template);
  const stopStatus = getStopProgress(stop);

  // Format Label & Time
  const kindLabel = getKindLabel(kind, template);
  const passenger = shuttle && stop.job ? getStopPassenger(stop) : null;
  const titleLabel = passenger ? `${kindLabel} · ${passenger.name}` : kindLabel;
  const timeLabel = formatTime(stop.planned_arrival_time);
  const address = stop.address_formatted || stop.job?.address_formatted || "No Address Provided";
  const duration = stop.job?.service_duration;
  const stopNum = stop.sequence_order ?? "–";

  // Get Custom Icon based on Stop Kind
  const getIcon = () => {
    if (shuttle) {
      return (
        <MaterialCommunityIcons
          name={kind === "dropoff" ? "map-marker-check" : "account-arrow-up"}
          size={24}
          color="#30D158"
        />
      );
    }
    switch (kind) {
      case "pickup":
        return (
          <MaterialCommunityIcons
            name="package-variant-minus"
            size={24}
            color="#30D158"
          />
        );
      case "service":
        return (
          <MaterialCommunityIcons
            name="wrench-clock"
            size={22}
            color="#30D158"
          />
        );
      default:
        return (
          <MaterialCommunityIcons name="truck-fast" size={24} color="#30D158" />
        );
    }
  };

  // Color Mapping
  const dotColor =
    stopStatus === "completed"
      ? "#30D158"
      : stopStatus === "failed"
        ? "#FF453A"
        : stopStatus === "skipped"
          ? "#8E8E93"
          : "#FF9F0A";

  const completedTime = (stop.actual_departure_time || stop.job?.completed_at)
    ? formatTime(stop.actual_departure_time || stop.job?.completed_at)
    : "";

  const doneText = getDoneLabel(kind, template);
  const failText = getFailLabel(kind, template);
  const statusLabel =
    stopStatus === "completed"
      ? completedTime ? `${doneText} at ${completedTime}` : doneText
      : stopStatus === "failed"
        ? completedTime ? `${failText} at ${completedTime}` : failText
        : stopStatus === "skipped"
          ? "Skipped"
          : "Pending";

  const statusColor = dotColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mx-4 mb-3.5"
    >
      <View
        className="flex-row px-5 py-4.5 rounded-2xl border border-white/[0.08] shadow-md"
        style={{
          backgroundColor: "#1C1C1E",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 5,
          paddingVertical: 8,
        }}
      >
        {/* Left Column: Job Icon inside a circle */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-4.5 flex-shrink-0"
          style={{ backgroundColor: "rgba(48, 209, 88, 0.08)" }}
        >
          {getIcon()}
        </View>

        {/* Right Column: Content */}
        <View className="flex-1 min-w-0 justify-between">
          {/* Top Row: Title + Chevron */}
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[17px] font-bold text-text-primary flex-1 mr-2"
              numberOfLines={1}
            >
              {titleLabel} — {timeLabel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#30D158" />
          </View>

          {/* Middle Row: Address */}
          <Text
            className="text-[13.5px] text-text-secondary my-2 leading-5"
            numberOfLines={2}
          >
            {address}
          </Text>

          {/* Bottom Row: Dot + Stop Sequence | Duration & Status Label */}
          <View className="flex-row items-center justify-between mt-1">
            <View className="flex-row items-center gap-2">
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
              <Text className="text-[12.5px] text-text-muted font-medium">
                Stop: {stopNum} {duration ? `  |  ${duration} min` : ""}
              </Text>
            </View>
            <Text
              className="text-[12.5px] font-bold"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
