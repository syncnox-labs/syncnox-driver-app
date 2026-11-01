import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { G } from '@/constants/theme';

export function NavigationIcon({ color = G, size = 14 }: { color?: string; size?: number }) {
  return <Ionicons name="navigate" size={size} color={color} accessible={false} />;
}

interface Props {
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Matches the Continue Route button; all navigation actions share this arrow. */
export default function NavigateButton({ onPress, label = 'Navigate', style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.button, style]}>
      <NavigationIcon />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(48,209,88,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(48,209,88,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: G, flexShrink: 1, textAlign: 'center' },
});
