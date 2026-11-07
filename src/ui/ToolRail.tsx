import type { LucideIcon } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { ScalePressable } from './Pressable';
import { Text } from './Text';
import { colors } from './theme';

export type Tool<T extends string = string> = { id: T; label: string; icon: LucideIcon; ai?: boolean };

/** Bottom horizontal tool rail used by all editors. */
export function ToolRail<T extends string>({ tools, active, onSelect }: { tools: readonly Tool<T>[]; active?: T | null; onSelect: (id: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
      {tools.map((t) => {
        const on = t.id === active;
        const tint = t.ai ? colors.ai : colors.accent;
        return (
          <ScalePressable key={t.id} onPress={() => onSelect(t.id)} style={{ width: 68, alignItems: 'center', gap: 6, paddingVertical: 8 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? tint : t.ai ? colors.aiSoft : colors.surfaceHigh,
                borderWidth: 1,
                borderColor: on ? tint : colors.border,
              }}>
              <t.icon size={21} color={on ? colors.accentInk : t.ai ? colors.ai : colors.text} strokeWidth={2.1} />
            </View>
            <Text variant="caption" color={on ? tint : colors.textDim} numberOfLines={1}>
              {t.label}
            </Text>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}
