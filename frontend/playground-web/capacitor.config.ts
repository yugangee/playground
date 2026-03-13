import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.sedaily.playground',
  appName: 'Playground',
  webDir: 'out',
  server: {
    url: 'https://fun.sedaily.ai',  // 서버에서 웹앱 로드 (앱 크기 대폭 감소)
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidSplashResourceName: 'splash',
      backgroundColor: '#7c3aed',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7c3aed',
    },
  },
};

export default config;
