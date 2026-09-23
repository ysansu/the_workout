import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ysansu.workout',
  appName: '训练',
  webDir: 'dist',
  android: {
    // WebView 底色跟 App 的浅色主题一致，避免启动/切页时闪白
    backgroundColor: '#F4F4FB',
  },
}

export default config
