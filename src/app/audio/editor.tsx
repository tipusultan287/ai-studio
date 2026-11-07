import { router, useLocalSearchParams } from 'expo-router';
import {
  AudioLines,
  Blend,
  Download,
  Gauge,
  History,
  Merge,
  Pause,
  Play,
  Redo2,
  Repeat,
  Scissors,
  SkipBack,
  Sparkles,
  Undo2,
  Volume2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyPicker, type OpenRequest } from '@/features/audio/EmptyPicker';
import { ExportPanel } from '@/features/audio/ExportPanel';
import { computePeaks, meteringPeaks, type Peaks, seedPeaks } from '@/features/audio/peaks';
import { isDirty, outputDuration } from '@/features/audio/render';
import { fmtTime, removeRange, segmentPeaks, sliceRange } from '@/features/audio/timeline';
import { type ToolId, ToolPanel } from '@/features/audio/ToolPanel';
import { initialState, type EditState, type ExportFormat } from '@/features/audio/types';
import { useAudioJobs } from '@/features/audio/useAudioJobs';
import { useHistory } from '@/features/audio/useHistory';
import { usePreview } from '@/features/audio/usePreview';
import { type Selection, Waveform } from '@/features/audio/Waveform';
import { ffmpegAvailable } from '@/lib/ffmpeg';
import { addToLibrary, pickMedia } from '@/lib/media';
import type { Asset } from '@/store/library';
import { useLibrary } from '@/store/library';
import { Button, colors, haptics, IconButton, ProgressOverlay, radius, ScalePressable, Screen, Text, ToolRail, TopBar, type Tool } from '@/ui';

const TOOLS: readonly Tool<ToolId>[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'fade', label: 'Fade', icon: Blend },
  { id: 'volume', label: 'Volume', icon: Volume2 },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'merge', label: 'Merge', icon: Merge },
  { id: 'history', label: 'History', icon: History },
];

