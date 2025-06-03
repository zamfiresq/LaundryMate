from django.urls import path, include
from .views import upload_image, get_garments
from django.http import JsonResponse

def test_view(request):
    return JsonResponse({"message": "API route is reachable"})

# url patterns for the api
urlpatterns = [
    path('', test_view),
    path('upload/', upload_image, name='upload-image'),
    path('garments/', get_garments, name='get-garments'),
    path('chat/', include('api.chat.urls')),
    path('notifications/', include('api.notifications.urls')),
]
