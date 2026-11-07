import type { LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { ScalePressable } from './Pressable';
import { Text } from './Text';
import { colors, radius } from './theme';

export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  tint = colors.accent,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScalePressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: selected ? tint : colors.surfaceHigh,
          borderWidth: 1,
          borderColor: selected ? tint : colors.border,
        },
        style,
      ]}>
      {Icon ? <Icon size={15} color={selected ? colors.accentInk : colors.textDim} strokeWidth={2.4} /> : null}
      <Text variant="label" color={selected ? colors.accentInk : colors.text}>
        {label}
      </Text>
    </ScalePressable>
  );
}

/** Horizontal single-select chip row. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  tint,
  contentPadding = 16,
}: {
  options: readonly { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  tint?: string;
  contentPadding?: number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: contentPadding }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} icon={o.icon} tint={tint} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
      <View style={{ width: 1 }} />
    </ScrollView>
  );
}
