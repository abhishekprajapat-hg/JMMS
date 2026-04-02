import { StyleSheet, View } from 'react-native'

export function SectionCard({ theme, children, style, padded = true }) {
  return (
    <View
      style={[
        styles.card,
        theme.cardShadow,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
  },
  padded: {
    padding: 18,
  },
})
