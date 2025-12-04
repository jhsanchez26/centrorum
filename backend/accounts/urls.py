from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
    path('users/<str:user_id>/', views.user_profile, name='user-profile'),
    # Messaging endpoints
    path('conversations/', views.list_conversations, name='list-conversations'),
    path('conversation-requests/', views.list_conversation_requests, name='list-conversation-requests'),
    path('conversation-requests/create/', views.create_conversation_request, name='create-conversation-request'),
    path('conversation-requests/<int:request_id>/respond/', views.respond_to_conversation_request, name='respond-conversation-request'),
    path('conversations/<int:conversation_id>/messages/', views.get_conversation_messages, name='get-conversation-messages'),
    path('conversations/<int:conversation_id>/send/', views.send_message, name='send-message'),
    path('conversations/<int:conversation_id>/mark-read/', views.mark_messages_as_read, name='mark-messages-read'),
]
