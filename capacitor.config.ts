import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.joymkrishna.tutionpro.app',
  appName: 'Tution Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#F8F9FA',
  }
};

export default config;