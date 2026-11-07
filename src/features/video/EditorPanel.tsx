import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { colors, radius } from '@/ui';
import { AdjustPanel, FilterPanel, NoClip, SpeedPanel, TrimPanel } from './ClipPanels';
import { addText, deleteClip, deleteText, duplicateClip, moveClip, patchClip, patchText, setTrim, splitAt } from './ops';
import { AudioPanel, CanvasPanel, TextPanel } from './ProjectPanels';
import type { Selection } from './Timeline';
import { projectLength, type Clip, type MusicTrack, type VideoProject } from './types';

export type ToolId = 'trim' | 'split' | 'speed' | 'adjust' | 'filters' | 'text' | 'audio' | 'canvas' | 'ai';

type Update = (fn: (p: VideoProject) => VideoProject, key?: string) => void;

export function EditorPanel({
  tool,
  project,
  update,
  clip,
  selection,
  setSelection,
  timeMs,
  onPickMusic,
  endGesture,
}: {
  tool: ToolId;
  project: VideoProject;
  update: Update;
  clip?: Clip;
  selection: Selection;
  setSelection: (s: Selection) => void;
  timeMs: number;
  onPickMusic: () => void;
  endGesture: () => void;
}) {
  const body = (() => {
    switch (tool) {
      case 'trim':
      case 'split': {
        if (!clip) return <NoClip />;
        const i = project.clips.findIndex((c) => c.id === clip.id);
        return (
          <TrimPanel
            clip={clip}
            onTrim={(a, b) => update((p) => setTrim(p, clip.id, a, b), `trim:${clip.id}`)}
            onTrimEnd={endGesture}
            onSplit={() => {
              const r = splitAt(project, timeMs);
              update(() => r.project);
              if (r.newId) setSelection({ type: 'clip', id: r.newId });
            }}
            onDuplicate={() => {
              const r = duplicateClip(project, clip.id);
              update(() => r.project);
              if (r.newId) setSelection({ type: 'clip', id: r.newId });
            }}
            onDelete={() => {
              update((p) => deleteClip(p, clip.id));
              setSelection(null);
            }}
            onMove={(d) => update((p) => moveClip(p, clip.id, d))}
            canLeft={i > 0}
            canRight={i < project.clips.length - 1}
          />
        );
      }
      case 'speed':
        return clip ? <SpeedPanel clip={clip} onChange={(s) => update((p) => patchClip(p, clip.id, { speed: s }), `speed:${clip.id}`)} /> : <NoClip />;
      case 'adjust':
        return clip ? <AdjustPanel clip={clip} onChange={(a, key) => update((p) => patchClip(p, clip.id, { adjust: a }), key)} /> : <NoClip />;
      case 'filters':
        return clip ? (
          <FilterPanel
            clip={clip}
            onChange={(f) => update((p) => patchClip(p, clip.id, { filter: f }))}
            onApplyAll={() => update((p) => ({ ...p, clips: p.clips.map((c) => ({ ...c, filter: clip.filter, adjust: { ...clip.adjust } })) }))}
          />
        ) : (
          <NoClip />
        );
      case 'text': {
        const text = selection?.type === 'text' ? project.texts.find((t) => t.id === selection.id) : undefined;
        const add = () => {
          const r = addText(project, timeMs);
          update(() => r.project);
          setSelection({ type: 'text', id: r.id });
        };
        return (
          <TextPanel
            text={text}
            totalMs={projectLength(project)}
            onAdd={add}
            onChange={(patch, key) => text && update((p) => patchText(p, text.id, patch), key || undefined)}
            onDelete={() => {
              if (text) update((p) => deleteText(p, text.id));
              setSelection(null);
            }}
          />
        );
      }
      case 'audio':
        return (
          <AudioPanel
            project={project}
            clip={clip}
            onClipVolume={(v) => clip && update((p) => patchClip(p, clip.id, { volume: v }), `vol:${clip.id}`)}
            onMute={(m) => update((p) => ({ ...p, muteOriginal: m }))}
            onMusic={(m: MusicTrack | null, key?: string) => update((p) => ({ ...p, music: m }), key)}
            onPickDevice={onPickMusic}
          />
        );
      case 'canvas':
        return <CanvasPanel value={project.canvas} onChange={(c) => update((p) => ({ ...p, canvas: c }))} />;
      default:
        return null;
    }
  })();
  if (!body) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} style={styles.panel}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={{ padding: 14 }}>{body}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,22,29,0.82)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
