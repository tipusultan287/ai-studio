import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors, type } from './theme';

type Variant = keyof typeof type;
export type TProps = TextProps & {
  variant?: Variant;
  color?: string;
  dim?: boolean;
  faint?: boolean;
  center?: boolean;
  weight?: TextStyle['fontWeight'];
};

export function Text({ variant = 'body', color, dim, faint, center, weight, style, ...rest }: TProps) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant] as TextStyle,
        { color: color ?? (faint ? colors.textFaint : dim ? colors.textDim : colors.text) },
        center && { textAlign: 'center' },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
