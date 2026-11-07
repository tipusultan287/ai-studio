import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, haptics, IconButton, radius, ScalePressable, Text } from '@/ui';
import { fmtTime } from './timeline';

const INTERVAL = 80;
const BARS = 48;

export type Recording = { uri: string; durationMs: number; metering: number[]; intervalMs: number };

/** Microphone recorder with live level meter and timer. */
export function Recorder({ onDone, onCancel }: { onDone: (r: Recording) => void; onCancel: () => void }) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const meter = useRef<number[]>([]);
  const level = useSharedValue(0);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + level.get() * 0.35 }], opacity: 0.25 + level.get() * 0.5 }));

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const st = recorder.getStatus();
      const db = st.metering ?? -60;
      meter.current.push(db);
      const l = Math.max(0, Math.min(1, (db + 55) / 55));
      level.set(withTiming(l, { duration: INTERVAL }));
      setElapsed(st.durationMillis);
      setLevels((prev) => [...prev.slice(-(BARS - 1)), l]);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [recording, recorder, level]);

  const start = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone access needed', 'Allow microphone access in Settings to record audio.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      meter.current = [];
      setLevels([]);
      recorder.record();
      haptics.impact();
      setRecording(true);
    } catch (e) {
      Alert.alert('Could not start recording', e instanceof Error ? e.message : String(e));
    }
  };

  const stop = async () => {
    const durationMs = recorder.getStatus().durationMillis;
    await recorder.stop();
    setRecording(false);
    haptics.success();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const uri = recorder.uri;
    if (uri) onDone({ uri, durationMs, metering: meter.current.slice(), intervalMs: INTERVAL });
  };

  const bars = Array.from({ length: BARS }, (_, i) => levels[i - (BARS - levels.length)] ?? 0);

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: recording ? colors.danger : colors.textFaint }} />
          <Text variant="label" dim>
            {recording ? 'Recording' : 'Ready to record'}
          </Text>
        </View>
        {!recording ? <IconButton icon={X} size={34} accessibilityLabel="Close recorder" onPress={onCancel} /> : null}
      </View>
      <Text variant="display" center style={{ fontVariant: ['tabular-nums'] }}>
        {fmtTime(elapsed / 1000)}
      </Text>
      <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {bars.map((l, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(3, l * 64), borderRadius: 2, backgroundColor: recording ? colors.accent : colors.surfaceHigh }} />
        ))}
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 96 }}>
        <Animated.View style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.danger }, pulse]} />
        <ScalePressable
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          onPress={recording ? stop : start}
          style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' }}>
          {recording ? <Square size={26} color="#fff" fill="#fff" /> : <Mic size={30} color="#fff" />}
        </ScalePressable>
      </View>
    </View>
  );
}
