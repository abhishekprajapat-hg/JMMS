import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

export function SegmentedControl({ theme, options, selectedValue, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue

        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.button,
              {
                backgroundColor: isSelected ? theme.colors.accent : theme.colors.cardStrong,
                borderColor: isSelected ? theme.colors.accent : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? '#ffffff' : theme.colors.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
})
