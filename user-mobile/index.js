import 'react-native/Libraries/Core/InitializeCore'
import { registerRootComponent } from 'expo'

import App from './App'

if (typeof globalThis.FormData === 'undefined') {
  // Defensive fallback for release bundles where XHR globals are not initialized early enough.
  require('react-native/Libraries/Core/setUpXHR')
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
