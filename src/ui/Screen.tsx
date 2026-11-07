import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { colors } from './theme';

/** Top bar for pushed screens: back, title, right slot. */
export function TopBar({ title, subtitle, right, onBack }: { title?: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" faint numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{right}</View>
    </View>
  );
}

/** Standard scrollable screen with dark canvas. */
export function Screen({
  children,
  scroll = true,
  header,
  contentStyle,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: 16 } : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[pad, { paddingBottom: insets.bottom + 120, paddingTop: header ? 0 : insets.top + 8 }, contentStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }}>
      <Text variant="heading">{title}</Text>
      {action}
    </View>
  );
}
