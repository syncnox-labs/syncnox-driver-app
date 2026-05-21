import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-screen Syncnox brand gradient wrapper.
 * Uses expo-linear-gradient; layout handled via NativeWind className.
 */
export default function GradientBackground({ children, className }: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={['#001A0F', '#003220', '#004D2E']}
      locations={[0, 0.55, 1]}
      className={`flex-1 ${className ?? ''}`}
    >
      {children}
    </LinearGradient>
  );
}
