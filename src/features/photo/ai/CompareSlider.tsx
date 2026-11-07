import { Image } from 'expo-image';
import { ChevronsLeftRight } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { colors, Text } from '@/ui';

/** Before/after split: drag the handle to reveal. "After" is on the left of the divider. */
export function CompareSlider({ before, after, checker }: { before: string; after: string; checker?: boolean }) {
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [pos, setPos] = useState(0.5);
  const pan = usePanGesture({
    disableReanimated: true,
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => w && setPos(Math.max(0, Math.min(1, e.x / w))),
    onUpdate: (e) => w && setPos(Math.max(0, Math.min(1, e.x / w))),
  });
  const x = pos * w;
  const onLayout = (e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
    setH(e.nativeEvent.layout.height);
  };
  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: checker ? '#3A3A44' : '#000' }} onLayout={onLayout}>
        <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="contain" />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: x, overflow: 'hidden' }}>
          <Image source={{ uri: after }} style={{ width: w, height: h }} contentFit="contain" transition={200} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: x - 1, width: 2, backgroundColor: '#fff' }} />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: h / 2 - 20, left: x - 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronsLeftRight size={20} color={colors.accentInk} />
        </View>
        <Badge label="AFTER" style={{ left: 12 }} />
        <Badge label="BEFORE" style={{ right: 12 }} />
      </View>
    </GestureDetector>
  );
}

function Badge({ label, style }: { label: string; style: { left?: number; right?: number } }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.overlay }, style]}>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

