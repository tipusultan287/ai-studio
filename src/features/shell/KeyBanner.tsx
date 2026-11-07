import { useFocusEffect, router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { hasApiKey } from '@/lib/runware/config';
import { colors, radius, ScalePressable, Text } from '@/ui';

/** Shows a nudge when no Runware key is configured. */
export function KeyBanner() {
  const [missing, setMissing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      hasApiKey().then((ok) => setMissing(!ok));
    }, []),
  );
  if (!missing) return null;
  return (
    <ScalePressable
      onPress={() => router.push('/settings')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.aiSoft, borderWidth: 1, borderColor: 'rgba(255,122,89,0.35)', marginTop: 16 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,122,89,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <KeyRound size={18} color={colors.ai} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label">Connect Runware to unlock AI</Text>
        <Text variant="caption" dim>
          Add your API key in Settings. Manual editing works without it.
        </Text>
      </View>
    </ScalePressable>
  );
}
