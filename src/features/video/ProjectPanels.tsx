import { FolderOpen, Music, Plus, Trash2, Volume2, VolumeX } from 'lucide-react-native';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, ChipRow, IconButton, LabeledSlider, ScalePressable, Segmented, Text, colors, radius } from '@/ui';
import { formatDuration } from '@/lib/media';
import { useLibrary } from '@/store/library';
import type { CanvasAspect, Clip, MusicTrack, TextOverlay, TextPosition, TextStyleId, VideoProject } from './types';

const TEXT_COLORS = ['#FFFFFF', '#C8FF4D', '#FF7A59', '#4DE1FF', '#8B7BFF', '#FFD84D', '#000000'];
const STYLES: { value: TextStyleId; label: string }[] = [
  { value: 'bold', label: 'Bold' },
  { value: 'clean', label: 'Clean' },
  { value: 'box', label: 'Box' },
  { value: 'neon', label: 'Neon' },
];
const POSITIONS: { value: TextPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

export function TextPanel({
  text,
  totalMs,
  onAdd,
  onChange,
  onDelete,
}: {
  text?: TextOverlay;
  totalMs: number;
  onAdd: () => void;
  onChange: (patch: Partial<TextOverlay>, key: string) => void;
  onDelete: () => void;
}) {
  if (!text) {
    return (
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <Text dim>Add a caption at the playhead, then tap it on the timeline to edit.</Text>
        <Button icon={Plus} title="Add text" onPress={onAdd} />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={text.text}
          onChangeText={(v) => onChange({ text: v }, `text:${text.id}`)}
          placeholder="Type something"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        <IconButton icon={Trash2} color={colors.danger} accessibilityLabel="Delete text" onPress={onDelete} />
        <IconButton icon={Plus} accessibilityLabel="Add another text" onPress={onAdd} />
      </View>
      <ChipRow options={STYLES} value={text.style} onChange={(v) => onChange({ style: v }, '')} contentPadding={0} />
      <Segmented options={POSITIONS} value={text.position} onChange={(v) => onChange({ position: v }, '')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {TEXT_COLORS.map((c) => (
          <ScalePressable
            key={c}
            onPress={() => onChange({ color: c }, '')}
            style={[styles.dot, { backgroundColor: c, borderColor: text.color === c ? colors.accent : colors.borderStrong }]}
          />
        ))}
      </View>
      <LabeledSlider label="Size" value={text.size * 100} min={3} max={12} step={0.5} format={(v) => v.toFixed(1)} onChange={(v) => onChange({ size: v / 100 }, `tsize:${text.id}`)} />
      <LabeledSlider
        label="Starts"
        value={text.startMs}
        min={0}
        max={Math.max(1, totalMs)}
        step={100}
        format={formatDuration}
        onChange={(v) => onChange({ startMs: Math.min(v, text.endMs - 200) }, `tstart:${text.id}`)}
      />
      <LabeledSlider
        label="Ends"
        value={text.endMs}
        min={0}
        max={Math.max(1, totalMs)}
        step={100}
        format={formatDuration}
        onChange={(v) => onChange({ endMs: Math.max(v, text.startMs + 200) }, `tend:${text.id}`)}
      />
    </View>
  );
}

export function AudioPanel({
  project,
  clip,
  onClipVolume,
  onMute,
  onMusic,
  onPickDevice,
}: {
  project: VideoProject;
  clip?: Clip;
  onClipVolume: (v: number) => void;
  onMute: (m: boolean) => void;
  onMusic: (m: MusicTrack | null, key?: string) => void;
  onPickDevice: () => void;
}) {
  const audios = useLibrary((s) => s.assets).filter((a) => a.kind === 'audio');
  const m = project.music;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip
          label={project.muteOriginal ? 'Original muted' : 'Original audio on'}
          icon={project.muteOriginal ? VolumeX : Volume2}
          selected={project.muteOriginal}
          onPress={() => onMute(!project.muteOriginal)}
        />
      </View>
      {clip && !project.muteOriginal ? (
        <LabeledSlider label="Clip volume" value={clip.volume * 100} min={0} max={200} step={1} format={(v) => `${Math.round(v)}%`} onChange={(v) => onClipVolume(v / 100)} />
      ) : null}
      <Text variant="label" dim>
        Music
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="From device" icon={FolderOpen} onPress={onPickDevice} />
        {audios.map((a) => (
          <Chip
            key={a.id}
            icon={Music}
            label={a.title.slice(0, 22)}
            tint={colors.cyan}
            selected={m?.assetId === a.id || m?.uri === a.uri}
            onPress={() => onMusic({ uri: a.uri, name: a.title, assetId: a.id, volume: m?.volume ?? 0.8, fadeInMs: m?.fadeInMs ?? 0, fadeOutMs: m?.fadeOutMs ?? 1500 })}
          />
        ))}
      </ScrollView>
      {m ? (
        <>
          <LabeledSlider label="Music volume" value={m.volume * 100} min={0} max={200} step={1} format={(v) => `${Math.round(v)}%`} onChange={(v) => onMusic({ ...m, volume: v / 100 }, 'mvol')} tint={colors.cyan} />
          <LabeledSlider label="Fade in" value={m.fadeInMs / 1000} min={0} max={5} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => onMusic({ ...m, fadeInMs: v * 1000 }, 'mfin')} tint={colors.cyan} />
          <LabeledSlider label="Fade out" value={m.fadeOutMs / 1000} min={0} max={5} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => onMusic({ ...m, fadeOutMs: v * 1000 }, 'mfout')} tint={colors.cyan} />
          <Button size="sm" variant="danger" icon={Trash2} title="Remove music" onPress={() => onMusic(null)} />
        </>
      ) : !audios.length ? (
        <Text variant="caption" faint>
          No audio in your Library yet — generate music or pick a file.
        </Text>
      ) : null}
      {m ? (
        <Text variant="caption" faint>
          Music plays in the exported video (preview plays the clip audio only).
        </Text>
      ) : null}
    </View>
  );
}

const ASPECTS: { value: CanvasAspect; label: string; w: number; h: number }[] = [
  { value: 'original', label: 'Original', w: 22, h: 30 },
  { value: '9:16', label: '9:16', w: 18, h: 32 },
  { value: '1:1', label: '1:1', w: 28, h: 28 },
  { value: '4:5', label: '4:5', w: 24, h: 30 },
  { value: '16:9', label: '16:9', w: 34, h: 19 },
];

export function CanvasPanel({ value, onChange }: { value: CanvasAspect; onChange: (a: CanvasAspect) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ASPECTS.map((a) => {
          const on = a.value === value;
          return (
            <ScalePressable key={a.value} onPress={() => onChange(a.value)} style={{ alignItems: 'center', gap: 8, width: 60 }}>
              <View style={{ height: 36, justifyContent: 'center' }}>
                <View style={{ width: a.w, height: a.h, borderRadius: 4, borderWidth: 2, borderColor: on ? colors.accent : colors.textDim, borderStyle: a.value === 'original' ? 'dashed' : 'solid' }} />
              </View>
              <Text variant="caption" color={on ? colors.accent : colors.textDim}>
                {a.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>
      <Text variant="caption" faint>
        Clips are fitted inside the canvas with black bars.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
