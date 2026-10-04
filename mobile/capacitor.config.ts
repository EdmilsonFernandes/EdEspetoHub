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
      '*.janocaminho.com.br',
      // Piloto KYC Jano: captura hospedada abre DENTRO do WebView do app
      // (parece nativo — sem browser externo). Câmera: o WebView do Capacitor
      // repassa a permissão se o AndroidManifest declarar CAMERA (já declara,
      // usado pelo CameraCaptureModal).
      'verify.didit.me',
      '*.didit.me'
    ]
  },
  android: {
    backgroundColor: '#0B0F1A',
    // Android 15+ (targetSdk>=35) força edge-to-edge: sem isso o WebView desenha POR TRÁS da
    // status bar e da gesture bar (env(safe-area-inset-*) volta 0 no Android WebView → nada
    // compensa). 'auto' = Capacitor aplica margins no WebView só no 15+. Padrão observado em
    // apps nativos maduros (análise do APK SouFix/NativeScript, que trata insets explicitamente
    // no bottom nav). Android ≤14: sem mudança. Validado no Dr. Exame (emulador API 37).
    adjustMarginsForEdgeToEdge: 'auto',
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
