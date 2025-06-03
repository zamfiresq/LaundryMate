from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


def home(request):
    return HttpResponse("Welcome to the LaundryMate Backend API")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # api endpoints
    path('', home),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
