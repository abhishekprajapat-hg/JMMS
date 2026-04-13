import { Ionicons } from '@expo/vector-icons'
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useApp } from '../context/AppContext'
import { getTheme } from '../theme'
import { AboutScreen } from '../screens/AboutScreen'
import { CalendarScreen } from '../screens/CalendarScreen'
import { DonationScreen } from '../screens/DonationScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LibraryScreen } from '../screens/LibraryScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { SignupScreen } from '../screens/SignupScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#c2410c" />
      <Text style={styles.loadingText}>Preparing Punyanidhi...</Text>
    </View>
  )
}

function RootTabs() {
  const { darkMode } = useApp()
  const theme = getTheme(darkMode)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSoft,
        tabBarStyle: {
          backgroundColor: theme.colors.cardStrong,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            Home: 'home-outline',
            Donate: 'heart-outline',
            Library: 'library-outline',
            Calendar: 'calendar-outline',
            Profile: 'person-outline',
          }

          return <Ionicons color={color} name={iconMap[route.name] || 'ellipse-outline'} size={size} />
        },
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={DonationScreen} name="Donate" />
      <Tab.Screen component={LibraryScreen} name="Library" />
      <Tab.Screen component={CalendarScreen} name="Calendar" />
      <Tab.Screen component={ProfileScreen} name="Profile" />
    </Tab.Navigator>
  )
}

export function AppNavigator() {
  const { ready, darkMode } = useApp()
  const theme = getTheme(darkMode)

  if (!ready) {
    return <LoadingScreen />
  }

  const navigationTheme = darkMode
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          background: theme.colors.background,
          card: theme.colors.cardStrong,
          border: theme.colors.border,
          text: theme.colors.text,
          primary: theme.colors.accent,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          background: theme.colors.background,
          card: theme.colors.cardStrong,
          border: theme.colors.border,
          text: theme.colors.text,
          primary: theme.colors.accent,
        },
      }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen component={RootTabs} name="Root" />
        <Stack.Screen component={AboutScreen} name="About" />
        <Stack.Screen component={LoginScreen} name="Login" />
        <Stack.Screen component={SignupScreen} name="Signup" />
        <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#7c2d12',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 14,
  },
})
