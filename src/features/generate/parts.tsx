import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, colors, gradients, Text } from '@/ui';

/** Small caps label above a form group. */
export function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ marginTop: 22, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text variant="caption" dim>
            {label.toUpperCase()}
          </Text>
          {hint ? (
            <Text variant="caption" faint>
              {hint}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Horizontal chip row bleeding to the screen edges (inside a 16pt padded Screen). */
export function ChipScroller({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {children}
    </ScrollView>
  );
}

/** Toggle chip: tap to select, tap again to clear. */
export function ToggleChips<T extends string | number>({
  options,
  value,
  onChange,
  tint = colors.ai,
  allowNone = true,
  icon,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  tint?: string;
  allowNone?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <ChipScroller>
      {options.map((o) => (
        <Chip
          key={String(o.value)}
          label={o.label}
          icon={icon}
          tint={tint}
          selected={o.value === value}
          onPress={() => onChange(o.value === value && allowNone ? null : o.value)}
        />
      ))}
    </ChipScroller>
  );
}

/** Hero header with gradient title for generation screens. */
export function GenHero({ icon: Icon, title, body, grad = gradients.ai }: { icon: LucideIcon; title: string; body: string; grad?: readonly string[] }) {
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 6 }}>
      <LinearGradient colors={[grad[0], grad[1], ...grad.slice(2)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
        <Icon size={24} color="#fff" strokeWidth={2.2} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        <Text dim>{body}</Text>
      </View>
    </Animated.View>
  );
}

/** Sticky bottom CTA with a fade-out gradient behind. */
export function GenerateBar({ title, onPress, disabled, icon, caption }: { title: string; onPress: () => void; disabled?: boolean; icon?: LucideIcon; caption?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(9,9,12,0.92)', colors.bg]} style={StyleSheet.absoluteFill} />
      {caption ? (
        <Text variant="caption" faint center style={{ marginBottom: 8 }}>
          {caption}
        </Text>
      ) : null}
      <Button title={title} variant="ai" size="lg" icon={icon} full disabled={disabled} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 28 },
});
