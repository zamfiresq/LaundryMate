from rest_framework.response import Response
from rest_framework.decorators import api_view
from inference_sdk import InferenceHTTPClient
from .models import Garment
from .serializers import GarmentSerializer
import os
from django.core.files.base import ContentFile
from django.conf import settings
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

    # sending the image to the roboflow api for inference
    response = CLIENT.infer(temp_path, model_id="care-labels-pmbls/2")
    os.remove(temp_path)  

    detected_symbols = response.get("predictions", []) 

    # save the garment to the database
    garment = Garment()
    garment.image.save(image.name, ContentFile(image.read()), save=False)
    garment.detected_symbols = detected_symbols
    garment.save()

    return Response(GarmentSerializer(garment).data)