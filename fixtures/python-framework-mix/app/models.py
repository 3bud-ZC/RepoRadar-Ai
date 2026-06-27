from django.db import models

class UserProfile(models.Model):
    email = models.EmailField()
