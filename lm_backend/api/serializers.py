from rest_framework import serializers
from .models import Garment  

class GarmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Garment
        fields = '__all__'  # all fields in the model
