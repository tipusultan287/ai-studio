import { Canvas, Group, SkImage } from '@shopify/react-native-skia';
import { FlipHorizontal2, FlipVertical2, RotateCw, Undo2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { Button, Chip, colors, IconButton, LabeledSlider, radius, ScalePressable, Text } from '@/ui';
import { ADJUST_DEFAULTS, ADJUST_META, type AdjustKey, type EditState } from './types';
import { LOOKS } from './color';
import { TonedImage } from './Scene';

export const CROP_RATIOS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
];

export function CropPanel({
  ratioId,
  onRatio,
  onRotate,
  onFlip,
  onReset,
  onApply,
  canApply,
}: {
  ratioId: string;
  onRatio: (id: string) => void;
  onRotate: () => void;
  onFlip: (axis: 'horizontal' | 'vertical') => void;
  onReset: () => void;
  onApply: () => void;
  canApply: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {CROP_RATIOS.map((r) => (
          <Chip key={r.id} label={r.label} selected={r.id === ratioId} onPress={() => onRatio(r.id)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
        <IconButton icon={RotateCw} accessibilityLabel="Rotate 90 degrees" onPress={onRotate} />
        <IconButton icon={FlipHorizontal2} accessibilityLabel="Flip horizontal" onPress={() => onFlip('horizontal')} />
        <IconButton icon={FlipVertical2} accessibilityLabel="Flip vertical" onPress={() => onFlip('vertical')} />
        <IconButton icon={Undo2} accessibilityLabel="Reset crop" onPress={onReset} />
        <View style={{ flex: 1 }} />
        <Button title="Apply crop" size="sm" onPress={onApply} disabled={!canApply} />
      </View>
    </View>
  );
}

export function AdjustPanel({
  s,
  active,
  onActive,
  onChange,
  onComplete,
}: {
  s: EditState;
  active: AdjustKey;
  onActive: (k: AdjustKey) => void;
  onChange: (k: AdjustKey, v: number) => void;
  onComplete: () => void;
}) {
  const meta = ADJUST_META.find((m) => m.key === active) ?? ADJUST_META[0];
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {ADJUST_META.map((m) => (
          <View key={m.key}>
            <Chip label={m.label} selected={m.key === active} onPress={() => onActive(m.key)} />
            {s.adjust[m.key] !== ADJUST_DEFAULTS[m.key] && m.key !== active ? (
              <View style={{ position: 'absolute', top: 4, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20 }}>
        <LabeledSlider
          label={meta.label}
          value={s.adjust[meta.key]}
          min={meta.min}
          max={meta.max}
          onChange={(v) => onChange(meta.key, v)}
          onComplete={onComplete}
        />
      </View>
    </View>
  );
}

const THUMB = 64;

export function FilterPanel({
  s,
  thumb,
  onPick,
  onAmount,
  onComplete,
}: {
  s: EditState;
  thumb: SkImage | null;
  onPick: (id: string) => void;
  onAmount: (v: number) => void;
  onComplete: () => void;
}) {
  const k = thumb ? THUMB / Math.min(thumb.width(), thumb.height()) : 1;
  const tw = thumb ? thumb.width() : 1;
  const th = thumb ? thumb.height() : 1;
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        {LOOKS.map((l) => {
          const on = l.id === s.filter;
          return (
            <ScalePressable key={l.id} onPress={() => onPick(l.id)} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: THUMB, height: THUMB, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: on ? colors.accent : 'transparent', backgroundColor: colors.surface }}>
                {thumb ? (
                  <Canvas style={{ width: THUMB, height: THUMB }}>
                    <Group transform={[{ translateX: (THUMB - tw * k) / 2 }, { translateY: (THUMB - th * k) / 2 }, { scale: k }]}>
                      <TonedImage image={thumb} s={{ adjust: s.adjust, filter: l.id, filterAmount: 1, width: tw, height: th }} />
                    </Group>
                  </Canvas>
                ) : null}
              </View>
              <Text variant="caption" color={on ? colors.accent : colors.textDim}>
                {l.name}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
      {s.filter !== 'none' ? (
        <View style={{ paddingHorizontal: 20 }}>
          <LabeledSlider label="Intensity" value={Math.round(s.filterAmount * 100)} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => onAmount(v / 100)} onComplete={onComplete} />
        </View>
      ) : null}
    </View>
  );
}
