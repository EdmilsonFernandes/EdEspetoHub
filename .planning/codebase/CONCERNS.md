# CONCERNS (riscos e dívidas conhecidas)

1. **God nodes `@ts-nocheck`** (AdminDashboard ~4k, GrillQueue ~5k, DashboardView):
   TDZ invisível ao tsc (2 quebras em prod). Mitigação: revisar ordem de
   declaração no diff; build completo é o único gate.
2. **Vitest flaka sob carga** (worker timeout): falso-negativo; re-rodar.
3. **`localhost:5432` é PgBouncer do Wibx**, não o Postgres local — testes de
   integração que dependem de DB falham por ambiente (DeliveryService).
4. **Sessão paralela no repo**: conferir `git log`/`git status` antes de
   assumir estado do working tree (balcão/Point roda em outra janela).
5. APK serverUrl fixo no binário: raiz `janocaminho.com.br` nunca pode sair do ar.
6. Pendências UI: DevicePermissionsCard (teal + border-l-4), tipografia micro
   (1.063 labels uppercase tracking no dashboard — auditoria 18/08).
7. Deploy de imagem pode servir `sw.js`/index dessincronizados: após deploy,
   conferir hash do `index.html` vs `sw.js` (usuário pode ver shell velho até F5).
