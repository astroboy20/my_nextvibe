import { useTheme } from '@/components/Themed';
import { space } from '@/constants/Spacing';
import { textStyles } from '@/constants/Typography';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  subtitle: string;
}

export default function AuthHeader({ title, subtitle }: Props) {
  const { colors, isDark } = useTheme();

  const logoSource = isDark
    ? require('@/assets/images/logos/new/logo_white_text.png')
    : require('@/assets/images/logos/new/logo_black_text.png');

  return (
    <View style={styles.wrapper}>
      <Image
        source={logoSource}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="NextVibe"
      />
      <View style={styles.textContainer}>
        <Text style={[textStyles.h2, { color: colors.text, textAlign: 'center', marginBottom: space.xs }]}>
          {title}
        </Text>
        <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          {subtitle}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
    paddingTop: space['3xl'],
    paddingBottom: space['2xl'],
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: space.xl,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
