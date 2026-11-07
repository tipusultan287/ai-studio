import { ArrowLeft, ArrowRight, Copy, Scissors, Trash2 } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, LabeledSlider, ScalePressable, Text, colors, radius } from '@/ui';
import { formatDuration } from '@/lib/media';
import { FILTERS } from './filters';
import { clipLength, NEUTRAL_ADJUST, type Adjustments, type Clip } from './types';

export function NoClip({ label = 'Tap a clip on the timeline to edit it.' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 18, alignItems: 'center' }}>
      <Text dim>{label}</Text>
    </View>
  );
}

const fmtMs = (ms: number) => `${formatDuration(ms)}.${Math.floor((ms % 1000) / 100)}`;

export function TrimPanel({
  clip,
  onTrim,
  onTrimEnd,
  onSplit,
  onDuplicate,
  onDelete,
  onMove,
  canLeft,
  canRight,
}: {
  clip: Clip;
  onTrim: (inMs: number, outMs: number) => void;
  onTrimEnd: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (d: -1 | 1) => void;
  canLeft: boolean;
  canRight: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      <LabeledSlider
        label="Start"
        value={clip.inMs}
        min={0}
        max={clip.durationMs}
        step={50}
        format={fmtMs}
        onChange={(v) => onTrim(v, clip.outMs)}
        onComplete={onTrimEnd}
      />
      <LabeledSlider
        label="End"
        value={clip.outMs}
        min={0}
        max={clip.durationMs}
        step={50}
        format={fmtMs}
        onChange={(v) => onTrim(clip.inMs, v)}
        onComplete={onTrimEnd}
      />
      <Text variant="caption" faint>
        Clip length {fmtMs(clipLength(clip))} · drag the lime handles on the timeline to trim
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Button size="sm" variant="secondary" icon={Scissors} title="Split" onPress={onSplit} />
        <Button size="sm" variant="secondary" icon={Copy} title="Duplicate" onPress={onDuplicate} />
        <Button size="sm" variant="secondary" icon={ArrowLeft} title="Move" disabled={!canLeft} onPress={() => onMove(-1)} />
        <Button size="sm" variant="secondary" icon={ArrowRight} title="Move" disabled={!canRight} onPress={() => onMove(1)} />
        <Button size="sm" variant="danger" icon={Trash2} title="Delete" onPress={onDelete} />
      </ScrollView>
    </View>
  );
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export function SpeedPanel({ clip, onChange }: { clip: Clip; onChange: (s: number, final?: boolean) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <LabeledSlider
        label="Speed"
        value={clip.speed}
        min={0.25}
        max={4}
        step={0.05}
        format={(v) => `${v.toFixed(2)}x`}
        onChange={(v) => onChange(Math.round(v * 100) / 100)}
        onComplete={(v) => onChange(Math.round(v * 100) / 100, true)}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SPEEDS.map((s) => (
          <ScalePressable key={s} onPress={() => onChange(s, true)} style={[styles.pill, clip.speed === s && styles.pillOn]}>
            <Text variant="label" color={clip.speed === s ? colors.accentInk : colors.text}>
              {s}x
            </Text>
          </ScalePressable>
        ))}
      </View>
      <Text variant="caption" faint>
        Result length {fmtMs(clipLength(clip))}. Audio pitch is preserved.
      </Text>
    </View>
  );
}

export function AdjustPanel({ clip, onChange }: { clip: Clip; onChange: (a: Adjustments, key: string) => void }) {
  const a = clip.adjust;
  const set = (k: keyof Adjustments) => (v: number) => onChange({ ...a, [k]: Math.round(v) }, `adjust:${k}:${clip.id}`);
  return (
    <View style={{ gap: 6 }}>
      <LabeledSlider label="Brightness" value={a.brightness} onChange={set('brightness')} />
      <LabeledSlider label="Contrast" value={a.contrast} onChange={set('contrast')} />
      <LabeledSlider label="Saturation" value={a.saturation} onChange={set('saturation')} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="caption" faint>
          Preview is approximate · exact on export
        </Text>
        <Button size="sm" variant="ghost" title="Reset" onPress={() => onChange({ ...NEUTRAL_ADJUST }, 'adjust:reset')} />
      </View>
    </View>
  );
}

export function FilterPanel({ clip, onChange, onApplyAll }: { clip: Clip; onChange: (id: string) => void; onApplyAll: () => void }) {
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {FILTERS.map((f) => {
          const on = clip.filter === f.id;
          return (
            <ScalePressable key={f.id} onPress={() => onChange(f.id)} style={{ alignItems: 'center', gap: 6, width: 64 }}>
              <View style={[styles.swatch, { backgroundColor: f.swatch, borderColor: on ? colors.accent : colors.border }]} />
              <Text variant="caption" color={on ? colors.accent : colors.textDim} numberOfLines={1}>
                {f.label}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
      <Button size="sm" variant="secondary" title="Apply to all clips" onPress={onApplyAll} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.accent },
  swatch: { width: 56, height: 56, borderRadius: 16, borderWidth: 2 },
});
