import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
  isBlack?: boolean;
}

/**
 * Full-screen Syncnox brand gradient wrapper.
 * Uses expo-linear-gradient; layout handled via NativeWind className.
 */
export default function GradientBackground({
  children,
  className,
  isBlack,
}: GradientBackgroundProps) {
  if (isBlack) {
    return (
      <View className={`flex-1 bg-bg-deep ${className ?? ""}`}>{children}</View>
    );
  }

  return (
    <LinearGradient
      colors={["#0D0F0E", "#131917", "#19201E"]}
      locations={[0, 0.55, 1]}
      className={`flex-1 ${className ?? ""}`}
    >
      {children}
    </LinearGradient>
  );
}
