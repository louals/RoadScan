import io
from PIL import Image
from ultralytics import YOLO

class YOLOService:
    def __init__(self, model_path: str = "best.pt"):
        # Load the trained YOLO model once when the service initializes
        self.model = YOLO(model_path)

    def process_image(self, image_bytes: bytes):
        """
        Runs YOLO inference on raw image bytes.
        Returns the primary defect, confidence score, total count, and full detection details.
        """
        image = Image.open(io.BytesIO(image_bytes))
        results = self.model(image)

        detections = []
        highest_confidence = 0.0
        primary_defect = "none"

        for r in results:
            boxes = r.boxes
            for box in boxes:
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                class_name = self.model.names[cls_id]

                detections.append({
                    "class": class_name,
                    "confidence": conf
                })

                if conf > highest_confidence:
                    highest_confidence = conf
                    primary_defect = class_name

        return {
            "primary_defect": primary_defect,
            "highest_confidence": highest_confidence,
            "detection_count": len(detections),
            "detections_json": detections
        }

# Instantiate a global service instance to avoid reloading the model on every request
yolo_service = YOLOService()