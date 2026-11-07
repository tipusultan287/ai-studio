import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from './Button';
import { Text } from './Text';
import { colors, gradients } from './theme';

/** Full-screen glass overlay shown while an AI task / export runs. */
export function ProgressOverlay({
  visible,
  title = 'Working on it…',
  status,
  progress,
  onCancel,
}: {
  visible: boolean;
  title?: string;
  status?: string;
  progress?: number; // 0..1
  onCancel?: () => void;
}) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (visible) spin.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1);
  }, [visible, spin]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 }]}>
        <Animated.View style={[{ width: 88, height: 88, borderRadius: 44, overflow: 'hidden' }, ring]}>
          <LinearGradient colors={[...gradients.ai]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 4 }}>
            <View style={{ flex: 1, borderRadius: 40, backgroundColor: colors.bg }} />
          </LinearGradient>
        </Animated.View>
        <Text variant="title" center>
          {title}
        </Text>
        {status ? (
          <Text dim center>
            {status}
          </Text>
        ) : null}
        {typeof progress === 'number' ? (
          <View style={{ width: 220, height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}>
            <LinearGradient
              colors={[...gradients.ai]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%`, height: '100%' }}
            />
          </View>
        ) : null}
        {onCancel ? <Button title="Cancel" variant="secondary" size="sm" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}
