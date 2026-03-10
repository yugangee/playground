import { Capacitor } from '@capacitor/core';

// 개발 중 true로 바꾸면 웹에서도 앱 모드 테스트 가능
const DEV_FORCE_NATIVE = false;

/** 네이티브 앱(Android/iOS)에서 실행 중인지 확인 */
export function isNativeApp(): boolean {
  if (process.env.NODE_ENV === 'development' && DEV_FORCE_NATIVE) return true;
  return Capacitor.isNativePlatform();
}

/** 현재 플랫폼 반환: 'android' | 'ios' | 'web' */
export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}
