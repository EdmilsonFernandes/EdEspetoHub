# ARCHITECTURE

```
Browser/APK → Nginx (EC2:443)
  → /          → Frontend (:8080)
  → /api/*     → BFF (:5000) → Backend (:4000) → PostgreSQL + Redis
  → /uploads/* → Backend (:4000) [S3 híbrido via SSM]
```

- Frontend **nunca** fala direto com o backend (ADR-003).
- Containers: `janocaminho-{frontend,apis,backend,postgres,redis,pgadmin,face-worker}`.
- Deploy: push main → GHCR (publish-ghcr) → deploy automático (approval do
  Edmilson) → `deploy-release.sh`. Deploy/SSH-write é SEMPRE do Edmilson.
- Navegação admin: fonte única `frontend/src/navigation/adminNavigation.ts` (ADR-004).
- Guia profundo (ops, recovery, deploy): `.ai/SKILL.md` + `.claude/ARCHITECTURE.md`.
- Grafo do código: `graphify query "<pergunta>"` (graphify-out/).
