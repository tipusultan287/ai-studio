import { useEventListener } from 'expo';
import { router, useLocalSearchParams } from 'expo-router';
import { AudioLines, Crop, Gauge, Music, Palette, Pause, Play, Redo2, Scissors, SlidersHorizontal, Sparkles, SplitSquareHorizontal, Type, Undo2, Upload } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, IconButton, ProgressOverlay, ToolRail, TopBar, colors, haptics, type Tool } from '@/ui';
import { ffmpegAvailable, FFmpegUnavailableError } from '@/lib/ffmpeg';
import { addToLibrary, pickMedia, type Picked } from '@/lib/media';
import { useTask } from '@/lib/useTask';
import { useLibrary } from '@/store/library';
import { EditorPanel, type ToolId } from '@/features/video/EditorPanel';
import { ExportDone } from '@/features/video/ExportDone';
import { exportProject } from '@/features/video/exportVideo';
import { addClips, patchClip, splitAt, startOf } from '@/features/video/ops';
import { PickSource } from '@/features/video/PickSource';
import { Preview } from '@/features/video/Preview';
import { Timeline, type Selection } from '@/features/video/Timeline';
import { EMPTY_PROJECT, locate, makeClip, type MusicTrack } from '@/features/video/types';
import { usePreview } from '@/features/video/usePreview';
import { useProject } from '@/features/video/useProject';

const TOOLS: readonly Tool<ToolId>[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'split', label: 'Split', icon: SplitSquareHorizontal },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filters', icon: Palette },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'audio', label: 'Audio', icon: AudioLines },
  { id: 'canvas', label: 'Canvas', icon: Crop },
  { id: 'ai', label: 'AI', icon: Sparkles, ai: true },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const fileName = (uri: string) => decodeURIComponent(uri.split('?')[0].split('/').pop() ?? 'Music').replace(/\.[a-z0-9]+$/i, '');

function initialMusic(uri?: string, assetId?: string): MusicTrack | null {
  if (!uri && !assetId) return null;
  const lib = useLibrary.getState();
  const a = (assetId ? lib.get(assetId) : undefined) ?? lib.assets.find((x) => x.uri === uri);
  const u = uri ?? a?.uri;
  if (!u) return null;
  return { uri: u, name: a?.title ?? fileName(u), assetId: a?.id, volume: 0.8, fadeInMs: 0, fadeOutMs: 1500 };
}

