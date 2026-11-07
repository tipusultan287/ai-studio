import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AudioLines, FolderOpen, Mic, Music, Sparkles, Speech, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDuration, pickMedia } from '@/lib/media';
import { useLibrary } from '@/store/library';
import { Button, colors, gradients, radius, ScalePressable, SectionHeader, Text } from '@/ui';
import { Recorder, type Recording } from './Recorder';

export type OpenRequest = { uri: string; assetId?: string; recording?: Recording };

const AI_LINKS = [
  { mode: 'speech', label: 'Text to speech', icon: Speech },
  { mode: 'music', label: 'Music', icon: Music },
  { mode: 'sfx', label: 'Sound FX', icon: Volume2 },
] as const;

export function EmptyPicker({ onOpen }: { onOpen: (r: OpenRequest) => void }) {
  const [rec, setRec] = useState(false);
  const allAssets = useLibrary((s) => s.assets);
  const audio = allAssets.filter((a) => a.kind === 'audio').slice(0, 12);

  const pick = async () => {
    const [p] = await pickMedia('audio');
    if (p) onOpen({ uri: p.uri });
  };

  return (
    <View style={{ gap: 16 }}>
      {rec ? (
        <Recorder onCancel={() => setRec(false)} onDone={(r) => onOpen({ uri: r.uri, recording: r })} />
      ) : (
        <View style={{ borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <LinearGradient colors={['rgba(139,123,255,0.28)', 'rgba(200,77,255,0.06)', 'transparent']} style={{ padding: 22, gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.audio, alignItems: 'center', justifyContent: 'center' }}>
              <AudioLines size={26} color="#fff" />
            </View>
            <Text variant="title">Edit audio</Text>
            <Text dim>Trim, fade, clean up voice, change speed and pitch, add effects and merge clips. Start with a file or record now.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Button title="Import file" icon={FolderOpen} onPress={pick} style={{ flex: 1 }} />
              <Button title="Record" icon={Mic} variant="secondary" onPress={() => setRec(true)} style={{ flex: 1 }} />
            </View>
          </LinearGradient>
        </View>
      )}

      <SectionHeader title="Generate with AI" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {AI_LINKS.map((l) => (
          <ScalePressable
            key={l.mode}
            onPress={() => router.push(`/generate/audio?mode=${l.mode}`)}
            style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <LinearGradient colors={[colors.aiSoft, 'transparent']} style={{ padding: 14, gap: 10, minHeight: 96 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <l.icon size={20} color={colors.ai} />
                <Sparkles size={12} color={colors.ai} />
              </View>
              <Text variant="label">{l.label}</Text>
            </LinearGradient>
          </ScalePressable>
        ))}
      </View>

      <SectionHeader title="From your library" />
      {audio.length === 0 ? (
        <Text faint>No audio in your library yet. Recordings and AI audio show up here.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {audio.map((a) => (
            <ScalePressable
              key={a.id}
              onPress={() => onOpen({ uri: a.uri, assetId: a.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <LinearGradient colors={gradients.audio} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <AudioLines size={18} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text variant="label" numberOfLines={1}>
                  {a.title}
                </Text>
                <Text variant="caption" faint>
                  {[a.source, formatDuration(a.durationMs)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </ScalePressable>
          ))}
        </View>
      )}
    </View>
  );
}
