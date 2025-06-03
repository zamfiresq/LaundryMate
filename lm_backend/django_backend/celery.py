from __future__ import absolute_import
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_backend.settings')

app = Celery('django_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.broker_url = os.getenv('CELERY_BROKER_URL')
app.autodiscover_tasks()

# ✅ Celery Beat schedule
app.conf.beat_schedule = {
    'check-inactive-users-every-day': {
        'task': 'notifications.tasks.send_reminder_to_inactive_users',
        'schedule': crontab(hour=10, minute=0),  # daily at 10 am 
    },
}
