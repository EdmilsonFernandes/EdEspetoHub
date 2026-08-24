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
    // Auditoria teclado 24/08: captureInput=true trocava o InputConnection do WebView
    // por um BaseInputConnection mudo (sem EditorInfo) → Gboard sem sugestões/digitação
    // recente em TODOS os campos, independente dos atributos HTML. false devolve a
    // conexão nativa do Chromium (autocomplete/autofill funcionam de verdade).
    captureInput: false,
    webContentsDebuggingEnabled: false
  }
};

export default config;
