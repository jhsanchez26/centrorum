# Generated migration to add message field to ConversationRequest model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_add_messaging_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversationrequest',
            name='message',
            field=models.TextField(blank=True, help_text='Optional message from the requester'),
        ),
    ]

