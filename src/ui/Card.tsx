import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius } from './theme';

export function Card({ style, children, ...rest }: ViewProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
        style,
      ]}>
      {children}
    </View>
  );
}
