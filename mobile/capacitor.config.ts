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
    backgroundColor: '#0B0F1A',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
