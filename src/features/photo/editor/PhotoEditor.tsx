import { useImage } from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { Crop, Eye, ImagePlus, Pencil, Redo2, SlidersHorizontal, Smile, Sparkles, Type, Undo2, Wand2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addToLibrary } from '@/lib/media';
import type { Asset } from '@/store/library';
import { Button, colors, haptics, IconButton, ScalePressable, Text, type Tool, ToolRail } from '@/ui';
import { applyGeometry, type GeoOp, normalizeImage, renderToFile } from '../common/imageIO';
import { EditorCanvas, type Brush, type Selection } from './EditorCanvas';
import { ExportSheet, type ExportFormat } from './ExportSheet';
import { centeredRect, cropLayers, flipLayers, type Rect, rotateLayers } from './geometry';
import { AdjustPanel, CROP_RATIOS, CropPanel, FilterPanel } from './PanelsBasic';
import { AIPanel, DrawPanel, openAI, StickerPanel, TextPanel } from './PanelsLayers';
import { SceneContent } from './Scene';
import { ADJUST_DEFAULTS, type AdjustKey, type EditState, type TextLayer, uid } from './types';
import { useHistory } from './useHistory';

type ToolId = 'crop' | 'adjust' | 'filters' | 'text' | 'draw' | 'stickers' | 'ai';
const TOOLS: Tool<ToolId>[] = [
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filters', icon: Wand2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'draw', label: 'Draw', icon: Pencil },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'ai', label: 'AI', icon: Sparkles, ai: true },
];

