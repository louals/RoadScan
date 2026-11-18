import json
import io
from PIL import Image
from datetime import datetime 
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Report
from services.yolo_service import yolo_service
from services.storage_service import storage_service  

router = APIRouter(prefix="/api/v1", tags=["Prediction"])

@router.post("/predict")
async def predict_road_defect(
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: int = Form(1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # 1. Read uploaded image bytes
        raw_image_bytes = await file.read()

        # 2. Resize and optimize image for fast CPU inference & storage upload
        try:
            img = Image.open(io.BytesIO(raw_image_bytes))
            img = img.convert("RGB")
            
            # Resize keeping aspect ratio (max dimension 640px) to prevent Render timeouts
            img.thumbnail((640, 640))
            
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format="JPEG", quality=85)
            image_bytes = img_byte_arr.getvalue()
        except Exception as img_err:
            print(f"⚠️ Image resizing warning: {str(img_err)}, falling back to raw bytes.")
            image_bytes = raw_image_bytes

        # 3. Upload optimized image to Cloudinary storage and get the secure public URL
        image_url = storage_service.upload_road_image(image_bytes, file.filename)

        # 4. Run YOLO inference using our service layer (now lightning fast on 640px)
        inference_result = yolo_service.process_image(image_bytes)

        # 5. Determine status and description dynamically based on detection count
        detection_count = inference_result["detection_count"]
        if detection_count > 0:
            status = "detected"
            primary_defect = inference_result["primary_defect"]
            description = f"Automated YOLO scan detected {primary_defect}."
        else:
            status = "clear"
            primary_defect = "none"
            description = "Automated YOLO scan found no road defects."

        # 6. Construct and save the report in PostgreSQL with the live storage URL
        current_time = datetime.utcnow()
        
        new_report = Report(
            image_url=image_url,
            annotated_image_url=None,
            latitude=latitude,
            longitude=longitude,
            geom=f"POINT({longitude} {latitude})",
            status=status,
            confidence_score=inference_result["highest_confidence"],
            defect_type=primary_defect,
            detection_count=detection_count,
            detections_json=json.dumps(inference_result["detections_json"]),
            description=description,
            user_id=user_id,
            created_at=current_time,
            updated_at=current_time
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
            "detections": inference_result["detections_json"]
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")