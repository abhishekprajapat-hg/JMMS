import { Pressable, StyleSheet, Text, View } from 'react-native'

function UtilityPill({ theme, active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? theme.colors.accent : theme.colors.cardStrong,
          borderColor: active ? theme.colors.accent : theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: active ? '#ffffff' : theme.colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function UtilityBar({
  theme,
  language,
  darkMode,
  onToggleLanguage,
  onToggleTheme,
}) {
  return (
    <View style={styles.row}>
      <UtilityPill
        active={language === 'hi'}
        label={language === 'hi' ? 'HI' : 'EN'}
        onPress={onToggleLanguage}
        theme={theme}
      />
      <UtilityPill
        active={darkMode}
        label={darkMode ? 'Dark' : 'Light'}
        onPress={onToggleTheme}
        theme={theme}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
