from django.urls import path, include
from .views import upload_image, get_garments


# url patterns for the api
urlpatterns = [
    path('upload/', upload_image, name='upload-image'),
    path('garments/', get_garments, name='get-garments'),
    path('chat/', include('api.chat.urls')),
]
