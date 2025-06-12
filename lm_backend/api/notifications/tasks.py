from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests

@api_view(['POST'])
def test_push_notification(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Missing token'}, status=400)

    payload = {
        "to": token,
        "sound": "default",
        "title": "LaundryMate",
        "body": "Push notification from Django backend 🚀"
    }
    headers = {
        "Content-Type": "application/json"
    }

    res = requests.post("https://exp.host/--/api/v2/push/send", json=payload, headers=headers)
    return Response({'status': res.status_code, 'response': res.json()})