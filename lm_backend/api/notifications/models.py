# modelul de logare a notificarilor

from django.db import models

class NotificationLog(models.Model):
    user_id = models.CharField(max_length=128)
    token = models.CharField(max_length=512)
    timestamp = models.DateTimeField(auto_now_add=True)
    message = models.TextField()
    
    def __str__(self):
        return f"Notif -> {self.user_id} @ {self.timestamp}"