import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.sedaily.playground',
  appName: 'Playground',
  webDir: 'out',
  server: {
    // 프로덕션에서는 로컬 파일 사용, 개발 중에는 아래 주석 해제
    // url: 'http://10.0.2.2:3000',  // Android 에뮬레이터에서 localhost 접근
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
