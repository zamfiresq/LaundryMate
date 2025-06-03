import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def send_test_notification(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

    url = "https://exp.host/--/api/v2/push/send"
    payload = {
        "to": token,
        "sound": "default",
        "title": "LaundryMate",
        "body": "You haven’t scanned in a while. Ready for a laundry session?"
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        return Response({
            'message': 'Notification sent!',
            'expo_response': response.json()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)