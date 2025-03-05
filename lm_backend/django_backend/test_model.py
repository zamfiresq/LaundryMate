import os
from inference_sdk import InferenceHTTPClient
from django.conf import settings

# Configurează clientul
CLIENT = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=settings.ROBOFLOW_API_KEY
)

# Specifică folderul de test
test_folder = os.path.join(settings.BASE_DIR, "..", "dataset", "test")
image_files = [f for f in os.listdir(test_folder) if f.endswith(('.jpg', '.png'))]

# Rulează inferența pe fiecare imagine
for image_file in image_files:
    image_path = os.path.join(test_folder, image_file)
    response = CLIENT.infer(image_path, model_id="care-labels-pmbls/2")
    
    print(f"Results for {image_file}:")
    print(response)
    print("-" * 50)
