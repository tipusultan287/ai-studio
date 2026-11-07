import { Image } from 'expo-image';
import { Eraser, ImagePlus, Undo2, X } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { pickMedia } from '@/lib/media';
import { Chip, colors, IconButton, LabeledSlider, PromptInput, radius, ScalePressable, Segmented, Text } from '@/ui';
import { AI_TOOLS, type AIToolId, RESTYLES, toolById } from './aiTools';

export function ToolPicker({ value, onChange }: { value: AIToolId; onChange: (t: AIToolId) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {AI_TOOLS.map((t) => {
        const on = t.id === value;
        return (
          <ScalePressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={{ width: 92, padding: 10, gap: 8, borderRadius: radius.md, backgroundColor: on ? colors.aiSoft : colors.surface, borderWidth: 1, borderColor: on ? colors.ai : colors.border }}>
            <t.icon size={20} color={on ? colors.ai : colors.textDim} />
            <Text variant="caption" color={on ? colors.text : colors.textDim} numberOfLines={2}>
              {t.label}
            </Text>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

export type Options = { prompt: string; refUri?: string; factor: 2 | 4; styleId: string; brush: number };

export function ToolOptions({
  tool,
  o,
  onChange,
  maskCount,
  onUndoMask,
  onClearMask,
}: {
  tool: AIToolId;
  o: Options;
  onChange: (patch: Partial<Options>) => void;
  maskCount: number;
  onUndoMask: () => void;
  onClearMask: () => void;
}) {
  const t = toolById(tool);
  return (
    <View style={{ gap: 12 }}>
      <Text dim variant="label" style={{ paddingHorizontal: 16 }}>
        {t.blurb}
      </Text>
      {tool === 'remove' ? (
        <View style={{ gap: 6, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <LabeledSlider label="Brush size" value={o.brush} min={8} max={90} format={(v) => `${Math.round(v)}`} onChange={(v) => onChange({ brush: v })} tint={colors.ai} />
            </View>
            <IconButton icon={Undo2} accessibilityLabel="Undo mask stroke" disabled={!maskCount} onPress={onUndoMask} />
            <IconButton icon={Eraser} accessibilityLabel="Clear mask" disabled={!maskCount} onPress={onClearMask} />
          </View>
          <Text variant="caption" faint>
            {maskCount ? 'Cover the whole object, including its shadow.' : 'Paint over the object on the photo above.'}
          </Text>
        </View>
      ) : null}
      {tool === 'upscale' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented options={[{ value: '2', label: '2× · fast' }, { value: '4', label: '4× · max detail' }]} value={String(o.factor) as '2' | '4'} onChange={(v) => onChange({ factor: v === '4' ? 4 : 2 })} />
        </View>
      ) : null}
      {tool === 'restyle' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {RESTYLES.map((r) => (
            <Chip key={r.id} label={r.label} tint={colors.ai} selected={o.styleId === r.id} onPress={() => onChange({ styleId: r.id })} />
          ))}
        </ScrollView>
      ) : null}
      {t.needsPrompt || tool === 'restyle' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <PromptInput value={o.prompt} onChangeText={(p) => onChange({ prompt: p })} placeholder={tool === 'restyle' ? 'Optional extra direction…' : t.placeholder} minHeight={44} />
        </View>
      ) : null}
      {t.suggestions ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {t.suggestions.map((sug) => (
            <Chip key={sug} label={sug} tint={colors.ai} selected={o.prompt === sug} onPress={() => onChange({ prompt: sug })} />
          ))}
        </ScrollView>
      ) : null}
      {tool === 'person' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          {o.refUri ? (
            <View>
              <Image source={{ uri: o.refUri }} style={{ width: 56, height: 56, borderRadius: radius.sm }} contentFit="cover" />
              <IconButton icon={X} size={24} accessibilityLabel="Remove reference" onPress={() => onChange({ refUri: undefined })} style={{ position: 'absolute', top: -8, right: -8 }} />
            </View>
          ) : (
            <ScalePressable
              onPress={async () => {
                const [p] = await pickMedia('image');
                if (p) onChange({ refUri: p.uri });
              }}
              style={{ width: 56, height: 56, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              <ImagePlus size={20} color={colors.textDim} />
            </ScalePressable>
          )}
          <Text variant="caption" faint style={{ flex: 1 }}>
            Optional reference photo — an outfit, hairstyle or person to borrow the look from.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
