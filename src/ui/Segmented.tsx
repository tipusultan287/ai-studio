import { View } from 'react-native';
import { ScalePressable } from './Pressable';
import { Text } from './Text';
import { colors, radius } from './theme';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <ScalePressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surfaceHigh : 'transparent' }}>
            <Text variant="label" color={on ? colors.text : colors.textDim}>
              {o.label}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}
