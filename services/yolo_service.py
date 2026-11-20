import io
import numpy as np
import onnxruntime as ort
from PIL import Image


# Valid road defect classes.
# Note: indices 0, 1, 2, 4, 6 are Roboflow export watermark artifacts and are strictly ignored.
VALID_DEFECT_CLASSES = {
    3: "Pothole",
    5: "Pavement crack",
}

class YOLOService:
    def __init__(self, model_path: str = "best.onnx"):
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape  # Usually [1, 3, 640, 640]
        self.img_size = self.input_shape[2] if isinstance(self.input_shape[2], int) else 640

    def process_image(self, image_bytes: bytes, conf_threshold: float = 0.25):
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((self.img_size, self.img_size))
        
        img_array = np.array(image, dtype=np.float32) / 255.0 
        img_array = np.transpose(img_array, (2, 0, 1))    
        input_tensor = np.expand_dims(img_array, axis=0)    

        outputs = self.session.run(None, {self.input_name: input_tensor})
        
        predictions = np.squeeze(outputs[0]).T  
        scores = predictions[:, 4:]             
        
        max_scores = np.max(scores, axis=1)
        class_ids = np.argmax(scores, axis=1)

        valid_mask = max_scores >= conf_threshold
        valid_scores = max_scores[valid_mask]
        valid_classes = class_ids[valid_mask]

        detections = []
        highest_confidence = 0.0
        primary_defect = "none"

        for score, cls_id in zip(valid_scores, valid_classes):
            conf = float(score)
            cls_index = int(cls_id)

            # Strictly ignore non-defect / watermark classes
            if cls_index not in VALID_DEFECT_CLASSES:
                continue

            defect_name = VALID_DEFECT_CLASSES[cls_index]

            detections.append({
                "class": defect_name,
                "confidence": round(conf, 4)
            })

            if conf > highest_confidence:
                highest_confidence = conf
                primary_defect = defect_name

        return {
            "primary_defect": primary_defect,
            "highest_confidence": round(highest_confidence, 4),
            "detection_count": len(detections),
            "detections_json": detections
        }


yolo_service = YOLOService()