import { BlurView } from 'expo-blur';
import { Check, ChevronDown, Cpu, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MODEL_CATALOG, ModelOption, ModelSlot } from '@/lib/runware';
import { colors, IconButton, radius, ScalePressable, Text } from '@/ui';

export type ModelPickerProps = {
  slot: ModelSlot;
  value: string;
  onChange: (id: string) => void;
  visible: boolean;
  onClose: () => void;
  title?: string;
};

export const findModel = (slot: ModelSlot, id: string): ModelOption | undefined =>
  MODEL_CATALOG[slot].options.find((o) => o.id === id);

/** Bottom sheet listing the models for a slot (MODEL_CATALOG[slot]). Reusable in Settings. */
export function ModelPicker({ slot, value, onChange, visible, onClose, title }: ModelPickerProps) {
  const insets = useSafeAreaInsets();
  const cat = MODEL_CATALOG[slot];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close model picker" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{title ?? cat.label}</Text>
              <Text variant="caption" faint>
                {cat.options.length} models on Runware
              </Text>
            </View>
            <IconButton icon={X} size={34} onPress={onClose} accessibilityLabel="Close" />
          </View>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {cat.options.map((o) => {
              const on = o.id === value;
              return (
                <ScalePressable
                  key={o.id}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    onChange(o.id);
                    onClose();
                  }}
                  style={[styles.row, on && { borderColor: colors.ai, backgroundColor: colors.aiSoft }]}>
                  <View style={[styles.icon, on && { backgroundColor: colors.ai }]}>
                    <Cpu size={18} color={on ? '#fff' : colors.textDim} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text weight="700">{o.name}</Text>
                    {o.note ? (
                      <Text variant="label" dim>
                        {o.note}
                      </Text>
                    ) : null}
                    <Text variant="caption" faint numberOfLines={1}>
                      {o.id}
                    </Text>
                  </View>
                  {on ? <Check size={20} color={colors.ai} /> : null}
                </ScalePressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Compact field showing the current model; tapping opens the picker. */
export function ModelField({ slot, value, onPress }: { slot: ModelSlot; value: string; onPress: () => void }) {
  const m = findModel(slot, value);
  return (
    <ScalePressable scaleTo={0.98} onPress={onPress} style={styles.field} accessibilityRole="button" accessibilityLabel="Choose model">
      <View style={styles.icon}>
        <Cpu size={18} color={colors.ai} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" faint>
          MODEL
        </Text>
        <Text weight="700" numberOfLines={1}>
          {m?.name ?? value}
        </Text>
        {m?.note ? (
          <Text variant="label" dim numberOfLines={1}>
            {m.note}
          </Text>
        ) : null}
      </View>
      <ChevronDown size={20} color={colors.textDim} />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: 'rgba(17,17,22,0.86)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
