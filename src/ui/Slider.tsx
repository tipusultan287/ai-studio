import RNSlider from '@react-native-community/slider';
import { View } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

/** Labeled slider. `format` renders the value badge. */
export function LabeledSlider({
  label,
  value,
  min = -100,
  max = 100,
  step = 1,
  onChange,
  onComplete,
  format = (v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`),
  tint = colors.accent,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  onComplete?: (v: number) => void;
  format?: (v: number) => string;
  tint?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label" dim>
          {label}
        </Text>
        <Text variant="label" color={value !== 0 ? tint : colors.textFaint} style={{ fontVariant: ['tabular-nums'] }}>
          {format(value)}
        </Text>
      </View>
      <RNSlider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        onSlidingComplete={onComplete}
        minimumTrackTintColor={tint}
        maximumTrackTintColor={colors.surfacePressed}
        thumbTintColor="#FFFFFF"
        style={{ height: 32 }}
      />
    </View>
  );
}
