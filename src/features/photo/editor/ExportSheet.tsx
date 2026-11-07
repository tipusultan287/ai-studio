import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, FolderOpen, PenLine } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Asset } from '@/store/library';
import { Button, colors, radius, Segmented, Text } from '@/ui';
import { ResultActions } from '../common/ResultActions';

export type ExportFormat = 'jpg' | 'png';

export function ExportSheet({
  visible,
  width,
  height,
  busy,
  result,
  onExport,
  onClose,
}: {
  visible: boolean;
  width: number;
  height: number;
  busy: boolean;
  result: Asset | null;
  onExport: (f: ExportFormat) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState<ExportFormat>('jpg');
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={busy ? undefined : onClose} />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: insets.bottom + 20, gap: 16, borderWidth: 1, borderColor: colors.border }}>
          {result ? (
            <>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Image source={{ uri: result.uri }} style={{ width: 64, height: 64, borderRadius: radius.sm }} contentFit="cover" />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={16} color={colors.success} />
                    <Text variant="heading">Saved to Library</Text>
                  </View>
                  <Text dim variant="label">
                    {result.width ?? width} × {result.height ?? height} · {format.toUpperCase()}
                  </Text>
                </View>
              </View>
              <ResultActions
                uri={result.uri}
                extra={[
                  { title: 'Keep editing', icon: PenLine, onPress: onClose, variant: 'primary' },
                  { title: 'View', icon: FolderOpen, onPress: () => router.push({ pathname: '/asset/[id]', params: { id: result.id } }) },
                ]}
              />
            </>
          ) : (
            <>
              <Text variant="title">Export</Text>
              <Text dim>
                Full resolution · {width} × {height}px
              </Text>
              <Segmented
                options={[
                  { value: 'jpg', label: 'JPEG · smaller' },
                  { value: 'png', label: 'PNG · lossless' },
                ]}
                value={format}
                onChange={setFormat}
              />
              <Button title="Export image" size="lg" full loading={busy} onPress={() => onExport(format)} />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
