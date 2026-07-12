import { layout, radius, space } from '@/constants/Spacing';
import { ActivityIndicator, Platform, Text, TouchableOpacity } from 'react-native';

// ─── PrimaryButton ────────────────────────────────────────────────────────────
// Uses TouchableOpacity — the most reliable cross-platform pressable component.
// Background on outer View to avoid Android elevation/transparency bug.
// No overflow:'hidden' + elevation together (clips children on Android).

interface PrimaryButtonProps {
  label: string;
  loading: boolean;
  onPress: () => void;
  backgroundColor: string;
  disabled?: boolean;
  marginTop?: number;
}

export function PrimaryButton({
  label,
  loading,
  onPress,
  backgroundColor,
  disabled,
  marginTop,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={{
        height: layout.buttonHeight,
        width: '100%',
        borderRadius: radius.lg,
        backgroundColor,
        marginTop: marginTop ?? 0,
        alignItems: 'center',
        justifyContent: 'center',
        // iOS shadow
        shadowColor: '#5B1A57',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        // Android — keep elevation low to avoid distortion with borderRadius
        elevation: Platform.OS === 'android' ? 3 : 0,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={{
            fontFamily: 'NunitoSans_600SemiBold',
            fontSize: 15,
            color: '#fff',
            textAlign: 'center',
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── GoogleFallbackButton ─────────────────────────────────────────────────────

interface GoogleFallbackButtonProps {
  onPress: () => void;
  loading: boolean;
  colors: any;
}

export function GoogleFallbackButton({
  onPress,
  loading,
  colors,
}: GoogleFallbackButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{
        height: layout.buttonHeight,
        width: '100%',
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: space['2xl'],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'NunitoSans_700Bold',
              color: '#4285F4',
              marginRight: 8,
              includeFontPadding: false,
            }}
          >
            G
          </Text>
          <Text
            style={{
              fontFamily: 'NunitoSans_500Medium',
              fontSize: 15,
              color: colors.textSecondary,
              includeFontPadding: false,
            }}
          >
            Continue with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
