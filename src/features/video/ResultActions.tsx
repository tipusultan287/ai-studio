import { Check, Download, Film, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button } from '@/ui';
import { saveToDevice, shareMedia } from '@/lib/media';

/** Save / Share / Open-in-editor row for a finished video. */
export function ResultActions({ uri, onOpenEditor, onDone, doneLabel = 'Done' }: { uri: string; onOpenEditor?: () => void; onDone?: () => void; doneLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const ok = await saveToDevice(uri);
      if (ok) setSaved(true);
      else Alert.alert('Permission needed', 'Allow Photos access to save videos.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      <Button size="sm" icon={saved ? Check : Download} title={saved ? 'Saved' : 'Save'} loading={busy} onPress={save} />
      <Button size="sm" variant="secondary" icon={Share2} title="Share" onPress={() => void shareMedia(uri).catch(() => {})} />
      {onOpenEditor ? <Button size="sm" variant="secondary" icon={Film} title="Open in editor" onPress={onOpenEditor} /> : null}
      {onDone ? <Button size="sm" variant="ghost" title={doneLabel} onPress={onDone} /> : null}
    </ScrollView>
  );
}
