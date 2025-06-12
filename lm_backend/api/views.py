from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from model.yolo_inference import predict_yolo  
import tempfile
from rest_framework.response import Response
from rest_framework.decorators import api_view
from inference_sdk import InferenceHTTPClient
from .models import Garment
from .serializers import GarmentSerializer
import os
from django.core.files.base import ContentFile
from django.conf import settings
from PIL import Image 
import tempfile

# configure the client with the api key from roboflow
CLIENT = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=os.environ.get("ROBOFLOW_API_KEY")
)

# get request to retrieve all garments
@api_view(['GET'])
def get_garments(request):
    """API endpoint for retrieving all garments"""
    garments = Garment.objects.all().order_by('-created_at')
    serializer = GarmentSerializer(garments, many=True)
    print(serializer.data)
    return Response(serializer.data)

# post request to upload an image
@api_view(['POST'])
def upload_image(request):
    """API endpoint for uploading an image and detecting care symbols using Roboflow"""
    image = request.FILES.get('image')
    
    if not image:
        return Response({'error': 'No image provided'}, status=400)

    # save the image to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
        for chunk in image.chunks():
            temp_file.write(chunk)
        temp_path = temp_file.name

    # image resize
    img = Image.open(temp_path)
    img = img.resize((1024, 1024))
    img.save(temp_path)

    # sending the image to the roboflow api for inference
    response = CLIENT.infer(temp_path, model_id="care-labels-pmbls/2")
    os.remove(temp_path)  

    detected_symbols = response.get("predictions", []) 

    # save the garment to the database
    garment = Garment()
    garment.image.save(image.name, ContentFile(image.read()), save=False)
    garment.detected_symbols = detected_symbols
    garment.save()

    # prelucreare simboluri detectate
    raw_symbols = detected_symbols or {}
    simboluri = sorted(raw_symbols.items(), key=lambda x: x[1]["confidence"], reverse=True)
    simboluri_top = [s[0] for s in simboluri[:5]]

    data = GarmentSerializer(garment).data
    data["simboluri"] = simboluri_top
    data["material"] = "bumbac"
    data["culoare"] = "alb"
    data["temperatura"] = "40°C" if "40C" in raw_symbols else "30°C"

    # notificare push
    user_token = request.data.get("token")
    # if user_token:
    #     send_push_notification.delay(user_token)

    print(data)
    return Response(data)


# YOLOv8n integration 
class YoloPredictView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        image_file = request.data.get('image')
        if not image_file:
            return Response({'error': 'No image provided'}, status=400)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            for chunk in image_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        try:
            predictions = predict_yolo(temp_path)
            return Response({'predictions': predictions})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)