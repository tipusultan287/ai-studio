import type { LucideIcon } from 'lucide-react-native';
import { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} color={colors.textDim} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {body ? (
        <Text dim center>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
