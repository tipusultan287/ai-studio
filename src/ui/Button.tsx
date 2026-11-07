import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ScalePressable } from './Pressable';
import { Text } from './Text';
import { colors, gradients, radius } from './theme';

type Variant = 'primary' | 'ai' | 'secondary' | 'ghost' | 'danger';
export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  full?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon: Icon, loading, disabled, size = 'md', style, full }: ButtonProps) {
  const h = size === 'lg' ? 56 : size === 'sm' ? 36 : 46;
  const fg =
    variant === 'primary' ? colors.accentInk : variant === 'ai' ? '#fff' : variant === 'danger' ? colors.danger : colors.text;
  const content = (
    <View style={[styles.row, { height: h, paddingHorizontal: size === 'sm' ? 14 : 20 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon ? <Icon size={size === 'sm' ? 16 : 19} color={fg} strokeWidth={2.4} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'body'} weight="700" color={fg}>
            {title}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <ScalePressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[{ opacity: disabled ? 0.45 : 1, alignSelf: full ? 'stretch' : 'flex-start' }, style]}>
      {variant === 'primary' || variant === 'ai' ? (
        <LinearGradient
          colors={variant === 'ai' ? [...gradients.ai] : [...gradients.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { borderRadius: h / 2 }]}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            { borderRadius: h / 2 },
            variant === 'secondary' && { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border },
            variant === 'danger' && { backgroundColor: 'rgba(255,77,106,0.12)' },
          ]}>
          {content}
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
export { radius };
