import React, { useEffect, useState, useRef } from "react";
import Svg, { Path, Circle, Text as SvgText, G } from "react-native-svg";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
// import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useRouteStore } from "@/store/route.store";
import { useRouteSocket } from "@/hooks/useRouteSocket";
import { RouteStop } from "@/types/route.types";
import {
  formatTime,
  getJobTypeIcon,
  getJobTypeLabel,
  getStopStatus,
} from "../_components/homeScreen.utils";

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
// Default coordinates (Ahmedabad/Nadiad region)
const DEFAULT_LATITUDE = 22.8219;
const DEFAULT_LONGITUDE = 72.8282;

export default function MapTabScreen() {
  const { assignedRoute, isLoading, fetchMyRoute } = useRouteStore();
  const [selectedStopIndex, setSelectedStopIndex] = useState<number>(0);
  const [tracksChanges, setTracksChanges] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  // Reset and toggle tracksChanges whenever assignedRoute is loaded/updated
  // to allow async vector fonts and SVGs to fully render before caching for performance
  useEffect(() => {
    setTracksChanges(true);
    // Give async SVG/font rendering ample time before Android caches the bitmap
    const timer = setTimeout(() => {
      setTracksChanges(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [assignedRoute]);

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef<boolean>(false);

  useRouteSocket();

  // Auto-refresh the route data whenever the driver focuses/opens the Map tab
  useFocusEffect(
    React.useCallback(() => {
      fetchMyRoute();
    }, []),
  );

  const stops = assignedRoute?.stops ?? [];

  // Defensively match coordinates from either root location or job location
  const stopsWithCoords = stops.filter((stop) => {
    const lat = stop.location?.lat || stop.job?.location?.lat;
    const lng = stop.location?.lng || stop.job?.location?.lng;
    return (
      lat !== undefined && lat !== null && lng !== undefined && lng !== null
    );
  });

  // Auto-fit map coordinates on load or route update, and focus on the current pending stop
  useEffect(() => {
    if (stopsWithCoords.length > 0 && mapRef.current) {
      const coordinates = stopsWithCoords.map((stop) => {
        const lat = stop.location?.lat || stop.job!.location!.lat;
        const lng = stop.location?.lng || stop.job!.location!.lng;
        return { latitude: lat, longitude: lng };
      });

      // Find first pending stop as default selected stop
      const firstPendingIndex = stops.findIndex(
        (s) => getStopStatus(s) === "pending",
      );
      const targetIndex = firstPendingIndex !== -1 ? firstPendingIndex : 0;
      setSelectedStopIndex(targetIndex);

      const currentStop = stops[targetIndex];
      const targetLat =
        currentStop?.location?.lat || currentStop?.job?.location?.lat;
      const targetLng =
        currentStop?.location?.lng || currentStop?.job?.location?.lng;

      // Fit coordinates and then animate camera to focus on the active stop
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
        });

        if (targetLat && targetLng && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: targetLat,
              longitude: targetLng,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            800,
          );
        } else {
          // Fallback: Fit all stops if active stop has no valid coords
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 80, right: 50, bottom: 240, left: 50 },
            animated: true,
          });
        }
      }, 600);
    }
  }, [assignedRoute]);

  // Synchronize Scroll & Map Center
  const handleScroll = (event: any) => {
    if (isScrollingRef.current) return;

    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);

    if (index >= 0 && index < stops.length && index !== selectedStopIndex) {
      setSelectedStopIndex(index);

      const stop = stops[index];
      const lat = stop.location?.lat || stop.job?.location?.lat;
      const lng = stop.location?.lng || stop.job?.location?.lng;

      if (lat && lng && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          400,
        );
      }
    }
  };

  // Helper to focus map & flatlist on a stop
  const zoomToStop = (stop: RouteStop, index: number) => {
    setSelectedStopIndex(index);

    isScrollingRef.current = true;
    flatListRef.current?.scrollToIndex({ index, animated: true });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);

    const lat = stop.location?.lat || stop.job?.location?.lat;
    const lng = stop.location?.lng || stop.job?.location?.lng;

    if (lat && lng && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500,
      );
    }
  };

  const handleNext = () => {
    if (selectedStopIndex < stops.length - 1) {
      zoomToStop(stops[selectedStopIndex + 1], selectedStopIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedStopIndex > 0) {
      zoomToStop(stops[selectedStopIndex - 1], selectedStopIndex - 1);
    }
  };

  // Completed stops count for header
  const completedCount = stops.filter(
    (s) => getStopStatus(s) === "completed",
  ).length;
  const jobStops = stops.filter((s) => s.job);

  const getMarkerStyle = (stop: RouteStop, index: number) => {
    const isSelected = selectedStopIndex === index;
    const isDepot =
      stop.stop_type?.toLowerCase().includes("depot") || !stop.job;
    const status = getStopStatus(stop);

    if (isDepot) {
      return {
        bg: isSelected ? "#2ECC71" : "#4A5568", // Green if selected, Slate Grey if unselected
        border: "#FFFFFF",
        text: isSelected ? "#000000" : "#FFFFFF",
        size: isSelected ? 38 : 32,
        icon: "home" as const,
        iconSize: isSelected ? 16 : 13,
        glow: isSelected,
      };
    }
    if (status === "completed") {
      return {
        bg: isSelected ? "#2ECC71" : "#FFFFFF",
        border: isSelected ? "#FFFFFF" : "#34D399", // ← green border so stem is visible
        text: "#000000",
        size: isSelected ? 38 : 32,
        icon: undefined,
        iconSize: 0,
        glow: isSelected,
      };
    }
    if (status === "failed") {
      return {
        bg: isSelected ? "#2ECC71" : "#EF4444", // Green if selected, Red if failed
        border: "#FFFFFF",
        text: isSelected ? "#000000" : "#FFFFFF",
        size: isSelected ? 38 : 32,
        icon: undefined,
        iconSize: 0,
        glow: isSelected,
      };
    }
    // pending
    return {
      bg: isSelected ? "#2ECC71" : "#3498db", // Green if selected, Blue if pending (OptimoRoute style)
      border: "#FFFFFF",
      text: "#000000", // Black text like OptimoRoutes
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
            backgroundColor: "rgba(110,180,110,0.08)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="map" size={24} color="#6EB46E" />
        </View>
        <ActivityIndicator color="#6EB46E" size="small" />
        <Text
          style={{
            color: "rgba(245,242,235,0.35)",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          Loading route map…
        </Text>
      </View>
    );
  }

  const polylineCoords = stopsWithCoords.map((stop) => {
    const lat = stop.location?.lat || stop.job!.location!.lat;
    const lng = stop.location?.lng || stop.job!.location!.lng;
    return { latitude: lat, longitude: lng };
  });

  // Open native maps for navigation
  const openNavigation = (stop: RouteStop) => {
    const lat = stop.location?.lat || stop.job?.location?.lat;
    const lng = stop.location?.lng || stop.job?.location?.lng;
    if (!lat || !lng) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      default: `google.navigation:q=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      ),
    );
  };

  const renderStopSlide = ({
    item,
    index,
  }: {
    item: RouteStop;
    index: number;
  }) => {
    const isDepot =
      item.stop_type?.toLowerCase().includes("depot") || !item.job;
    const status = getStopStatus(item);

    const statusConfig = {
      completed: {
        color: "#34D399",
        bg: "rgba(52,211,153,0.1)",
        label: "COMPLETED",
        icon: "checkmark-circle" as const,
      },
      failed: {
        color: "#EF4444",
        bg: "rgba(239,68,68,0.1)",
        label: "FAILED",
        icon: "close-circle" as const,
      },
      pending: {
        color: "#6EB46E",
        bg: "rgba(110,180,110,0.1)",
        label: "PENDING",
        icon: "time" as const,
      },
    }[status];

    const title = isDepot
      ? "Warehouse Depot"
      : getJobTypeLabel(item.job?.job_type || "delivery");
    const icon: any = isDepot
      ? "home"
      : getJobTypeIcon(item.job?.job_type || "delivery");
    const address =
      item.address_formatted ||
      item.job?.address_formatted ||
      "No address provided";
    const contactName = item.job?.first_name
      ? `${item.job.first_name}${item.job.last_name ? ` ${item.job.last_name}` : ""}`
      : null;

    return (
      <View style={{ width, paddingHorizontal: 16 }}>
        <View
          style={{
            backgroundColor: "#0A0A0A",
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(110,180,110,0.12)",
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
                  <Ionicons name={icon} size={17} color={statusConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#F5F2EB",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {item.planned_arrival_time && (
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
                        color="rgba(245,242,235,0.4)"
                      />
                      <Text
                        style={{
                          color: "rgba(245,242,235,0.45)",
                          fontSize: 11,
                        }}
                      >
                        ETA {formatTime(item.planned_arrival_time)}
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
                  {isDepot ? "DEPOT" : statusConfig.label}
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
                color="rgba(245,242,235,0.3)"
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  color: "rgba(245,242,235,0.75)",
                  fontSize: 12.5,
                  lineHeight: 18,
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {address}
              </Text>
            </View>

            {/* Row 3: Contact + Stop # chips */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {!isDepot && (
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
                    color="rgba(110,180,110,0.6)"
                  />
                  <Text
                    style={{
                      color: "rgba(245,242,235,0.5)",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    Stop {item.sequence_order ?? index + 1} of {jobStops.length}
                  </Text>
                </View>
              )}
              {contactName && (
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
                    name="person"
                    size={10}
                    color="rgba(110,180,110,0.6)"
                  />
                  <Text
                    style={{
                      color: "rgba(245,242,235,0.5)",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {contactName}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 4: Action buttons */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {/* Navigate button */}
              {!isDepot && status === "pending" && (
                <TouchableOpacity
                  onPress={() => openNavigation(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "#6EB46E",
                    borderRadius: 12,
                    paddingVertical: 11,
                    paddingHorizontal: 16,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={14} color="#000" />
                  <Text
                    style={{ color: "#000", fontSize: 13, fontWeight: "700" }}
                  >
                    Navigate
                  </Text>
                </TouchableOpacity>
              )}

              {/* View Details */}
              <TouchableOpacity
                onPress={() => {
                  if (isDepot) {
                    Alert.alert(
                      "Depot Station",
                      "This stop represents the fleet warehouse base depot.",
                    );
                    return;
                  }
                  router.push({
                    pathname: "/(home)/stop-detail",
                    params: { stopId: item.id },
                  });
                }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  backgroundColor: "rgba(110,180,110,0.08)",
                  borderRadius: 12,
                  paddingVertical: 11,
                  borderWidth: 1,
                  borderColor: "rgba(110,180,110,0.15)",
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    isDepot
                      ? "information-circle-outline"
                      : "document-text-outline"
                  }
                  size={14}
                  color="#6EB46E"
                />
                <Text
                  style={{ color: "#6EB46E", fontSize: 13, fontWeight: "600" }}
                >
                  {isDepot ? "Info" : "Details"}
                </Text>
              </TouchableOpacity>

              {/* Prev / Next */}
              <TouchableOpacity
                onPress={handlePrev}
                disabled={selectedStopIndex === 0}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  opacity: selectedStopIndex === 0 ? 0.25 : 1,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color="#F5F2EB" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                disabled={selectedStopIndex === stops.length - 1}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  opacity: selectedStopIndex === stops.length - 1 ? 0.25 : 1,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={16} color="#F5F2EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-black">
      {/* Map View Panel */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1, width: "100%", height: "100%" }}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: DEFAULT_LATITUDE,
          longitude: DEFAULT_LONGITUDE,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Route Polyline — glow layer + main line */}
        {polylineCoords.length > 1 && (
          <>
            <Polyline
              coordinates={polylineCoords}
              strokeColor="rgba(52,152,219,0.15)"
              strokeWidth={10}
            />
            <Polyline
              coordinates={polylineCoords}
              strokeColor="#3498db"
              strokeWidth={3.5}
              lineDashPattern={Platform.OS === "android" ? [12, 6] : undefined}
            />
          </>
        )}

        {/* Draw Custom Markers */}
        {stops.map((stop, index) => {
          const lat = stop.location?.lat || stop.job?.location?.lat;
          const lng = stop.location?.lng || stop.job?.location?.lng;
          if (lat == null || lng == null) return null;

          const isDepot =
            stop.stop_type?.toLowerCase().includes("depot") || !stop.job;
          const isSelected = selectedStopIndex === index;
          const mStyle = getMarkerStyle(stop, index);

          // Anchor bottom-tip of teardrop pin exactly on coordinate
          const pinW = mStyle.size;
          const pinH = Math.round(pinW * (42 / 32));

          return (
            // <Marker
            //   key={stop.id}
            //   coordinate={{ latitude: lat, longitude: lng }}
            //   onPress={() => zoomToStop(stop, index)}
            //   // anchor x=0.5 centres horizontally; y=1 places bottom of view on coord
            //   anchor={{ x: 0.5, y: 1 }}
            //   tracksViewChanges={tracksChanges}
            // >
            //   <PureMarkerPin
            //     mStyle={mStyle}
            //     label={stop.sequence_order ?? index + 1}
            //     isSelected={isSelected}
            //   />
            // </Marker>
            <Marker
              key={stop.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => zoomToStop(stop, index)}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={tracksChanges}
            >
              <PureMarkerPin
                mStyle={mStyle}
                label={stop.sequence_order ?? index + 1}
                isSelected={isSelected}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* ─── Route Progress Header ─── */}
      {assignedRoute && stops.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 60,
            backgroundColor: "rgba(0,0,0,0.75)",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "rgba(110,180,110,0.15)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(110,180,110,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="navigate" size={14} color="#6EB46E" />
            </View>
            <View>
              <Text
                style={{ color: "#F5F2EB", fontSize: 13, fontWeight: "700" }}
              >
                Active Route
              </Text>
              <Text style={{ color: "rgba(245,242,235,0.45)", fontSize: 10 }}>
                {completedCount}/{jobStops.length} stops completed
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
                backgroundColor: "#6EB46E",
              }}
            />
          </View>
        </View>
      )}

      {/* ─── Floating Controls ─── */}
      {stopsWithCoords.length > 0 && (
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
              const coords = stopsWithCoords.map((stop) => ({
                latitude: stop.location?.lat || stop.job!.location!.lat,
                longitude: stop.location?.lng || stop.job!.location!.lng,
              }));
              mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 80, right: 50, bottom: 240, left: 50 },
                animated: true,
              });
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "rgba(0,0,0,0.75)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(110,180,110,0.2)",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={18} color="#6EB46E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Swipeable Horizontal Stop Carousel Cards list */}
      {stops.length > 0 ? (
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
            data={stops}
            renderItem={renderStopSlide}
            keyExtractor={(item) => String(item.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
          {/* Pagination Dots */}
          {stops.length > 1 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 10,
                gap: 5,
              }}
            >
              {stops.map((_, i) => {
                const isActive = i === selectedStopIndex;
                const stopStatus = getStopStatus(stops[i]);
                const dotColor = isActive
                  ? "#6EB46E"
                  : stopStatus === "completed"
                    ? "#34D399"
                    : stopStatus === "failed"
                      ? "#EF4444"
                      : "rgba(255,255,255,0.15)";
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => zoomToStop(stops[i], i)}
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
            backgroundColor: "#0A0A0A",
            borderRadius: 20,
            padding: 28,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(110,180,110,0.12)",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: "rgba(110,180,110,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="map-outline" size={24} color="#6EB46E" />
          </View>
          <Text
            style={{
              color: "#F5F2EB",
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            No Route Assigned
          </Text>
          <Text
            style={{
              color: "rgba(245,242,235,0.4)",
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
