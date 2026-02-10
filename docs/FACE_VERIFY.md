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
  "reason": "no_face_selfie|multi_face_selfie|no_face_doc|compare_error|timeout",
  "provider": "deepface",
  "providerVersion": "x.y.z",
  "latencyMs": 1234
}
```

## Environment variables

- `FACE_VERIFY_ENABLED` (default: true)
- `FACE_VERIFY_WORKER_URL` (default: `http://face-worker:8000`)
- `FACE_VERIFY_TIMEOUT_MS` (default: 15000)
- `FACE_VERIFY_JOB_ENABLED` (default: true)
- `FACE_VERIFY_JOB_INTERVAL_MS` (default: 30000)

Worker:
- `FACE_DETECTOR_BACKEND` (default: `opencv`)
- `FACE_MODEL_NAME` (default: `VGG-Face`)

