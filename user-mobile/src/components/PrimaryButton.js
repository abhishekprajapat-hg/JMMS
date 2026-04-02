import { Pressable, StyleSheet, Text } from 'react-native'

export function PrimaryButton({
  theme,
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && {
          backgroundColor: theme.colors.accent,
          borderColor: theme.colors.accent,
        },
        variant === 'secondary' && {
          backgroundColor: theme.colors.accentSurface,
          borderColor: theme.colors.borderStrong,
        },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderColor: theme.colors.borderStrong,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variant === 'primary' ? '#ffffff' : theme.colors.accentStrong,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
})
