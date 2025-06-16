from ultralytics import YOLO
import os
from PIL import Image
import numpy as np

# load YOLOv8 model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
model = YOLO(MODEL_PATH)

def predict_yolo(image_path, confidence_threshold=0.3):
    image = Image.open(image_path).convert("RGB")
    image_np = np.array(image)

    results = model(image_np)[0]
    detections = []

    for box in results.boxes:
        cls_id = int(box.cls[0].item())
        label = model.names[cls_id]
        conf = round(box.conf[0].item(), 3)

        if conf < confidence_threshold:
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0])
        detections.append({
            "label": label,
            "confidence": conf,
            "box": [x1, y1, x2, y2]
        })

    # remove duplicate labels while preserving order
    unique_detections = []
    seen_labels = set()
    for det in detections:
        if det["label"] not in seen_labels:
            seen_labels.add(det["label"])
            unique_detections.append(det)
    return unique_detections