import { openNavigation } from '@/utils/navigation';
import { Alert } from '@/utils/alert';
import React, { useEffect, useState, useRef, useMemo } from "react";
import Svg, { Path, Circle, Text as SvgText, G } from "react-native-svg";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from "react-native";
import RouteMap from "@/components/maps/RouteMap";
import type { RouteMapHandle } from "@/components/maps/RouteMap.types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import NavigateButton, { NavigationIcon } from "@/components/ui/NavigateButton";
// import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { selectViewedRoute, useRouteStore } from "@/store/route.store";
import { RouteStop } from "@/types/route.types";
import {
  formatWaiting,
  getDoneLabel,
  getFailLabel,
  getGroupPassengers,
  getKindLabel,
  getRouteLegLabel,
  GroupedRouteStop,
  groupRouteStops,
  isStopFinished,
} from "@/utils/shuttleRoute.utils";
import { formatTime } from "../_components/homeScreen.utils";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Pure teardrop map pin — extracted into its own
// memo component so Android allocates the correct
// bitmap size before the map caches the marker.
// ─────────────────────────────────────────────
type PinStyle = {
  bg: string;
  border: string;
  text: string;
  size: number;
  icon: "home" | undefined;
  iconSize: number;
  glow: boolean;
};

// const PureMarkerPin = React.memo(
//   ({
//     mStyle,
//     label,
//     isSelected,
//   }: {
//     mStyle: PinStyle;
//     label: string | number;
//     isSelected: boolean;
//   }) => {
//     // viewBox is 32 × 42; scale to desired size keeping aspect ratio
//     const pinW = mStyle.size;
//     const pinH = Math.round(pinW * (42 / 32));

//     return (
//       // Outer wrapper is intentionally larger than the pin so Android never
//       // clips the tip or drop-shadow. overflow:visible propagates upward.
//       <View
//         style={{
//           width: pinW,
//           height: pinH,
//           alignItems: "center",
//           justifyContent: "flex-start",
//           // Android shadow via elevation only (no shadow* props on Android)
//           elevation: isSelected ? 10 : 5,
//         }}
//       >
//         {/* Full-size SVG fills the view exactly — no absolute positioning */}
//         <Svg width={pinW} height={pinH} viewBox="0 0 32 42">
//           <Path
//             d="M16 1 C7.716 1 1 7.716 1 16 C1 27.5 16 41 16 41 C16 41 31 27.5 31 16 C31 7.716 24.284 1 16 1 Z"
//             fill={mStyle.bg}
//             stroke={mStyle.border}
//             strokeWidth={1.8}
//           />
//           {/* Inner highlight circle for depth */}
//           <Path
//             d="M16 6 C10.477 6 6 10.477 6 16 C6 21.523 10.477 26 16 26 C21.523 26 26 21.523 26 16 C26 10.477 21.523 6 16 6 Z"
//             fill="rgba(255,255,255,0.08)"
//           />
//         </Svg>

