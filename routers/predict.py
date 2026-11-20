import io
import json
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image
from sqlalchemy.orm import Session

from database import get_db
from models import Report, User
from routers.auth import get_current_user
from services.storage_service import storage_service
from services.yolo_service import yolo_service

router = APIRouter(prefix="/api/v1", tags=["Prediction"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

# Algeria geographic bounding box
ALGERIA_LAT_MIN, ALGERIA_LAT_MAX = 18.9, 37.2
ALGERIA_LON_MIN, ALGERIA_LON_MAX = -8.7, 12.1


def is_algeria_coordinate(lat: float, lon: float) -> bool:
    return (
        math.isfinite(lat)
        and math.isfinite(lon)
        and (ALGERIA_LAT_MIN <= lat <= ALGERIA_LAT_MAX)
        and (ALGERIA_LON_MIN <= lon <= ALGERIA_LON_MAX)
    )


@router.post("/predict")
async def predict_road_defect(
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate coordinates
    if not is_algeria_coordinate(latitude, longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates must be a valid location within Algeria.",
        )

    # 2. Validate MIME type if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, or WebP images are accepted.",
        )

    # 3. Read uploaded bytes with size limit (protect against DoS)
    raw_image_bytes = bytearray()
    chunk_size = 1024 * 1024  # 1 MB chunk
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        raw_image_bytes.extend(chunk)
        if len(raw_image_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Photo exceeds the maximum allowed size of 10 MB.",
            )

    if len(raw_image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # 4. Verify and optimize image
    try:
        # Verify file integrity
        probe = Image.open(io.BytesIO(raw_image_bytes))
        probe.verify()

        # Re-open for resizing and optimization
        img = Image.open(io.BytesIO(raw_image_bytes))
        img = img.convert("RGB")
        img.thumbnail((640, 640))

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="JPEG", quality=85)
        image_bytes = img_byte_arr.getvalue()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid or readable image.",
        )

    try:
        # 5. Upload to Cloudinary storage
        safe_filename = file.filename or f"roadscan-{int(datetime.now(timezone.utc).timestamp())}.jpg"
        image_url = storage_service.upload_road_image(image_bytes, safe_filename)

        # 6. Run YOLO inference
        inference_result = yolo_service.process_image(image_bytes)

        # 7. Determine status and description based on detection count
        detection_count = inference_result["detection_count"]
        if detection_count > 0:
            status_val = "detected"
            primary_defect = inference_result["primary_defect"]
            description = f"Automated YOLO scan detected {primary_defect}."
        else:
            status_val = "clear"
            primary_defect = "none"
            description = "Automated YOLO scan found no road defects."

        # 8. Construct and save the report in PostgreSQL
        now = datetime.now(timezone.utc)

        new_report = Report(
            image_url=image_url,
            annotated_image_url=None,
            latitude=latitude,
            longitude=longitude,
            geom=f"POINT({longitude} {latitude})",
            status=status_val,
            confidence_score=inference_result["highest_confidence"],
            defect_type=primary_defect,
            detection_count=detection_count,
            detections_json=json.dumps(inference_result["detections_json"]),
            description=description,
            user_id=current_user.id,
            created_at=now,
            updated_at=now,
        )

        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        return {
            "status": "success",
            "report_id": new_report.id,
            "image_url": new_report.image_url,
            "defect_type": new_report.defect_type,
            "confidence_score": new_report.confidence_score,
            "detection_count": new_report.detection_count,
            "detections": inference_result["detections_json"],
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}",
        )
