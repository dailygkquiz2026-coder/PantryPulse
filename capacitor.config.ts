import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pantrypulse.app',
  appName: 'PantryPulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
