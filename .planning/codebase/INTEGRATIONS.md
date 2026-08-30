# INTEGRATIONS

| Integração | Uso | Notas |
|---|---|---|
| Mercado Pago | Pix/crédito online + Point presencial + assinaturas | webhook crítico (ADR-002); Orders API nova p/ Point; billing 403 em aberto |
| Firebase | Push (project `ja-no-caminho-mobile`) | keys em `backend/keys/` |
| S3 (via SSM) | uploads `/uploads/*` | config no SSM `/chamanoespeto/prod`; troca de imagem = `uploadPublicObjectToS3` |
| Zoho | e-mail transacional | `550 5.4.6` = painel Zoho unblock (nunca deletar conta) |
| Google Play | APK/AAB | 16 KB page size no upload; API target anual (v79+ = API 36) |
| Domínios | `janocaminho.com.br` (cert 4 SANs) | `app.`=alias hub · `drexame.`=Dr. Exame :4010 (produto OUTRO) |

Servidor: EC2 `ec2-3-137-119-152` (SSH read-only p/ diagnóstico; ver CLAUDE.md
→ Acesso SSH). Erros de API nos logs como `Unhandled error returned to client`.
