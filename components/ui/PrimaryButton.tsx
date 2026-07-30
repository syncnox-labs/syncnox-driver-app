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
          borderColor: '#30D158',
          borderWidth: 1.5,
        },
        style,
      ]}
      contentStyle={{ height: 56 }}
      labelStyle={{
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
        color: variant === 'filled' ? '#000000' : '#30D158',
      }}
      buttonColor={variant === 'filled' ? '#30D158' : 'transparent'}
      rippleColor="rgba(48,209,88,0.25)"
    >
      {label}
    </PaperButton>
  );
}
