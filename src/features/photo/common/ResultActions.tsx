import { Download, type LucideIcon, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { saveToDevice, shareMedia } from '@/lib/media';
import { Button, haptics } from '@/ui';

export type ExtraAction = { title: string; icon: LucideIcon; onPress: () => void; variant?: 'primary' | 'ai' | 'secondary' | 'ghost' };

/** Save to Photos / Share + caller-provided actions, laid out in a wrapping row. */
export function ResultActions({ uri, extra = [] }: { uri: string; extra?: ExtraAction[] }) {
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const ok = await saveToDevice(uri);
      if (ok) haptics.success();
      Alert.alert(ok ? 'Saved to Photos' : 'Permission needed', ok ? undefined : 'Allow photo access to save images.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {extra.map((a) => (
        <Button key={a.title} title={a.title} icon={a.icon} variant={a.variant ?? 'secondary'} onPress={a.onPress} size="md" />
      ))}
      <Button title="Save to Photos" icon={Download} variant="secondary" loading={saving} onPress={save} />
      <Button title="Share" icon={Share2} variant="secondary" onPress={() => shareMedia(uri).catch(() => {})} />
    </View>
  );
}