export default function VideoEditor() {
  const params = useLocalSearchParams<{ uri?: string; assetId?: string; musicUri?: string; audioUri?: string; audioAssetId?: string }>();
  const insets = useSafeAreaInsets();
  const { project, update, patchAll, reset, undo, redo, canUndo, canRedo } = useProject(EMPTY_PROJECT);
  const pv = usePreview(project);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [result, setResult] = useState<{ uri: string; assetId: string } | null>(null);
  const task = useTask();
  const assetRef = useRef<string | undefined>(undefined);

  // Load initial media from params (video uri / library asset, optional music).
  useEffect(() => {
    const assetId = one(params.assetId);
    const asset = assetId ? useLibrary.getState().get(assetId) : undefined;
    const uri = one(params.uri) ?? (asset?.kind === 'video' ? asset.uri : undefined);
    assetRef.current = asset?.id;
    const music = initialMusic(one(params.musicUri) ?? one(params.audioUri), one(params.audioAssetId));
    reset({
      ...EMPTY_PROJECT,
      music,
      clips: uri ? [makeClip({ uri, durationMs: asset?.durationMs, width: asset?.width, height: asset?.height, thumbUri: asset?.thumbUri })] : [],
    });
  }, [params.uri, params.assetId, params.musicUri, params.audioUri, params.audioAssetId, reset]);

  // First clip appeared → load it into the player.
  const hadClips = useRef(false);
  const { seek } = pv;
  useEffect(() => {
    const has = project.clips.length > 0;
    if (has && !hadClips.current) seek(0);
    hadClips.current = has;
  }, [project.clips.length, seek]);

  // Fill in duration / size for clips opened by bare uri.
  useEventListener(pv.player, 'sourceLoad', ({ duration, availableVideoTracks, videoSource }) => {
    const src = typeof videoSource === 'string' ? videoSource : videoSource && typeof videoSource === 'object' ? videoSource.uri : undefined;
    const size = availableVideoTracks[0]?.size;
    const ms = Math.round(duration * 1000);
    if (!ms || !src) return;
    patchAll((p) => {
      if (!p.clips.some((c) => c.needsProbe && c.uri === src)) return p;
      return {
        ...p,
        clips: p.clips.map((c) =>
          c.needsProbe && c.uri === src
            ? { ...c, durationMs: ms, outMs: ms, inMs: Math.min(c.inMs, ms - 200), width: size?.width ?? c.width, height: size?.height ?? c.height, needsProbe: false }
            : c,
        ),
      };
    });
  });

  // Keep the paused frame in sync with trims / reorders / speed edits.
  const clipSig = project.clips.map((c) => `${c.id}:${c.inMs}:${c.outMs}:${c.speed}`).join('|');
  const { playing, timeMs } = pv;
  const timeRef = useRef(timeMs);
  useEffect(() => {
    timeRef.current = timeMs;
  }, [timeMs]);
  useEffect(() => {
    if (!playing && hadClips.current) seek(timeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the clip layout changes
  }, [clipSig]);

  const loc = locate(project, pv.timeMs);
  const selectedClip = selection?.type === 'clip' ? project.clips.find((c) => c.id === selection.id) : undefined;
  const activeClip = selectedClip ?? (loc ? project.clips[loc.index] : undefined);

  const addPicked = (picked: Picked[]) => {
    const vids = picked.filter((p) => p.kind === 'video');
    if (!vids.length) return;
    const clips = vids.map((p) => makeClip({ uri: p.uri, durationMs: p.durationMs, width: p.width, height: p.height }));
    update((p) => addClips(p, clips, selectedClip?.id));
    setSelection({ type: 'clip', id: clips[0].id });
  };

  const pickMusic = async () => {
    const [a] = await pickMedia('audio');
    if (!a) return;
    update((p) => ({ ...p, music: { uri: a.uri, name: a.name ? fileName(a.name) : fileName(a.uri), volume: p.music?.volume ?? 0.8, fadeInMs: p.music?.fadeInMs ?? 0, fadeOutMs: p.music?.fadeOutMs ?? 1500 } }));
    setTool('audio');
  };

  const onTool = (id: ToolId) => {
    haptics.tap();
    if (id === 'ai') {
      const c = activeClip;
      if (!c) return;
      pv.pause();
      router.push({ pathname: '/video/ai', params: { uri: c.uri, ...(assetRef.current && project.clips.length === 1 ? { assetId: assetRef.current } : {}), tool: 'scene' } });
      return;
    }
    if (id === 'split') {
      const r = splitAt(project, pv.timeMs);
      if (r.newId) {
        update(() => r.project);
        setSelection({ type: 'clip', id: r.newId });
        haptics.impact();
      } else {
        haptics.warn();
      }
      setTool('trim');
      return;
    }
    setTool((t) => (t === id ? null : id));
  };

  const onSelect = (s: Selection) => {
    setSelection(s);
    if (s?.type === 'text') setTool('text');
    else if (s?.type === 'music') setTool('audio');
    else if (s?.type === 'clip' && (!tool || tool === 'text' || tool === 'canvas')) setTool('trim');
    if (s?.type === 'clip') {
      const i = project.clips.findIndex((x) => x.id === s.id);
      if (i >= 0 && loc?.index !== i) pv.seek(startOf(project, s.id) + 1);
    }
  };

  const doExport = async () => {
    pv.pause();
    if (!ffmpegAvailable()) {
      Alert.alert('Export needs the full app', new FFmpegUnavailableError().message);
      return;
    }
    const out = await task.start((opts) => exportProject(project, opts));
    if (!out) return;
    const asset = await addToLibrary({ uri: out.uri, kind: 'video', source: 'edit', durationMs: out.durationMs, parentId: assetRef.current });
    setResult({ uri: asset.uri, assetId: asset.id });
  };

  const header = (
    <TopBar
      title="Edit video"
      subtitle={project.clips.length ? `${project.clips.length} clip${project.clips.length > 1 ? 's' : ''}${project.music ? ' · music' : ''}` : undefined}
      right={
        project.clips.length ? (
          <>
            <IconButton icon={Undo2} size={36} disabled={!canUndo} onPress={undo} accessibilityLabel="Undo" />
            <IconButton icon={Redo2} size={36} disabled={!canRedo} onPress={redo} accessibilityLabel="Redo" />
            <Button size="sm" icon={Upload} title="Export" onPress={doExport} />
          </>
        ) : null
      }
    />
  );

  if (!project.clips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <PickSource
          title="Start a video edit"
          body="Trim, split, add text, music, filters and AI scene changes — then export an MP4."
          onPicked={(p) => addPicked([p])}
          onAsset={(a) => {
            assetRef.current = a.id;
            update((p) => addClips(p, [makeClip({ uri: a.uri, durationMs: a.durationMs, width: a.width, height: a.height, thumbUri: a.thumbUri })]));
          }}
          footer={
            project.music ? (
              <View style={{ alignItems: 'center' }}>
                <Chip icon={Music} label={`Music ready: ${project.music.name.slice(0, 28)}`} selected tint={colors.cyan} />
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <Preview player={pv.player} project={project} timeMs={pv.timeMs} playing={pv.playing} onToggle={pv.toggle} />
      <View style={{ paddingTop: 8, gap: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <IconButton icon={pv.playing ? Pause : Play} size={44} bg={colors.surfaceHigh} onPress={pv.toggle} accessibilityLabel={pv.playing ? 'Pause' : 'Play'} />
        </View>
        <Timeline
          project={project}
          timeMs={pv.timeMs}
          playing={pv.playing}
          selection={selection}
          onSelect={onSelect}
          onSeek={(t) => {
            if (pv.playing) pv.pause();
            pv.seek(t);
          }}
          onTrim={(id, i, o) => update((p) => {
            const c = p.clips.find((x) => x.id === id);
            if (!c) return p;
            const ni = Math.max(0, Math.min(i, o - 200));
            const no = Math.min(c.durationMs, Math.max(o, ni + 200));
            return patchClip(p, id, { inMs: Math.round(ni), outMs: Math.round(no) });
          }, `trim:${id}`)}
          onTrimEnd={() => pv.seek(pv.timeMs)}
          onAddClip={async () => addPicked(await pickMedia('video', { multiple: true }))}
          onAddText={() => {
            setSelection(null);
            setTool('text');
          }}
          onAddMusic={() => setTool('audio')}
        />
        {tool ? (
          <EditorPanel
            tool={tool}
            project={project}
            update={update}
            clip={activeClip}
            selection={selection}
            setSelection={setSelection}
            timeMs={pv.timeMs}
            onPickMusic={pickMusic}
            endGesture={() => pv.seek(pv.timeMs)}
          />
        ) : null}
        <View style={{ paddingBottom: insets.bottom + 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }}>
          <ToolRail tools={TOOLS} active={tool} onSelect={onTool} />
        </View>
      </View>
      <ProgressOverlay visible={task.running} title="Exporting…" status={task.status} progress={task.progress} onCancel={task.cancel} />
      {result ? (
        <ExportDone
          uri={result.uri}
          onOpen={() => router.push({ pathname: '/asset/[id]', params: { id: result.assetId } })}
          onClose={() => setResult(null)}
        />
      ) : null}
    </View>
  );
}
