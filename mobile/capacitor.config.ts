import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.janocaminho.app',
  appName: 'Ja no Caminho',
  webDir: '../frontend/dist',
  server: {
    url: 'https://janocaminho.com.br/hub',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'janocaminho.com.br',
      '*.janocaminho.com.br'
    ]
  },
  android: {
    backgroundColor: '#F8FAFC',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
