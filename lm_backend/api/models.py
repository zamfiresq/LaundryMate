from django.db import models

# garment model to store the detected symbols
class Garment(models.Model):
    image = models.ImageField(upload_to='media/garment_labels/')
    detected_symbols = models.JSONField(default=list) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Garment {self.id} - {self.created_at}"
