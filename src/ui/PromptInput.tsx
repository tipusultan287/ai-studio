import { Sparkles } from 'lucide-react-native';
import { TextInput, View } from 'react-native';
import { colors, radius } from './theme';

export function PromptInput({
  value,
  onChangeText,
  placeholder = 'Describe what you want…',
  minHeight = 96,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  minHeight?: number;
  autoFocus?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: value ? 'rgba(255,122,89,0.45)' : colors.border,
        padding: 14,
        flexDirection: 'row',
        gap: 10,
      }}>
      <Sparkles size={18} color={colors.ai} style={{ marginTop: 2 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline
        autoFocus={autoFocus}
        style={{ flex: 1, minHeight, color: colors.text, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', padding: 0 }}
      />
    </View>
  );
}
