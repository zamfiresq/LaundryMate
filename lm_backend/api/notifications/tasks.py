import requests
import firebase_admin
from celery import shared_task
from .models import NotificationLog
from django.utils import timezone
from datetime import timedelta
from firebase_admin import firestore, credentials

if not firebase_admin._apps:
    cred = credentials.Certificate('lm_backend/credentials/laundrymate-bb74e-3a5b0e896675.json')
    firebase_admin.initialize_app(cred)

@shared_task
def send_push_notification(token):
    payload = {
        "to": token,
        "sound": "default",
        "title": "LaundryMate",
        "body": "You haven't scanned in a while. Ready for a laundry session!",
    }
    headers = {
        "Content-Type": "application/json"
    }
    requests.post("https://exp.host/--/api/v2/push/send", json=payload, headers=headers)


# task to notify inactive users
@shared_task
def send_inactive_users_notifications():
    db = firestore.client()
    seven_days_ago = timezone.now() - timedelta(days=7)

    users_ref = db.collection("users")
    users = users_ref.stream()

    for user in users:
        data = user.to_dict()
        last_upload_str = data.get("last_upload")
        token = data.get("expo_push_token")

        if not last_upload_str or not token:
            continue

        try:
            last_upload = timezone.datetime.fromisoformat(last_upload_str)
            if last_upload.tzinfo is None:
                last_upload = timezone.make_aware(last_upload)
            if last_upload < seven_days_ago:
                send_push_notification.delay(token)
                NotificationLog.objects.create(
                    user_id=user.id,
                    token=token,
                    message="You haven’t scanned in a while. Ready for a laundry session?"
                )
        except Exception as e:
            print(f"Error processing user {user.id}: {e}")