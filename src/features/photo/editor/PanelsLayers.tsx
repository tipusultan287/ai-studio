import { router } from 'expo-router';
import { Brush, Eraser, Eraser as EraseAll, ImageMinus, Layers, Paintbrush, Plus, Scissors, Sparkles, Trash2, Undo2, Wand2, ZoomIn } from 'lucide-react-native';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Chip, colors, IconButton, LabeledSlider, radius, ScalePressable, Segmented, Text } from '@/ui';
import type { Brush as BrushT } from './EditorCanvas';
import type { StickerLayer, TextLayer } from './types';

export const SWATCHES = ['#FFFFFF', '#0B0B0F', '#C8FF4D', '#FF7A59', '#FF4DA6', '#8B7BFF', '#4DE1FF', '#3DDC97', '#FFD84D', '#FF4D6A'];
export const EMOJI = ['😀', '😂', '😍', '🥳', '😎', '🤩', '😭', '🔥', '✨', '💖', '💯', '👑', '🌈', '☀️', '🌙', '⭐', '🎉', '🦋', '🌸', '🍕', '🐶', '🐱', '👀', '💥', '🎧', '📸', '🚀', '❤️', '👍', '🙌'];

export function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
      {SWATCHES.map((c) => (
        <ScalePressable
          key={c}
          accessibilityLabel={`Color ${c}`}
          onPress={() => onChange(c)}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: value === c ? 3 : 1, borderColor: value === c ? colors.accent : colors.borderStrong }}
        />
      ))}
    </ScrollView>
  );
}

export function TextPanel({
  layer,
  onAdd,
  onChange,
  onComplete,
  onDelete,
}: {
  layer: TextLayer | null;
  onAdd: () => void;
  onChange: (patch: Partial<TextLayer>, commit?: boolean) => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  if (!layer)
    return (
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <Button title="Add text" icon={Plus} onPress={onAdd} />
        <Text variant="caption" faint>
          Tap text to edit · drag to move · pinch to resize
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
        <TextInput
          value={layer.text}
          onChangeText={(t) => onChange({ text: t })}
          onEndEditing={onComplete}
          placeholder="Type something"
          placeholderTextColor={colors.textFaint}
          style={{ flex: 1, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border }}
        />
        <IconButton icon={Plus} accessibilityLabel="Add another text" onPress={onAdd} />
        <IconButton icon={Trash2} color={colors.danger} accessibilityLabel="Delete text" onPress={onDelete} />
      </View>
      <Swatches value={layer.color} onChange={(c) => onChange({ color: c }, true)} />
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Segmented
            options={[
              { value: '400', label: 'Regular' },
              { value: '600', label: 'Semi' },
              { value: '800', label: 'Bold' },
            ]}
            value={String(layer.weight) as '400' | '600' | '800'}
            onChange={(v) => onChange({ weight: Number(v) as TextLayer['weight'] }, true)}
          />
        </View>
        <Chip label="Label" selected={layer.bg} onPress={() => onChange({ bg: !layer.bg }, true)} />
      </View>
    </View>
  );
}

export function DrawPanel({ brush, onBrush, onUndoStroke, onClear, hasStrokes }: { brush: BrushT; onBrush: (b: BrushT) => void; onUndoStroke: () => void; onClear: () => void; hasStrokes: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
        <Chip label="Brush" icon={Brush} selected={!brush.erase} onPress={() => onBrush({ ...brush, erase: false })} />
        <Chip label="Eraser" icon={Eraser} selected={brush.erase} onPress={() => onBrush({ ...brush, erase: true })} />
        <View style={{ flex: 1 }} />
        <IconButton icon={Undo2} accessibilityLabel="Undo stroke" disabled={!hasStrokes} onPress={onUndoStroke} />
        <IconButton icon={EraseAll} color={colors.danger} accessibilityLabel="Clear drawing" disabled={!hasStrokes} onPress={onClear} />
      </View>
      {!brush.erase ? <Swatches value={brush.color} onChange={(c) => onBrush({ ...brush, color: c })} /> : null}
      <View style={{ paddingHorizontal: 20 }}>
        <LabeledSlider label="Size" value={brush.size} min={2} max={60} format={(v) => `${Math.round(v)}`} onChange={(v) => onBrush({ ...brush, size: v })} tint={brush.erase ? colors.textDim : brush.color} />
      </View>
    </View>
  );
}

export function StickerPanel({ selected, onAdd, onSize, onComplete, onDelete }: { selected: StickerLayer | null; onAdd: (e: string) => void; onSize: (v: number) => void; onComplete: () => void; onDelete: () => void }) {
  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {EMOJI.map((e) => (
          <ScalePressable key={e} onPress={() => onAdd(e)} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh }}>
            <Text style={{ fontSize: 24, lineHeight: 30 }}>{e}</Text>
          </ScalePressable>
        ))}
      </ScrollView>
      {selected ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 }}>
          <View style={{ flex: 1 }}>
            <LabeledSlider label="Size" value={selected.size} min={24} max={1200} format={(v) => `${Math.round(v)}`} onChange={onSize} onComplete={onComplete} />
          </View>
          <IconButton icon={Trash2} color={colors.danger} accessibilityLabel="Delete sticker" onPress={onDelete} />
        </View>
      ) : (
        <Text variant="caption" faint center>
          Tap to add · drag to move · pinch to resize
        </Text>
      )}
    </View>
  );
}

const AI_TOOLS = [
  { id: 'bg', label: 'Background', icon: Layers },
  { id: 'remove', label: 'Remove object', icon: ImageMinus },
  { id: 'edit', label: 'Edit anything', icon: Wand2 },
  { id: 'cutout', label: 'Cut out', icon: Scissors },
  { id: 'upscale', label: 'Upscale', icon: ZoomIn },
  { id: 'restyle', label: 'Restyle', icon: Paintbrush },
] as const;

/** AI group: flatten current edit, then route to /photo/ai. */
export function AIPanel({ onOpen }: { onOpen: (tool: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {AI_TOOLS.map((t) => (
          <Chip key={t.id} label={t.label} icon={t.icon} tint={colors.ai} onPress={() => onOpen(t.id)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Sparkles size={13} color={colors.ai} />
        <Text variant="caption" faint>
          Uses your current edit as the input
        </Text>
      </View>
    </View>
  );
}

export const openAI = (uri: string, tool: string, assetId?: string) =>
  router.push({ pathname: '/photo/ai', params: { uri, tool, ...(assetId ? { assetId } : {}) } });
