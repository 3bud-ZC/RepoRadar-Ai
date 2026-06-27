from django.urls import path

urlpatterns = [
    path("health/", lambda request: None),
    path("users/", lambda request: None),
]
