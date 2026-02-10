import base64
import os
import time
from typing import Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

# DeepFace imports TensorFlow-backed models; keep detector light by default.
from deepface import DeepFace

app = FastAPI(title="Face Verify Worker", version="1.0.0")


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
    import cv2  # local import; avoids global import cost at boot

    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid_image")
    return img


def _count_faces(img: np.ndarray, detector_backend: str) -> int:
    faces = DeepFace.extract_faces(img_path=img, detector_backend=detector_backend, enforce_detection=False)
    return len(faces or [])


@app.post("/verify")
def verify(req: VerifyRequest):
    started = time.time()
    detector = os.getenv("FACE_DETECTOR_BACKEND", "opencv")
    model = os.getenv("FACE_MODEL_NAME", "VGG-Face")

    doc_img = _decode_data_url(req.docImageBase64)
    selfie_img = _decode_data_url(req.selfieImageBase64)

    doc_faces = _count_faces(doc_img, detector)
    selfie_faces = _count_faces(selfie_img, detector)

    face_detected_doc = doc_faces > 0
    face_detected_selfie = selfie_faces > 0

    score: Optional[float] = None
    reason: Optional[str] = None

    try:
        result = DeepFace.verify(
            img1_path=selfie_img,
            img2_path=doc_img,
            model_name=model,
            detector_backend=detector,
            enforce_detection=False,
        )
        distance = float(result.get("distance")) if result.get("distance") is not None else None
        threshold = float(result.get("threshold")) if result.get("threshold") is not None else None
        if distance is not None and threshold and threshold > 0:
            score = max(0.0, min(1.0, 1.0 - (distance / threshold)))
        else:
            score = None
            reason = "compare_error"
    except Exception as e:
        reason = "compare_error"

    latency_ms = int((time.time() - started) * 1000)

    return {
        "provider": "deepface",
        "providerVersion": os.getenv("DEEPFACE_VERSION", ""),
        "detectorBackend": detector,
        "modelName": model,
        "faceDetectedSelfie": face_detected_selfie,
        "faceDetectedDoc": face_detected_doc,
        "selfieFaceCount": int(selfie_faces),
        "docFaceCount": int(doc_faces),
        "faceMatchScore": score,
        "reason": reason,
        "latencyMs": latency_ms,
    }

