import { StyleSheet, Text, TextInput, View } from 'react-native'

export function FormField({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  style,
  inputStyle,
  editable = true,
}) {
  return (
    <View style={style}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          {label}
        </Text>
      ) : null}

      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSoft}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.cardStrong,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            minHeight: multiline ? 116 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          inputStyle,
        ]}
        value={value}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
})
