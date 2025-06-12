from ultralytics import YOLO
import os
from PIL import Image
import numpy as np

# load YOLOv8 model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
model = YOLO(MODEL_PATH)

def predict_yolo(image_path):
    image = Image.open(image_path).convert("RGB")
    image_np = np.array(image)

    results = model(image_np)[0]
    detections = []

    for box in results.boxes:
        cls_id = int(box.cls[0].item())
        label = model.names[cls_id]
        conf = round(box.conf[0].item(), 3)
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        detections.append({
            "label": label,
            "confidence": conf,
            "box": [x1, y1, x2, y2]
        })

    return detections