//         {/* Icon / number label — absolutely centered in the top circle */}
//         <View
//           style={{
//             position: "absolute",
//             top: 0,
//             left: 0,
//             width: pinW,
//             // Circle region is roughly top 60% of the teardrop (16/42 radius)
//             height: Math.round(pinW * (32 / 32)),
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           {mStyle.icon ? (
//             <Ionicons
//               name={mStyle.icon}
//               size={mStyle.iconSize}
//               color={mStyle.text}
//             />
//           ) : (
//             <Text
//               style={{
//                 fontSize: isSelected ? 15 : 13,
//                 fontWeight: "800",
//                 color: mStyle.text,
//                 includeFontPadding: false,
//                 textAlignVertical: "center",
//                 textAlign: "center",
//                 lineHeight: isSelected ? 15 : 13,
//               }}
//             >
//               {label}
//             </Text>
//           )}
//         </View>
//       </View>
//     );
//   },
// );
const PureMarkerPin = React.memo(
  ({
    mStyle,
    label,
    isSelected,
  }: {
    mStyle: PinStyle;
    label: string | number;
    isSelected: boolean;
  }) => {
    const size = mStyle.size; // e.g. 38 selected, 32 unselected
    const r = size / 2; // circle radius
    const stemW = 6;
    const stemH = size * 0.35;
    const totalH = size + stemH; // circle + stem
    const cx = r;
    const cy = r;

    const shadowColor =
      mStyle.bg === "#FFFFFF" ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.25)";

    return (
      <Svg width={size} height={totalH} viewBox={`0 0 ${size} ${totalH}`}>
        {/* Drop shadow circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={r - 1}
          fill={shadowColor} // ← was hardcoded "rgba(0,0,0,0.25)"
          translateX={1.5}
          translateY={1.5}
        />
        {/* Main circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={r - 1.5}
          fill={mStyle.bg}
          stroke={mStyle.border}
          strokeWidth={2}
        />
        {/* Stem triangle */}
        <Path
          d={`M ${cx - stemW / 2} ${size - 4} L ${cx} ${totalH} L ${cx + stemW / 2} ${size - 4} Z`}
          fill={mStyle.bg}
          stroke={mStyle.border}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Cover the stem-top border seam */}
        <Path
          d={`M ${cx - stemW / 2 - 1} ${size - 4} L ${cx + stemW / 2 + 1} ${size - 4}`}
          stroke={mStyle.bg}
          strokeWidth={2.5}
        />

        {/* Icon or number label */}
        {mStyle.icon === "home" ? (
          // Simple house SVG path centered in circle
          <G translateX={cx} translateY={cy}>
            <Path
              d={`
                M 0 ${-mStyle.iconSize * 0.42}
                L ${-mStyle.iconSize * 0.52} ${mStyle.iconSize * 0.08}
                L ${-mStyle.iconSize * 0.35} ${mStyle.iconSize * 0.08}
                L ${-mStyle.iconSize * 0.35} ${mStyle.iconSize * 0.52}
                L ${-mStyle.iconSize * 0.1} ${mStyle.iconSize * 0.52}
                L ${-mStyle.iconSize * 0.1} ${mStyle.iconSize * 0.18}
                L ${mStyle.iconSize * 0.1} ${mStyle.iconSize * 0.18}
                L ${mStyle.iconSize * 0.1} ${mStyle.iconSize * 0.52}
                L ${mStyle.iconSize * 0.35} ${mStyle.iconSize * 0.52}
                L ${mStyle.iconSize * 0.35} ${mStyle.iconSize * 0.08}
                L ${mStyle.iconSize * 0.52} ${mStyle.iconSize * 0.08}
                Z
              `}
              fill={mStyle.text}
            />
          </G>
        ) : (
          <SvgText
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            alignmentBaseline="central"
            fontSize={isSelected ? 14 : 12}
            fontWeight="800"
            fill={mStyle.text}
          >
            {String(label)}
          </SvgText>
        )}
      </Svg>
    );
  },
);
PureMarkerPin.displayName = "PureMarkerPin";

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// Default coordinates (Ahmedabad/Nadiad region)
const DEFAULT_LATITUDE = 22.8219;
const DEFAULT_LONGITUDE = 72.8282;

function getStopCoords(stop?: RouteStop | null): { latitude: number; longitude: number } | null {
  if (!stop) return null;
  const lat = stop.location?.lat ?? stop.job?.location?.lat;
  const lng = stop.location?.lng ?? stop.job?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { latitude: lat, longitude: lng };
}

