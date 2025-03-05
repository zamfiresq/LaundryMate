from django.urls import path
from .views import upload_image, get_garments


# url patterns for the api
urlpatterns = [
    path('upload/', upload_image, name='upload-image'),
    path('garments/', get_garments, name='get-garments'),
]
