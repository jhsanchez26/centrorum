from django.contrib import admin
from .models import User, Conversation, Message, ConversationRequest

admin.site.register(User)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(ConversationRequest)