export function PhotoEditor({ uri, assetId, onChangePhoto }: { uri: string; assetId?: string; onChangePhoto: () => void }) {
  const insets = useSafeAreaInsets();
  const h = useHistory();
  const s = h.state;
  const [origUri, setOrigUri] = useState<string | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolId | null>('adjust');
  const [adjKey, setAdjKey] = useState<AdjustKey>('exposure');
  const [brush, setBrush] = useState<Brush>({ color: '#C8FF4D', size: 10, erase: false });
  const [selection, setSelection] = useState<Selection>(null);
  const [ratioId, setRatioId] = useState('free');
  const [cropRect, setCropRect] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 });
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exported, setExported] = useState<Asset | null>(null);

  const { reset } = h;
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const n = await normalizeImage(uri);
        const t = await (await ImageManipulator.manipulate(n.uri).resize({ width: 160 }).renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
        if (!alive) return;
        setOrigUri(n.uri);
        setThumbUri(t.uri);
        setCropRect({ x: 0, y: 0, width: n.width, height: n.height });
        reset({ baseUri: n.uri, width: n.width, height: n.height, adjust: ADJUST_DEFAULTS, filter: 'none', filterAmount: 1, strokes: [], texts: [], stickers: [] });
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri, reset]);

  const image = useImage(s?.baseUri ?? null);
  const original = useImage(origUri);
  const thumb = useImage(thumbUri);

  if (loadError)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
        <Text variant="heading">Couldn’t open this photo</Text>
        <Text dim center>
          {loadError}
        </Text>
        <Button title="Choose another" icon={ImagePlus} onPress={onChangePhoto} />
      </View>
    );

  const selectTool = (t: ToolId) => {
    h.commit();
    haptics.tap();
    const next = tool === t ? null : t;
    setTool(next);
    if (next === 'crop' && s) {
      setRatioId('free');
      setCropRect({ x: 0, y: 0, width: s.width, height: s.height });
    }
    if (next !== 'text' && next !== 'stickers') setSelection(null);
  };

  const geometry = async (op: GeoOp, layers: (st: EditState) => Partial<EditState>) => {
    if (!s) return;
    setBusy(true);
    try {
      const r = await applyGeometry(s.baseUri, op);
      const next: EditState = { ...s, ...layers(s), baseUri: r.uri, width: r.width, height: r.height };
      h.apply(next);
      setCropRect({ x: 0, y: 0, width: r.width, height: r.height });
      setRatioId('free');
      haptics.impact();
    } catch (e) {
      Alert.alert('Crop failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = () => {
    if (!s) return;
    const r = { originX: Math.round(cropRect.x), originY: Math.round(cropRect.y), width: Math.round(cropRect.width), height: Math.round(cropRect.height) };
    r.width = Math.min(r.width, s.width - r.originX);
    r.height = Math.min(r.height, s.height - r.originY);
    geometry({ crop: r }, (st) => cropLayers(st, { x: r.originX, y: r.originY, width: r.width, height: r.height }));
  };

  const selectedText = s && selection?.kind === 'text' ? (s.texts.find((t) => t.id === selection.id) ?? null) : null;
  const selectedSticker = s && selection?.kind === 'sticker' ? (s.stickers.find((t) => t.id === selection.id) ?? null) : null;

  const patchText = (patch: Partial<TextLayer>, commit?: boolean) => {
    if (!s || !selectedText) return;
    const next = { ...s, texts: s.texts.map((t) => (t.id === selectedText.id ? { ...t, ...patch } : t)) };
    if (commit) h.apply(next);
    else h.draft(next);
  };

  const addText = () => {
    if (!s) return;
    const t: TextLayer = { id: uid(), text: 'Your text', x: s.width / 2, y: s.height / 2, size: Math.round(Math.min(s.width, s.height) * 0.09), color: '#FFFFFF', weight: 800, bg: false };
    h.apply({ ...s, texts: [...s.texts, t] });
    setSelection({ kind: 'text', id: t.id });
  };

  const addSticker = (emoji: string) => {
    if (!s) return;
    const st = { id: uid(), emoji, x: s.width / 2 + (Math.random() - 0.5) * s.width * 0.2, y: s.height / 2 + (Math.random() - 0.5) * s.height * 0.2, size: Math.round(Math.min(s.width, s.height) * 0.22) };
    h.apply({ ...s, stickers: [...s.stickers, st] });
    setSelection({ kind: 'sticker', id: st.id });
  };

  const doExport = async (fmt: ExportFormat) => {
    if (!s || !image) return;
    setBusy(true);
    try {
      const out = await renderToFile(<SceneContent image={image} s={s} />, s.width, s.height, fmt);
      const asset = await addToLibrary({ uri: out, kind: 'image', source: 'edit', parentId: assetId, width: s.width, height: s.height });
      haptics.success();
      setExported(asset);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toAI = async (aiTool: string) => {
    if (!s || !image) return;
    h.commit();
    setBusy(true);
    try {
      const untouched = s.filter === 'none' && !s.strokes.length && !s.texts.length && !s.stickers.length && Object.values(s.adjust).every((v) => v === 0);
      const out = untouched ? s.baseUri : await renderToFile(<SceneContent image={image} s={s} />, s.width, s.height, /\.png$/i.test(s.baseUri) ? 'png' : 'jpg', true);
      openAI(out, aiTool, assetId);
    } catch (e) {
      Alert.alert('Could not prepare image', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!h.dirty) return router.canGoBack() ? router.back() : router.replace('/');
    Alert.alert('Discard edits?', 'Your changes haven’t been exported.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => (router.canGoBack() ? router.back() : router.replace('/')) },
    ]);
  };

  const ratio = CROP_RATIOS.find((r) => r.id === ratioId)?.ratio ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton icon={X} accessibilityLabel="Close editor" onPress={close} />
        <View style={{ flex: 1 }} />
        <IconButton icon={Undo2} accessibilityLabel="Undo" disabled={!h.canUndo} onPress={h.undo} />
        <IconButton icon={Redo2} accessibilityLabel="Redo" disabled={!h.canRedo} onPress={h.redo} />
        <ScalePressable
          accessibilityLabel="Hold to compare with original"
          onPressIn={() => setComparing(true)}
          onPressOut={() => setComparing(false)}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: comparing ? colors.accent : colors.surfaceHigh }}>
          <Eye size={18} color={comparing ? colors.accentInk : colors.text} />
        </ScalePressable>
        <Button title="Export" size="sm" disabled={!s || !image} onPress={() => { h.commit(); setExported(null); setExportOpen(true); }} />
      </View>

      <View style={{ flex: 1 }}>
        {s && image ? (
          <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
            <EditorCanvas
              image={image}
              original={original}
              s={s}
              mode={tool}
              comparing={comparing}
              brush={brush}
              selection={selection}
              crop={cropRect}
              cropRatio={ratio}
              onCropChange={setCropRect}
              onSelect={(sel) => {
                setSelection(sel);
                if (sel && tool !== 'text' && tool !== 'stickers') setTool(sel.kind === 'text' ? 'text' : 'stickers');
              }}
              onTapText={(id) => {
                setSelection({ kind: 'text', id });
                setTool('text');
              }}
              onStroke={(st) => h.apply({ ...s, strokes: [...s.strokes, st] })}
              onDraft={h.draft}
              onCommit={h.commit}
            />
          </Animated.View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
        {comparing ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.overlay }}>
            <Text variant="caption">ORIGINAL</Text>
          </View>
        ) : null}
        {busy ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : null}
      </View>

      <BlurView intensity={40} tint="dark" style={{ paddingBottom: insets.bottom + 4, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(9,9,12,0.82)' }}>
        {s && tool ? (
          <Animated.View key={tool} entering={FadeInDown.duration(220)} style={{ paddingTop: 14, paddingBottom: 6, minHeight: 112 }}>
            {tool === 'crop' ? (
              <CropPanel
                ratioId={ratioId}
                onRatio={(id) => {
                  setRatioId(id);
                  setCropRect(centeredRect(s.width, s.height, CROP_RATIOS.find((r) => r.id === id)?.ratio ?? null));
                }}
                onRotate={() => geometry({ rotate: 90 }, rotateLayers)}
                onFlip={(axis) => geometry({ flip: axis }, (st) => flipLayers(st, axis))}
                onReset={() => {
                  setRatioId('free');
                  setCropRect({ x: 0, y: 0, width: s.width, height: s.height });
                }}
                onApply={applyCrop}
                canApply={!busy && (cropRect.width < s.width - 1 || cropRect.height < s.height - 1)}
              />
            ) : tool === 'adjust' ? (
              <AdjustPanel s={s} active={adjKey} onActive={setAdjKey} onChange={(k, v) => h.draft({ ...s, adjust: { ...s.adjust, [k]: v } })} onComplete={h.commit} />
            ) : tool === 'filters' ? (
              <FilterPanel s={s} thumb={thumb} onPick={(id) => h.apply({ ...s, filter: id, filterAmount: id === s.filter ? s.filterAmount : 1 })} onAmount={(v) => h.draft({ ...s, filterAmount: v })} onComplete={h.commit} />
            ) : tool === 'text' ? (
              <TextPanel layer={selectedText} onAdd={addText} onChange={patchText} onComplete={h.commit} onDelete={() => { h.apply({ ...s, texts: s.texts.filter((t) => t.id !== selectedText?.id) }); setSelection(null); }} />
            ) : tool === 'draw' ? (
              <DrawPanel brush={brush} onBrush={setBrush} hasStrokes={s.strokes.length > 0} onUndoStroke={() => h.apply({ ...s, strokes: s.strokes.slice(0, -1) })} onClear={() => h.apply({ ...s, strokes: [] })} />
            ) : tool === 'stickers' ? (
              <StickerPanel
                selected={selectedSticker}
                onAdd={addSticker}
                onSize={(v) => selectedSticker && h.draft({ ...s, stickers: s.stickers.map((t) => (t.id === selectedSticker.id ? { ...t, size: v } : t)) })}
                onComplete={h.commit}
                onDelete={() => { h.apply({ ...s, stickers: s.stickers.filter((t) => t.id !== selectedSticker?.id) }); setSelection(null); }}
              />
            ) : (
              <AIPanel onOpen={toAI} />
            )}
          </Animated.View>
        ) : null}
        <View style={{ paddingTop: 4 }}>
          <ToolRail tools={TOOLS} active={tool} onSelect={selectTool} />
        </View>
      </BlurView>

      <ExportSheet visible={exportOpen} width={s?.width ?? 0} height={s?.height ?? 0} busy={busy} result={exported} onExport={doExport} onClose={() => setExportOpen(false)} />
    </View>
  );
}
