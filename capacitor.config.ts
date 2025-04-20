
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.568d93bfea1b44838cb87725340b1dbd',
  appName: 'habit-verse-connect',
  webDir: 'dist',
  server: {
    url: 'https://568d93bf-ea1b-4483-8cb8-7725340b1dbd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    buildOptions: {
      releaseType: 'APK'
    }
  }
};

export default config;
