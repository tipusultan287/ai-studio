import { Check, FilePlus, History, Library, Scissors, SquareDashed, Trash2, Wand2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useLibrary } from '@/store/library';
import { Button, Chip, ChipRow, colors, LabeledSlider, radius, ScalePressable, Text } from '@/ui';
import type { Selection } from './Waveform';
import { fmtTime, totalLength } from './timeline';
import { EFFECTS, type EditState, type HistoryEntry } from './types';

export type ToolId = 'trim' | 'fade' | 'volume' | 'speed' | 'effects' | 'merge' | 'history';
export type Patch = (label: string, patch: Partial<EditState>, coalesce?: boolean) => void;

export function ToolPanel(p: {
  tool: ToolId;
  state: EditState;
  selection: Selection;
  canBake: boolean;
  entries: HistoryEntry[];
  index: number;
  onPatch: Patch;
  onTrim: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMergeFile: () => void;
  onMergeUri: (uri: string) => void;
  onBake: () => void;
  onJump: (i: number) => void;
}) {
  const { state: s, selection: sel, onPatch } = p;
  const len = totalLength(s.segments);
  const library = useLibrary((x) => x.assets);

  switch (p.tool) {
    case 'trim':
      return (
        <View style={{ gap: 12 }}>
          <Text variant="caption" faint>
            {sel ? `Selection ${fmtTime(sel.a)} – ${fmtTime(sel.b)} (${(sel.b - sel.a).toFixed(1)}s)` : 'Long-press & drag on the waveform to select a region.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Trim to selection" icon={Scissors} size="sm" disabled={!sel} onPress={p.onTrim} style={{ flex: 1 }} />
            <Button title="Delete" icon={Trash2} size="sm" variant="danger" disabled={!sel} onPress={p.onDelete} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Select all" icon={SquareDashed} onPress={p.onSelectAll} />
            {sel ? <Chip label="Clear selection" onPress={p.onClearSelection} /> : null}
          </View>
        </View>
      );
    case 'fade': {
      const max = Math.max(0.5, Math.min(10, len / 2));
      return (
        <View style={{ gap: 12 }}>
          <LabeledSlider label="Fade in" value={s.fadeIn} min={0} max={max} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => onPatch('Fade in', { fadeIn: v }, true)} />
          <LabeledSlider label="Fade out" value={s.fadeOut} min={0} max={max} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => onPatch('Fade out', { fadeOut: v }, true)} />
        </View>
      );
    }
    case 'volume':
      return (
        <View style={{ gap: 12 }}>
          <LabeledSlider
            label="Gain"
            value={s.gainDb}
            min={-20}
            max={20}
            step={0.5}
            format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`}
            onChange={(v) => onPatch('Gain', { gainDb: v }, true)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Normalize loudness" icon={s.normalize ? Check : Wand2} selected={s.normalize} onPress={() => onPatch(s.normalize ? 'Normalize off' : 'Normalize', { normalize: !s.normalize })} />
          </View>
          <Text variant="caption" faint>
            Normalize targets −16 LUFS (podcast / streaming loudness). Gain above 0 dB previews at full volume.
          </Text>
        </View>
      );
    case 'speed':
      return (
        <View style={{ gap: 12 }}>
          <LabeledSlider label="Speed" value={s.speed} min={0.5} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => onPatch('Speed', { speed: v }, true)} />
          <LabeledSlider
            label="Pitch"
            value={s.pitch}
            min={-12}
            max={12}
            step={1}
            tint={colors.violet}
            format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} st`}
            onChange={(v) => onPatch('Pitch', { pitch: Math.round(v) }, true)}
          />
        </View>
      );
    case 'effects':
      return (
        <View style={{ gap: 12, marginHorizontal: -16 }}>
          <ChipRow options={EFFECTS} value={s.effect} onChange={(v) => onPatch(`Effect: ${EFFECTS.find((e) => e.value === v)?.label}`, { effect: v })} />
          <Text variant="caption" faint style={{ paddingHorizontal: 16 }}>
            Effects are rendered by FFmpeg. Tap Apply to bake and hear them in the preview.
          </Text>
          {p.canBake ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Button title="Apply & preview" icon={Wand2} size="sm" variant="secondary" onPress={p.onBake} />
            </View>
          ) : null}
        </View>
      );
    case 'merge': {
      const others = library.filter((a) => a.kind === 'audio' && a.uri !== s.sourceUri).slice(0, 10);
      return (
        <View style={{ gap: 10 }}>
          <Text variant="caption" faint>
            Append another clip to the end. Current edits are baked first.
          </Text>
          <Button title="Append audio file" icon={FilePlus} size="sm" onPress={p.onMergeFile} />
          {others.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {others.map((a) => (
                <Chip key={a.id} label={a.title} icon={Library} onPress={() => p.onMergeUri(a.uri)} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      );
    }
    case 'history':
      return (
        <ScrollView style={{ maxHeight: 170 }} contentContainerStyle={{ gap: 6 }}>
          {p.entries.map((e, i) => (
            <ScalePressable
              key={i}
              onPress={() => p.onJump(i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                borderRadius: radius.sm,
                backgroundColor: i === p.index ? colors.surfaceHigh : 'transparent',
                opacity: i > p.index ? 0.45 : 1,
              }}>
              <History size={14} color={i === p.index ? colors.accent : colors.textFaint} />
              <Text variant="label" style={{ flex: 1 }}>
                {e.label}
              </Text>
              <Text variant="caption" faint>
                {fmtTime(totalLength(e.state.segments) / e.state.speed, false)}
              </Text>
            </ScalePressable>
          ))}
        </ScrollView>
      );
  }
}