export default function MapTabScreen() {
  const viewedRoute = useRouteStore(selectViewedRoute);
  const allRoutes = useRouteStore((s) => s.allRoutes);
  const selectRoute = useRouteStore((s) => s.selectRoute);
  const isLoading = useRouteStore((s) => s.isLoading);
  const fetchMyRoutes = useRouteStore((s) => s.fetchMyRoutes);
  const authTemplate = useAuthStore((s) => s.jobTemplate);

  const [selectedStopIndex, setSelectedStopIndex] = useState<number>(0);
  const [tracksChanges, setTracksChanges] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  const template = viewedRoute?.job_template_type ?? authTemplate ?? "pickup_delivery_job";
  const isShuttle = template === "worker_shuttle";

  useEffect(() => {
    if (allRoutes.length === 0) {
      fetchMyRoutes();
    }
  }, []);

  // Reset and toggle tracksChanges whenever viewedRoute is loaded/updated
  // to allow async vector fonts and SVGs to fully render before caching for performance
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setTracksChanges(true);
    }, 0);
    const endTimer = setTimeout(() => {
      setTracksChanges(false);
    }, 2500);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [viewedRoute]);

  const mapRef = useRef<RouteMapHandle>(null);
  const flatListRef = useRef<FlatList<GroupedRouteStop>>(null);
  const isScrollingRef = useRef<boolean>(false);

  const groups = useMemo(
    () => (viewedRoute ? groupRouteStops(viewedRoute, template) : []),
    [viewedRoute, template],
  );
  const visitGroups = useMemo(
    () => groups.filter((g) => g.kind !== "start" && g.kind !== "end"),
    [groups],
  );
  const groupsWithCoords = useMemo(
    () => groups.filter((g) => getStopCoords(g.representative) !== null),
    [groups],
  );

  // Switchable open routes (e.g. GO + RETURN legs on the same day)
  const openRoutes = useMemo(
    () => allRoutes.filter((r) => r.assignment_status !== "completed"),
    [allRoutes],
  );

  const routePolyline = viewedRoute?.route_polyline;
  const polylineCoords = useMemo(() => {
    if (routePolyline) {
      try {
        return decodePolyline(routePolyline);
      } catch (e) {
        console.warn("Failed to decode route_polyline", e);
      }
    }
    return groupsWithCoords.map((g) => getStopCoords(g.representative)!);
  }, [routePolyline, groupsWithCoords]);

  const activeRouteId = viewedRoute?.route_id;
  // Auto-fit map coordinates when switching routes, and focus on the first pending visit
  useEffect(() => {
    const timer = setTimeout(() => {
      if (groups.length === 0) {
        setSelectedStopIndex(0);
        return;
      }
      const firstPendingIndex = groups.findIndex(
        (g) => g.kind !== "start" && g.kind !== "end" && (g.progress === "pending" || g.progress === "partial"),
      );
      const targetIndex = firstPendingIndex !== -1 ? firstPendingIndex : 0;
      setSelectedStopIndex(targetIndex);

      if (groupsWithCoords.length > 0 && mapRef.current) {
        const coordinates = groupsWithCoords.map((g) => getStopCoords(g.representative)!);
        const targetCoords = getStopCoords(groups[targetIndex]?.representative);

        if (targetIndex < groups.length) {
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: false,
          });
        }

        if (targetCoords && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: targetCoords.latitude,
              longitude: targetCoords.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            800,
          );
        } else {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 80, right: 50, bottom: 240, left: 50 },
            animated: true,
          });
        }
      }
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRouteId]);

  const safeSelectedIndex = groups.length > 0 ? Math.min(selectedStopIndex, groups.length - 1) : 0;

  // Synchronize Scroll & Map Center
  const handleScroll = (event: any) => {
    if (isScrollingRef.current) return;

    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);

    if (index >= 0 && index < groups.length && index !== selectedStopIndex) {
      setSelectedStopIndex(index);

      const coords = getStopCoords(groups[index]?.representative);
      if (coords && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          400,
        );
      }
    }
  };

  // Helper to focus map & flatlist on a grouped stop
  const zoomToGroup = (group: GroupedRouteStop, index: number) => {
    setSelectedStopIndex(index);

    isScrollingRef.current = true;
    flatListRef.current?.scrollToIndex({ index, animated: true });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);

    const coords = getStopCoords(group.representative);
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500,
      );
    }
  };

  const handleNext = () => {
    if (safeSelectedIndex < groups.length - 1) {
      zoomToGroup(groups[safeSelectedIndex + 1], safeSelectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeSelectedIndex > 0) {
      zoomToGroup(groups[safeSelectedIndex - 1], safeSelectedIndex - 1);
    }
  };

  const jobStops = (viewedRoute?.stops ?? []).filter((s) => !!s.job);
  const completedCount = jobStops.filter(isStopFinished).length;

  const getMarkerStyle = (group: GroupedRouteStop, index: number): PinStyle => {
    const isSelected = safeSelectedIndex === index;
    const isTerminal = group.kind === "start" || group.kind === "end";

    if (isTerminal) {
      return {
        bg: isSelected ? "#30D158" : "#4A5568",
        border: "#FFFFFF",
        text: isSelected ? "#000000" : "#FFFFFF",
        size: isSelected ? 38 : 32,
        icon: "home" as const,
        iconSize: isSelected ? 16 : 13,
        glow: isSelected,
      };
    }
    if (group.progress === "completed") {
      return {
        bg: isSelected ? "#30D158" : "#FFFFFF",
        border: isSelected ? "#FFFFFF" : "#30D158",
        text: "#000000",
        size: isSelected ? 38 : 32,
        icon: undefined,
        iconSize: 0,
        glow: isSelected,
      };
    }
    if (group.progress === "failed") {
      return {
        bg: isSelected ? "#30D158" : "#FF453A",
        border: "#FFFFFF",
        text: isSelected ? "#000000" : "#FFFFFF",
        size: isSelected ? 38 : 32,
        icon: undefined,
        iconSize: 0,
        glow: isSelected,
      };
    }
    if (group.progress === "skipped") {
      return {
        bg: isSelected ? "#30D158" : "#636366",
        border: "#FFFFFF",
        text: isSelected ? "#000000" : "#FFFFFF",
        size: isSelected ? 38 : 32,
        icon: undefined,
        iconSize: 0,
        glow: isSelected,
      };
    }
    // pending / partial
    return {
      bg: isSelected ? "#30D158" : "#FF9F0A",
      border: "#FFFFFF",
      text: isSelected ? "#000000" : "#FFFFFF",
      size: isSelected ? 38 : 32,
      icon: undefined,
      iconSize: 0,
      glow: isSelected,
    };
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: "rgba(48,209,88,0.08)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="map" size={24} color="#30D158" />
        </View>
        <ActivityIndicator color="#30D158" size="small" />
        <Text
          style={{
            color: "#8E8E93",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          Loading route map…
        </Text>
      </View>
    );
  }

  const navigateToStop = (stop: RouteStop) => {
    const coords = getStopCoords(stop);
    void openNavigation({
      lat: coords?.latitude,
      lng: coords?.longitude,
      address: stop.address_formatted || stop.job?.address_formatted,
    });
  };

  const renderGroupSlide = ({
    item: group,
  }: {
    item: GroupedRouteStop;
    index: number;
  }) => {
    const rep = group.representative;
    const isTerminal = group.kind === "start" || group.kind === "end";
    const hasCoords = getStopCoords(rep) !== null;
    const passengers = isTerminal ? [] : getGroupPassengers(group);
    const waitingText = formatWaiting(rep.waiting_time_to_next_stop_seconds);

    const statusConfig = (() => {
      if (isTerminal) {
        return {
          color: "#30D158",
          bg: "rgba(48,209,88,0.1)",
          label: group.kind === "start" ? "START" : "END",
          icon: "flag" as const,
        };
      }
      switch (group.progress) {
        case "completed":
          return {
            color: "#30D158",
            bg: "rgba(48,209,88,0.1)",
            label: getDoneLabel(group.kind, template).toUpperCase(),
            icon: "checkmark-circle" as const,
          };
        case "failed":
          return {
            color: "#FF453A",
            bg: "rgba(255,69,58,0.1)",
            label: getFailLabel(group.kind, template).toUpperCase(),
            icon: "close-circle" as const,
          };
        case "skipped":
          return {
            color: "#8E8E93",
            bg: "rgba(142,142,147,0.15)",
            label: "SKIPPED",
            icon: "remove-circle-outline" as const,
          };
        case "partial":
          return {
            color: "#0A84FF",
            bg: "rgba(10,132,255,0.14)",
            label: `${group.finishedCount}/${group.stops.length} DONE`,
            icon: "people" as const,
          };
        default:
          return {
            color: "#FF9F0A",
            bg: "rgba(255,159,10,0.1)",
            label: "PENDING",
            icon: "time" as const,
          };
      }
    })();

    const kindLabel = getKindLabel(group.kind, template);
    const title = isTerminal
      ? group.kind === "start"
        ? viewedRoute?.depot && !isShuttle
          ? viewedRoute.depot.name || "Start Depot"
          : "Start Location"
        : viewedRoute?.depot && !isShuttle
          ? viewedRoute.depot.name || "End Depot"
          : "End Location"
      : isShuttle
        ? `${kindLabel} · ${group.passengerCount} ${group.passengerCount === 1 ? "passenger" : "passengers"}`
        : kindLabel;

    const address =
      rep.address_formatted ||
      rep.job?.address_formatted ||
      (isTerminal && viewedRoute?.depot?.address_formatted) ||
      "No address provided";

    const contactSummary = !isTerminal
      ? isShuttle
        ? group.passengerCount > 1
          ? `${group.finishedCount}/${group.passengerCount} checked`
          : passengers[0]?.name ?? null
        : rep.job?.first_name
          ? `${rep.job.first_name}${rep.job.last_name ? ` ${rep.job.last_name}` : ""}`
          : rep.job?.business_name ?? null
      : null;

    const doneTimestamp = rep.actual_departure_time || rep.job?.completed_at;

    return (
      <View style={{ width, paddingHorizontal: 16 }}>
        <View
          style={{
            backgroundColor: "#1C1C1E",
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          {/* Accent bar at top */}
          <View
            style={{
              height: 3,
              backgroundColor: statusConfig.color,
              opacity: 0.7,
            }}
          />

          <View style={{ padding: 16 }}>
            {/* Row 1: Icon + Title + Badge */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: statusConfig.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isTerminal ? (
                    <Ionicons
                      name={group.kind === "start" ? "play-circle" : "flag"}
                      size={17}
                      color={statusConfig.color}
                    />
                  ) : isShuttle ? (
                    <MaterialCommunityIcons
                      name={
                        group.kind === "dropoff"
                          ? "map-marker-check"
                          : group.passengerCount > 1
                            ? "account-group"
                            : "account-arrow-up"
                      }
                      size={18}
                      color={statusConfig.color}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        group.kind === "pickup"
                          ? "package-variant-minus"
                          : group.kind === "service"
                            ? "wrench-clock"
                            : "truck-fast"
                      }
                      size={group.kind === "service" ? 15 : 18}
                      color={statusConfig.color}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {(rep.planned_arrival_time || doneTimestamp) && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        marginTop: 2,
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={10}
                        color="#8E8E93"
                      />
                      <Text
                        style={{
                          color: "#8E8E93",
                          fontSize: 11,
                        }}
                      >
                        {group.progress === "completed" && doneTimestamp
                          ? `Done ${formatTime(doneTimestamp)}`
                          : rep.planned_arrival_time
                            ? `ETA ${formatTime(rep.planned_arrival_time)}`
                            : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: statusConfig.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name={statusConfig.icon}
                  size={11}
                  color={statusConfig.color}
                />
                <Text
                  style={{
                    color: statusConfig.color,
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}
                >
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Row 2: Address with icon */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Ionicons
                name="location"
                size={14}
                color="#8E8E93"
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 12.5,
                  lineHeight: 18,
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {address}
              </Text>
            </View>

            {/* Row 3: Contact + Stop # + Waiting chips */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {!isTerminal && group.displayNumber != null && (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name="flag"
                    size={10}
                    color="rgba(48,209,88,0.6)"
                  />
                  <Text
                    style={{
                      color: "#8E8E93",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    Stop {group.displayNumber} of {visitGroups.length}
                  </Text>
                </View>
              )}
              {contactSummary && (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    maxWidth: "60%",
                  }}
                >
                  <Ionicons
                    name={group.passengerCount > 1 ? "people" : "person"}
                    size={10}
                    color="rgba(48,209,88,0.6)"
                  />
                  <Text
                    style={{
                      color: "#8E8E93",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {contactSummary}
                  </Text>
                </View>
              )}
              {waitingText && (
                <View
                  style={{
                    backgroundColor: "rgba(255,159,10,0.12)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons name="hourglass-outline" size={10} color="#FF9F0A" />
                  <Text
                    style={{
                      color: "#FF9F0A",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    Wait {waitingText}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 4: Action buttons */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {/* Navigate button */}
              {hasCoords &&
                (isTerminal || group.progress === "pending" || group.progress === "partial") && (
                  <NavigateButton onPress={() => navigateToStop(rep)} />
                )}

              {/* View Details / Manifest */}
              <TouchableOpacity
                onPress={() => {
                  if (isTerminal) {
                    Alert.alert(
                      group.kind === "start" ? "Start Location" : "End Location",
                      address,
                    );
                    return;
                  }
                  router.push({
                    pathname: "/(home)/stop-detail",
                    params: {
                      stopId: String(rep.id),
                      routeId: viewedRoute ? String(viewedRoute.route_id) : undefined,
                      groupStopIds: group.stops.map((s) => s.id).join(","),
                    },
                  });
                }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  backgroundColor: "rgba(48,209,88,0.08)",
                  borderRadius: 12,
                  paddingVertical: 11,
                  borderWidth: 1,
                  borderColor: "rgba(48,209,88,0.15)",
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    isTerminal
                      ? "information-circle-outline"
                      : isShuttle && group.passengerCount > 1
                        ? "people-outline"
                        : "document-text-outline"
                  }
                  size={14}
                  color="#30D158"
                />
                <Text
                  style={{ color: "white", fontSize: 13, fontWeight: "600" }}
                >
                  {isTerminal
                    ? "Info"
                    : isShuttle && group.passengerCount > 1
                      ? "Manifest"
                      : "Details"}
                </Text>
              </TouchableOpacity>

              {/* Prev / Next */}
              <TouchableOpacity
                onPress={handlePrev}
                disabled={safeSelectedIndex === 0}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  opacity: safeSelectedIndex === 0 ? 0.25 : 1,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                disabled={safeSelectedIndex === groups.length - 1}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  opacity: safeSelectedIndex === groups.length - 1 ? 0.25 : 1,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const legLabel = viewedRoute ? getRouteLegLabel(viewedRoute) : null;

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-black">
      {/* Map View Panel */}
      <RouteMap
        ref={mapRef}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: DEFAULT_LATITUDE,
          longitude: DEFAULT_LONGITUDE,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        coordinates={polylineCoords}
        markers={groups.flatMap((group, index) => {
          const coords = getStopCoords(group.representative);
          if (!coords) return [];

          const isSelected = safeSelectedIndex === index;
          const mStyle = getMarkerStyle(group, index);

          return [{
            id: group.key,
            coordinate: coords,
            label: `${getKindLabel(group.kind, template)} ${group.displayNumber ?? index + 1}`,
            onPress: () => zoomToGroup(group, index),
            tracksViewChanges: tracksChanges,
            content: (
              <PureMarkerPin
                mStyle={mStyle}
                label={group.displayNumber ?? index + 1}
                isSelected={isSelected}
              />
            ),
          }];
        })}
      />

      {/* ─── Route Progress Header (+ multi-leg switcher) ─── */}
      {viewedRoute && groups.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 60,
            gap: 6,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(28,28,30,0.88)",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(48,209,88,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <NavigationIcon />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text
                    style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700", flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {viewedRoute.name || `Route #${viewedRoute.route_id}`}
                  </Text>
                  {legLabel && (
                    <View
                      style={{
                        backgroundColor:
                          legLabel === "GO"
                            ? "rgba(48,209,88,0.18)"
                            : "rgba(10,132,255,0.22)",
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: legLabel === "GO" ? "#30D158" : "#0A84FF",
                        }}
                      >
                        {legLabel}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: "#8E8E93", fontSize: 10 }}>
                  {completedCount}/{jobStops.length} {isShuttle ? "actions" : "jobs"} ({visitGroups.length} stops)
                </Text>
              </View>
            </View>
            {/* Mini progress bar */}
            <View
              style={{
                width: 48,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View
                style={{
                  width:
                    jobStops.length > 0
                      ? (completedCount / jobStops.length) * 48
                      : 0,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#30D158",
                }}
              />
            </View>
          </View>

          {openRoutes.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {openRoutes.map((r) => {
                const active = r.route_id === viewedRoute.route_id;
                const rLeg = getRouteLegLabel(r);
                const chipLabel = rLeg ?? r.name ?? `#${r.route_id}`;
                return (
                  <TouchableOpacity
                    key={r.route_id}
                    onPress={() => selectRoute(r.route_id)}
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: active
                        ? "#30D158"
                        : "rgba(28,28,30,0.88)",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active
                        ? "#30D158"
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: active ? "#000000" : "#FFFFFF",
                      }}
                    >
                      {chipLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ─── Floating Controls ─── */}
      {groupsWithCoords.length > 0 && (
        <View
          style={{
            position: "absolute",
            right: 14,
            top: insets.top + 8,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              const coords = groupsWithCoords.map(
                (g) => getStopCoords(g.representative)!,
              );
              mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 80, right: 50, bottom: 240, left: 50 },
                animated: true,
              });
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "rgba(28,28,30,0.85)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={18} color="#30D158" />
          </TouchableOpacity>
        </View>
      )}

      {/* Swipeable Horizontal Stop Carousel Cards list */}
      {groups.length > 0 ? (
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <FlatList
            ref={flatListRef}
            data={groups}
            renderItem={renderGroupSlide}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
          {/* Pagination Dots */}
          {groups.length > 1 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 10,
                gap: 5,
              }}
            >
              {groups.map((g, i) => {
                const isActive = i === safeSelectedIndex;
                const dotColor = isActive
                  ? "#30D158"
                  : g.progress === "completed"
                    ? "#30D158"
                    : g.progress === "failed"
                      ? "#FF453A"
                      : g.progress === "partial"
                        ? "#0A84FF"
                        : "rgba(255,255,255,0.15)";
                return (
                  <TouchableOpacity
                    key={g.key}
                    onPress={() => zoomToGroup(g, i)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: isActive ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: dotColor,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* Empty State */
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
            backgroundColor: "#1C1C1E",
            borderRadius: 20,
            padding: 28,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: "rgba(48,209,88,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="map-outline" size={24} color="#30D158" />
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            No Route Assigned
          </Text>
          <Text
            style={{
              color: "#8E8E93",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            When your dispatcher assigns a route, it will appear here with
            turn-by-turn navigation.
          </Text>
        </View>
      )}
    </View>
  );
}

// Stunning Dark Map Theme JSON configuration
const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1C1C1E" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1C1C1E" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#E3DAC9" }], // Beautiful warm cream/beige
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#E3DAC9" }], // Beautiful warm cream/beige
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#C8B195" }], // Muted beige
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#15251d" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#C8B195" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d2d30" }], // Dark grey roads
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1C1C1E" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#E3DAC9" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3d3d42" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1C1C1E" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FAF9F6" }], // Off-white
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#252528" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#E3DAC9" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#121214" }], // Rich warm dark blue/black
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#C8B195" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1C1C1E" }],
  },
];