export default function AudioEditor() {
  const params = useLocalSearchParams<{ uri?: string; assetId?: string }>();
  const insets = useSafeAreaInsets();
  const libAsset = useLibrary((s) => (params.assetId ? s.assets.find((a) => a.id === params.assetId) : undefined));
  const [opened, setOpened] = useState<OpenRequest | null>(null);
  const libUri = libAsset?.uri;
  const req = useMemo<OpenRequest | null>(
    () => opened ?? (params.uri ? { uri: params.uri, assetId: params.assetId } : libUri ? { uri: libUri, assetId: params.assetId } : null),
    [opened, params.uri, params.assetId, libUri],
  );

  const hist = useHistory();
  const [selection, setSelection] = useState<Selection>(null);
  const [loop, setLoop] = useState(false);
  const [tool, setTool] = useState<ToolId>('trim');
  const [peaks, setPeaks] = useState<{ uri: string; p: Peaks } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('m4a');
  const [result, setResult] = useState<Asset | null>(null);
  const jobs = useAudioJobs();

  const src = hist.state?.sourceUri ?? req?.uri ?? null;
  const preview = usePreview(src, hist.state, selection, loop);
  const knownDur = req?.recording ? req.recording.durationMs / 1000 : 0;
  const baseDur = preview.loadedDuration > 0 ? preview.loadedDuration : knownDur;
  // Before the first edit the state is derived from the loaded source.
  const base = useMemo(() => (req && baseDur > 0 ? initialState(req.uri, baseDur) : null), [req, baseDur]);
  const state: EditState | null = hist.state ?? base;

  const peakUri = state?.sourceUri;
  const peakDur = state?.sourceDuration ?? 0;
  useEffect(() => {
    if (!peakUri || peakDur <= 0) return;
    let alive = true;
    computePeaks(peakUri, peakDur).then((p) => alive && setPeaks({ uri: peakUri, p }));
    return () => {
      alive = false;
    };
  }, [peakUri, peakDur]);

  const view = useMemo(() => {
    if (!state || !peaks || peaks.uri !== state.sourceUri) return [];
    return segmentPeaks(peaks.p.data, peaks.p.perSec, state.segments);
  }, [state, peaks]);

  const open = async (r: OpenRequest) => {
    if (r.recording) {
      const a = await addToLibrary({ uri: r.recording.uri, kind: 'audio', source: 'recording', durationMs: r.recording.durationMs, title: `Recording ${new Date().toLocaleTimeString()}` });
      if (!ffmpegAvailable()) seedPeaks(a.uri, meteringPeaks(r.recording.metering, r.recording.intervalMs));
      setOpened({ ...r, uri: a.uri, assetId: a.id });
    } else setOpened(r);
  };

  const commit = (label: string, patch: Partial<EditState>, coalesce = false) => {
    if (!state) return;
    if (!hist.state) hist.reset(state);
    hist.push(label, { ...state, ...patch }, coalesce);
  };

  const trim = () => {
    if (!state || !selection) return;
    haptics.impact();
    commit('Trim to selection', { segments: sliceRange(state.segments, selection.a, selection.b) });
    setSelection(null);
    preview.seek(0);
  };
  const del = () => {
    if (!state || !selection) return;
    haptics.impact();
    commit('Delete selection', { segments: removeRange(state.segments, selection.a, selection.b) });
    setSelection(null);
  };

  const applyBaked = (label: string, r: { uri: string; duration: number } | undefined) => {
    if (!r || !state) return;
    if (!hist.state) hist.reset(state);
    hist.push(label, initialState(r.uri, r.duration));
    setSelection(null);
  };
  const bake = async () => state && applyBaked('Applied edits', await jobs.bake(state));
  const merge = async (uri: string) => state && applyBaked('Merged clip', await jobs.bake(state, uri));
  const mergeFile = async () => {
    const [p] = await pickMedia('audio');
    if (p) await merge(p.uri);
  };

  const doExport = async () => {
    if (!state) return;
    preview.pause();
    const a = await jobs.exportAudio(state, format, req?.assetId);
    if (a) setResult(a);
  };

  const undo = () => {
    setSelection(null);
    hist.undo();
  };
  const redo = () => {
    setSelection(null);
    hist.redo();
  };

  if (!req) {
    return (
      <Screen header={<TopBar title="Audio editor" subtitle="Pick, record or generate" />}>
        <EmptyPicker onOpen={open} />
      </Screen>
    );
  }

  const length = preview.length;
  const outLen = state ? outputDuration(state) : 0;
  const dirty = state ? isDirty(state) : false;

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <TopBar
          title={libAsset?.title ?? 'Audio editor'}
          subtitle={state ? `${fmtTime(outLen, false)} output${dirty ? ' · edited' : ''}` : 'Loading…'}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          right={
            <>
              <IconButton icon={Undo2} size={36} accessibilityLabel="Undo" disabled={!hist.canUndo} onPress={undo} />
              <IconButton icon={Redo2} size={36} accessibilityLabel="Redo" disabled={!hist.canRedo} onPress={redo} />
              <Button title="Export" icon={Download} size="sm" disabled={!state} onPress={() => (setResult(null), setExportOpen(true))} />
            </>
          }
        />
      }>
      <View style={{ flex: 1, paddingHorizontal: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <Text variant="display" style={{ fontVariant: ['tabular-nums'] }}>
            {fmtTime(preview.time)}
          </Text>
          <Text variant="label" faint style={{ marginBottom: 6, fontVariant: ['tabular-nums'] }}>
            / {fmtTime(length)}
          </Text>
        </View>

        {state ? (
          <Waveform
            peaks={view}
            duration={length}
            time={preview.time}
            selection={selection}
            onSeek={preview.seek}
            onSelect={setSelection}
            synthetic={!!peaks && !peaks.p.real}
          />
        ) : (
          <View style={{ height: 190, borderRadius: radius.lg, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
            <AudioLines size={28} color={colors.textFaint} />
            <Text faint style={{ marginTop: 8 }}>
              Loading audio…
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <IconButton icon={SkipBack} accessibilityLabel="Back to start" onPress={() => preview.seek(selection && loop ? selection.a : 0)} />
          <ScalePressable
            accessibilityLabel={preview.status.playing ? 'Pause' : 'Play'}
            onPress={preview.toggle}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            {preview.status.playing ? <Pause size={28} color={colors.accentInk} fill={colors.accentInk} /> : <Play size={28} color={colors.accentInk} fill={colors.accentInk} style={{ marginLeft: 3 }} />}
          </ScalePressable>
          <IconButton icon={Repeat} accessibilityLabel="Loop selection" active={loop} disabled={!selection} onPress={() => setLoop((l) => !l)} />
        </View>

        <View style={{ flex: 1 }} />
        {state ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
            <ToolPanel
              tool={tool}
              state={state}
              selection={selection}
              canBake={ffmpegAvailable() && dirty}
              entries={hist.entries.length ? hist.entries : [{ label: 'Original', state }]}
              index={Math.max(0, hist.index)}
              onPatch={commit}
              onTrim={trim}
              onDelete={del}
              onSelectAll={() => setSelection({ a: 0, b: length })}
              onClearSelection={() => setSelection(null)}
              onMergeFile={mergeFile}
              onMergeUri={merge}
              onBake={bake}
              onJump={(i) => (setSelection(null), hist.jump(i))}
            />
          </View>
        ) : null}
      </View>
      <View style={{ paddingTop: 8, paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated, marginTop: 12 }}>
        <ToolRail tools={TOOLS} active={tool} onSelect={(id) => (haptics.tap(), setTool(id))} />
      </View>

      {exportOpen && state ? (
        <ExportPanel format={format} onFormat={setFormat} durationSec={outLen} result={result} onExport={doExport} onClose={() => setExportOpen(false)} />
      ) : null}
      <ProgressOverlay visible={jobs.task.running} title="Processing audio" status={jobs.task.status} progress={jobs.task.progress} onCancel={jobs.task.cancel} />
    </Screen>
  );
}
