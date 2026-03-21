# Face Verify (Motoboy) - Assisted Verification

Goal: help the admin validate that the "SELFIE segurando a CNH" likely matches the face in the CNH.
This is not an identity proof; it is an assistive signal.

## Flow

1. Motoboy uploads `CNH` and `SELFIE` (frontend: `MotoboyProfile`).
2. Backend stores both in `motoboy_documents` with `metadata`.
3. Job `FaceVerifyJob` periodically finds pending selfies and calls the python worker.
4. Worker returns face counts + match score.
5. Backend stores the result in `motoboy_documents.metadata.face` (on the `SELFIE` document).
6. Admin sees a badge: `Alta / Media / Baixa / Indisponivel` and can still approve/reject manually.

## Metadata schema (motoboy_documents.metadata.face)

```json
{
  "status": "pending|processing|done|failed|manual_required",
  "checkedAt": "ISO_DATE",
  "faceDetectedSelfie": true,
  "faceDetectedDoc": true,
  "selfieFaceCount": 1,
  "docFaceCount": 1,
  "faceMatchScore": 0.0,
  "scoreLabel": "alto|medio|baixo|indisponivel",
  "reason": "no_face_selfie|multi_face_selfie|no_face_doc|compare_error|timeout|timeout_retry|low_match|medium_match|rate_limited",
  "provider": "insightface",
  "providerVersion": "x.y.z",
  "latencyMs": 1234
}
```

## Environment variables (API / .env.prod)

- `FACE_VERIFY_ENABLED` (default: true)
- `FACE_VERIFY_WORKER_URL` (default: `http://face-worker:8000`)
- `FACE_VERIFY_TIMEOUT_MS` (default: 90000)
- `FACE_VERIFY_SCORE_MEDIUM` (default: 0.55)
- `FACE_VERIFY_SCORE_HIGH` (default: 0.75)
- `FACE_VERIFY_MAX_ATTEMPTS` (default: 10)
- `FACE_VERIFY_COOLDOWN_HOURS` (default: 24)
- `FACE_VERIFY_REJECT_AFTER_CONSECUTIVE` (default: 2)
- `FACE_VERIFY_REJECT_APPROVED` (default: false)
- `FACE_VERIFY_JOB_ENABLED` (default: true)
- `FACE_VERIFY_JOB_INTERVAL_MS` (default: 30000)

Worker:
- `FACE_MODEL_NAME` (default: `buffalo_l`)

### Recommended .env.prod snippet

```bash
FACE_VERIFY_ENABLED=true
FACE_VERIFY_WORKER_URL=http://face-worker:8000
FACE_VERIFY_TIMEOUT_MS=90000
FACE_VERIFY_SCORE_MEDIUM=0.55
FACE_VERIFY_SCORE_HIGH=0.75
FACE_VERIFY_MAX_ATTEMPTS=10
FACE_VERIFY_COOLDOWN_HOURS=24
FACE_VERIFY_REJECT_AFTER_CONSECUTIVE=2
FACE_VERIFY_REJECT_APPROVED=false
FACE_VERIFY_JOB_ENABLED=true
FACE_VERIFY_JOB_INTERVAL_MS=30000
```
