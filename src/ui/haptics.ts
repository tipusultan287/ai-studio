import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ok = Platform.OS === 'ios' || Platform.OS === 'android';
export const tap = () => ok && Haptics.selectionAsync().catch(() => {});
export const impact = () => ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const success = () =>
  ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const warn = () =>
  ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
