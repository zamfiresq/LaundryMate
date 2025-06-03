from django.urls import path
from .views import send_test_notification  

urlpatterns = [
    path('send-test-notification/', send_test_notification),
]