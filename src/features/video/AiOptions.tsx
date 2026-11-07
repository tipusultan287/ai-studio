import { View } from 'react-native';
import { Chip, PromptInput, Text, colors } from '@/ui';
import { RESTYLES, SCENES, type AiToolId } from './aiPresets';

export type AiForm = { scene: string; custom: string; restyle: string };

/** Per-tool inputs for the AI video screen. */
export function AiOptions({ tool, form, setForm }: { tool: AiToolId; form: AiForm; setForm: (f: AiForm) => void }) {
  const set = (patch: Partial<AiForm>) => setForm({ ...form, ...patch });
  switch (tool) {
    case 'scene':
      return (
        <View style={{ gap: 12 }}>
          <Text variant="label" dim>
            Where should it be?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCENES.map((s) => (
              <Chip
                key={s.label}
                label={`${s.emoji}  ${s.label}`}
                tint={colors.ai}
                selected={form.scene === s.prompt && !form.custom}
                onPress={() => set({ scene: s.prompt, custom: '' })}
              />
            ))}
          </View>
          <PromptInput value={form.custom} onChangeText={(v) => set({ custom: v })} placeholder="…or describe any place: “a misty forest at dawn”" minHeight={56} />
        </View>
      );
    case 'remove':
      return (
        <View style={{ gap: 10 }}>
          <Text variant="label" dim>
            What should disappear?
          </Text>
          <PromptInput value={form.custom} onChangeText={(v) => set({ custom: v })} placeholder="e.g. the person walking in the background" minHeight={56} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['people in the background', 'the logo', 'the text overlay', 'the microphone', 'cars'].map((s) => (
              <Chip key={s} label={s} tint={colors.ai} selected={form.custom === s} onPress={() => set({ custom: s })} />
            ))}
          </View>
        </View>
      );
    case 'edit':
      return (
        <View style={{ gap: 10 }}>
          <Text variant="label" dim>
            Describe the change
          </Text>
          <PromptInput value={form.custom} onChangeText={(v) => set({ custom: v })} placeholder="e.g. give him a red cape, make it snow, replace the cup with a glowing orb" />
        </View>
      );
    case 'restyle':
      return (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RESTYLES.map((r) => (
              <Chip key={r.label} label={r.label} tint={colors.ai} selected={form.restyle === r.prompt} onPress={() => set({ restyle: r.prompt })} />
            ))}
          </View>
          <PromptInput value={form.custom} onChangeText={(v) => set({ custom: v })} placeholder="Optional extra direction" minHeight={48} />
        </View>
      );
    case 'animate':
      return (
        <View style={{ gap: 10 }}>
          <Text variant="label" dim>
            How should it move?
          </Text>
          <PromptInput value={form.custom} onChangeText={(v) => set({ custom: v })} placeholder="e.g. slow push-in, hair blowing in the wind, she smiles" />
        </View>
      );
    case 'cutout':
      return (
        <Text dim>
          Removes the background behind the main subject. The result is a transparent WebM — great for compositing; some players show it on black.
        </Text>
      );
    case 'upscale':
      return <Text dim>Sharpens detail, reduces noise and upscales resolution. Best on short, low-quality clips.</Text>;
  }
}

/** True when the form has what the tool needs. */
export function aiFormReady(tool: AiToolId, f: AiForm): boolean {
  if (tool === 'scene') return !!(f.custom.trim() || f.scene);
  if (tool === 'remove' || tool === 'edit') return !!f.custom.trim();
  if (tool === 'restyle') return !!(f.restyle || f.custom.trim());
  return true;
}
