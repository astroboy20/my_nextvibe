/**
 * NextVibe Design System — Themed Primitives
 *
 * Provides `useTheme()` and a set of colour-scheme-aware base components.
 * All UI should read colours via `useTheme()` — never hard-code hex values.
 *
 * Requirement 25: Colour scheme switches in real time while the app is
 * foregrounded, without a restart.
 */

import {
  ActivityIndicator,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
  StyleSheet,
  type PressableProps as RNPressableProps,
  type ScrollViewProps as RNScrollViewProps,
  type TextInputProps as RNTextInputProps,
  type TextProps as RNTextProps,
  type ViewProps as RNViewProps,
} from 'react-native';

import { layout, radius, shadows, space } from '@/constants/Spacing';
import { getTheme, type TextVariant, type Theme } from '@/constants/Theme';
import { fontWeight, textStyles } from '@/constants/Typography';
import { useColorScheme } from './useColorScheme';

// ─── useTheme ─────────────────────────────────────────────────────────────────

/**
 * Returns the full NextVibe theme for the active colour scheme.
 *
 * @example
 * const { colors, textStyles, space } = useTheme();
 */
export function useTheme(): Theme {
  const scheme = useColorScheme() ?? 'light';
  return getTheme(scheme);
}

// ─── Text ─────────────────────────────────────────────────────────────────────

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  /** Override colour with a raw hex string when needed */
  color?: string;
};

export function Text({ style, variant = 'body', color, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[textStyles[variant], { color: color ?? colors.text }, style]}
      {...rest}
    />
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export type ViewProps = RNViewProps & {
  /** Override background colour */
  bg?: string;
};

export function View({ style, bg, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <RNView
      style={[{ backgroundColor: bg ?? colors.background }, style]}
      {...rest}
    />
  );
}

// ─── Surface ──────────────────────────────────────────────────────────────────
// A raised View that uses `colors.surface` (slightly off-background).

export function Surface({ style, ...rest }: RNViewProps) {
  const { colors } = useTheme();
  return (
    <RNView
      style={[{ backgroundColor: colors.surface }, style]}
      {...rest}
    />
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export type CardProps = RNViewProps & {
  /** Extra elevation level: 'sm' | 'md' | 'lg' */
  shadow?: keyof typeof shadows;
};

export function Card({ style, shadow = 'sm', ...rest }: CardProps) {
  const { colors } = useTheme();
  return (
    <RNView
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: space.xl,
        },
        shadows[shadow],
        style,
      ]}
      {...rest}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
// Full-screen container with standard padding.

export function Screen({ style, ...rest }: RNViewProps) {
  const { colors } = useTheme();
  return (
    <RNView
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: layout.screenPaddingH,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// ─── ScrollScreen ─────────────────────────────────────────────────────────────

export function ScrollScreen({
  style,
  contentContainerStyle,
  ...rest
}: RNScrollViewProps) {
  const { colors } = useTheme();
  return (
    <RNScrollView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      contentContainerStyle={[
        { paddingHorizontal: layout.screenPaddingH, paddingBottom: space['3xl'] },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    />
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({
  style,
  vertical = false,
}: {
  style?: RNViewProps['style'];
  vertical?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <RNView
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.divider }
          : { height: 1, width: '100%', backgroundColor: colors.divider },
        style,
      ]}
    />
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export type InputProps = RNTextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ style, label, error, ...rest }: InputProps) {
  const { colors } = useTheme();
  return (
    <RNView>
      {label ? (
        <RNText
          style={[
            textStyles.label,
            { color: colors.textSecondary, marginBottom: space.xs },
          ]}
        >
          {label}
        </RNText>
      ) : null}

      <RNTextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.secondary : colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />

      {error ? (
        <RNText
          style={[
            textStyles.caption,
            { color: colors.secondary, marginTop: space.xs },
          ]}
        >
          {error}
        </RNText>
      ) : null}
    </RNView>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';

export type ButtonProps = RNPressableProps & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  title,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  const heights: Record<ButtonSize, number> = {
    sm: layout.buttonHeightSm,
    md: layout.buttonHeight,
    lg: layout.buttonHeight + 8,
  };

  const bg: Record<ButtonVariant, string> = {
    primary:   colors.primary,
    secondary: colors.secondary,
    outline:   'transparent',
    ghost:     'transparent',
  };

  const fg: Record<ButtonVariant, string> = {
    primary:   colors.textOnPrimary,
    secondary: colors.textOnSecondary,
    outline:   colors.primary,
    ghost:     colors.primary,
  };

  const borderColor: Record<ButtonVariant, string | undefined> = {
    primary:   undefined,
    secondary: undefined,
    outline:   colors.primary,
    ghost:     undefined,
  };

  const isDisabled = disabled === true || loading;
  const labelVariant = size === 'sm' ? 'buttonSm' : 'button';
  const shadow = variant === 'primary' ? shadows.primaryGlow : shadows.none;

  return (
    <RNPressable
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: heights[size],
          backgroundColor: bg[variant],
          borderRadius: radius.md,
          borderWidth: borderColor[variant] ? 1.5 : 0,
          borderColor: borderColor[variant],
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space['2xl'],
          alignSelf: fullWidth ? undefined : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
        },
        shadow,
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <RNText style={[textStyles[labelVariant], { color: fg[variant] }]}>
          {title}
        </RNText>
      )}
    </RNPressable>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
// Used for: event categories, game types, ticket status, leaderboard rank.

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export function Badge({
  label,
  variant = 'primary',
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const { colors, semantic } = useTheme();

  const bgMap: Record<BadgeVariant, string> = {
    primary:   colors.primary,
    secondary: colors.secondary,
    success:   semantic.success,
    warning:   semantic.warning,
    error:     semantic.error,
    info:      semantic.info,
    neutral:   colors.surfaceElevated,
  };

  const fgMap: Record<BadgeVariant, string> = {
    primary:   '#fff',
    secondary: '#fff',
    success:   '#fff',
    warning:   '#fff',
    error:     '#fff',
    info:      '#fff',
    neutral:   colors.textSecondary,
  };

  return (
    <RNView
      style={{
        backgroundColor: bgMap[variant],
        borderRadius: radius.full,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <RNText
        style={[
          textStyles.caption,
          { color: fgMap[variant], fontWeight: fontWeight.semibold },
        ]}
      >
        {label}
      </RNText>
    </RNView>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
// Used across: VibePod, Leaderboard, DM list, VibeTribe feed, Profile.

import { Image, type ImageSourcePropType } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function Avatar({
  source,
  initials,
  size = 'md',
  style,
}: {
  source?: ImageSourcePropType;
  initials?: string;
  size?: AvatarSize;
  style?: RNViewProps['style'];
}) {
  const { colors } = useTheme();

  const sizeMap: Record<AvatarSize, number> = {
    xs: layout.avatarXs,
    sm: layout.avatarSm,
    md: layout.avatarMd,
    lg: layout.avatarLg,
    xl: layout.avatarXl,
  };

  const dim = sizeMap[size];

  return (
    <RNView
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colors.primary,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          resizeMode="cover"
        />
      ) : (
        <RNText
          style={[
            textStyles.label,
            { color: '#fff', fontSize: dim * 0.38 },
          ]}
        >
          {(initials ?? '?').slice(0, 2).toUpperCase()}
        </RNText>
      )}
    </RNView>
  );
}

// ─── Private styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  input: {
    height: layout.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    ...textStyles.body,
  },
});
