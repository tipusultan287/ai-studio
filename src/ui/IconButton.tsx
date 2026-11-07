import type { LucideIcon } from 'lucide-react-native';
import { StyleProp, ViewStyle } from 'react-native';
import { ScalePressable } from './Pressable';
import { colors } from './theme';

export function IconButton({
  icon: Icon,
  onPress,
  size = 40,
  color = colors.text,
  bg = colors.surfaceHigh,
  active,
  disabled,
  style,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
  active?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? colors.accent : bg,
          opacity: disabled ? 0.35 : 1,
        },
        style,
      ]}>
      <Icon size={size * 0.46} color={active ? colors.accentInk : color} strokeWidth={2.2} />
    </ScalePressable>
  );
}
