import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { MissingKeyError } from '@/lib/runware/client';
import type { RunOptions } from '@/lib/runware/client';
import * as haptics from '@/ui/haptics';

/**
 * Wraps a long-running AI/export job: status text, progress, cancel, errors.
 * Usage: const t = useTask(); await t.start((opts) => generateImage(p, opts));
 * Render <ProgressOverlay visible={t.running} status={t.status} progress={t.progress} onCancel={t.cancel} />
 */
export function useTask() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | undefined>();
  const ctrl = useRef<AbortController | null>(null);

  const start = useCallback(async <T,>(fn: (opts: RunOptions) => Promise<T>): Promise<T | undefined> => {
    ctrl.current = new AbortController();
    setRunning(true);
    setStatus('Starting…');
    setProgress(undefined);
    try {
      const out = await fn({
        signal: ctrl.current.signal,
        onProgress: ({ status: s, progress: p }) => {
          setStatus(s);
          setProgress(p);
        },
      });
      haptics.success();
      return out;
    } catch (e) {
      if (ctrl.current?.signal.aborted) return undefined;
      haptics.warn();
      if (e instanceof MissingKeyError) {
        Alert.alert('Runware API key needed', e.message, [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => router.push('/settings') },
        ]);
      } else {
        Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
      }
      return undefined;
    } finally {
      setRunning(false);
      setStatus(undefined);
      setProgress(undefined);
    }
  }, []);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
    setRunning(false);
  }, []);

  return { running, status, progress, start, cancel, setStatus, setProgress };
}
