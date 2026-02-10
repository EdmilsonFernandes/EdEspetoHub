import base64
import os
import time
from typing import Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

import cv2
from insightface.app import FaceAnalysis

app = FastAPI(title="Face Verify Worker", version="2.0.0")


class VerifyRequest(BaseModel):
    docImageBase64: str
    selfieImageBase64: str


def _decode_data_url(data_url: str) -> np.ndarray:
    # data:image/jpeg;base64,....
    if "," in data_url:
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid_image")
    return img


def _largest_face(faces):
    if not faces:
        return None
    # bbox: [x1, y1, x2, y2]
    def area(face):
        x1, y1, x2, y2 = face.bbox
        return float(max(0.0, x2 - x1) * max(0.0, y2 - y1))
    return sorted(faces, key=area, reverse=True)[0]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


_face_app: Optional[FaceAnalysis] = None


def _get_app() -> FaceAnalysis:
    global _face_app
    if _face_app is not None:
        return _face_app
    model_name = os.getenv("FACE_MODEL_NAME", "buffalo_l")
    # InsightFace will download the model on first run into ~/.insightface (inside container FS).
    fa = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
    fa.prepare(ctx_id=-1, det_size=(640, 640))
    _face_app = fa
    return _face_app


@app.post("/verify")
def verify(req: VerifyRequest):
    started = time.time()
    model = os.getenv("FACE_MODEL_NAME", "buffalo_l")
    doc_img = _decode_data_url(req.docImageBase64)
    selfie_img = _decode_data_url(req.selfieImageBase64)

    face_app = _get_app()

    # InsightFace expects RGB; OpenCV is BGR
    doc_faces = face_app.get(cv2.cvtColor(doc_img, cv2.COLOR_BGR2RGB))
    selfie_faces = face_app.get(cv2.cvtColor(selfie_img, cv2.COLOR_BGR2RGB))

    doc_face = _largest_face(doc_faces)
    selfie_face = _largest_face(selfie_faces)

    doc_count = len(doc_faces) if doc_faces is not None else 0
    selfie_count = len(selfie_faces) if selfie_faces is not None else 0

    face_detected_doc = doc_count > 0
    face_detected_selfie = selfie_count > 0

    score: Optional[float] = None
    reason: Optional[str] = None

    try:
        if doc_face is None or selfie_face is None:
            score = None
            reason = "no_face"
        else:
            sim = _cosine_similarity(selfie_face.embedding, doc_face.embedding)
            # Map cosine similarity [-1..1] to [0..1]
            score = max(0.0, min(1.0, (sim + 1.0) / 2.0))
    except Exception:
        score = None
        reason = "compare_error"

    latency_ms = int((time.time() - started) * 1000)

    return {
        "provider": "insightface",
        "providerVersion": "",
        "modelName": model,
        "faceDetectedSelfie": bool(face_detected_selfie),
        "faceDetectedDoc": bool(face_detected_doc),
        "selfieFaceCount": int(selfie_count),
        "docFaceCount": int(doc_count),
        "faceMatchScore": score,
        "reason": reason,
        "latencyMs": latency_ms,
    }
