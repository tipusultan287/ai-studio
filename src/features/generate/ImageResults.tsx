import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, IconButton, radius, ScalePressable, Text } from '@/ui';
import { animateAction, GenResult, ResultActions } from './ResultActions';

/** Results grid (1–4 images) with tap-to-view fullscreen pager. */
export function ImageResults({ results, aspect, onRemix }: { results: GenResult[]; aspect: number; onRemix: () => void }) {
  const { width } = useWindowDimensions();
  const [viewer, setViewer] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const gap = 8;
  const cols = results.length === 1 ? 1 : 2;
  const tileW = (width - 32 - gap * (cols - 1)) / cols;
  const current = results[Math.min(selected, results.length - 1)];
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text variant="heading">Results</Text>
        <Text variant="caption" faint>
          Tap to view · saved to Library
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {results.map((r, i) => (
          <Animated.View key={r.assetId} entering={ZoomIn.delay(i * 70).springify()}>
            <ScalePressable
              onPress={() => {
                setSelected(i);
                setViewer(i);
              }}
              onLongPress={() => setSelected(i)}
              style={[
                styles.tile,
                { width: tileW, height: Math.min(tileW / aspect, cols === 1 ? 520 : 320) },
                results.length > 1 && i === selected && { borderColor: colors.ai, borderWidth: 2 },
              ]}>
              <Image source={{ uri: r.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
            </ScalePressable>
          </Animated.View>
        ))}
      </View>
      {results.length > 1 ? (
        <Text variant="caption" faint style={{ marginTop: 10 }}>
          Actions apply to the highlighted image · long-press to select
        </Text>
      ) : null}
      {current ? <ResultActions kind="image" result={current} onRemix={onRemix} extra={[animateAction(current.uri)]} /> : null}
      <FullscreenViewer results={results} index={viewer} onClose={() => setViewer(null)} onIndex={setSelected} />
    </Animated.View>
  );
}

function FullscreenViewer({ results, index, onClose, onIndex }: { results: GenResult[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const visible = index != null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {visible ? (
          <FlatList
            data={results}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(r) => r.assetId}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const p = Math.round(e.nativeEvent.contentOffset.x / width);
              setPage(p);
              onIndex(p);
            }}
            onLayout={() => setPage(index)}
            renderItem={({ item }) => <Image source={{ uri: item.uri }} style={{ width, height }} contentFit="contain" transition={200} />}
          />
        ) : null}
        <View style={[styles.viewerTop, { top: insets.top + 8 }]}>
          <Text variant="label" color="#fff">
            {results.length > 1 ? `${page + 1} / ${results.length}` : ''}
          </Text>
          <IconButton icon={X} onPress={onClose} bg="rgba(255,255,255,0.14)" accessibilityLabel="Close viewer" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  viewerTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
