import { Button as PaperButton } from 'react-native-paper';
import { ViewStyle } from 'react-native';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'filled' | 'outline';
  style?: ViewStyle;
}

/**
 * Syncnox CTA button — wraps React Native Paper's Button.
 * 'filled'  → contained mode (solid green bg)
 * 'outline' → outlined mode (green border, transparent bg)
 *
 * Paper handles accessibility, ripple, loading, and disabled states.
 */
export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'filled',
  style,
}: PrimaryButtonProps) {
  return (
    <PaperButton
      mode={variant === 'filled' ? 'contained' : 'outlined'}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      style={[
        {
          borderRadius: 12,
          height: 56,
          justifyContent: 'center',
        },
        variant === 'outline' && {
          borderColor: '#6EB46E',
          borderWidth: 1.5,
        },
        style,
      ]}
      contentStyle={{ height: 56 }}
      labelStyle={{
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
        color: '#FFFFFF',
      }}
      buttonColor={variant === 'filled' ? '#6EB46E' : 'transparent'}
      rippleColor="rgba(110,180,110,0.25)"
    >
      {label}
    </PaperButton>
  );
}
