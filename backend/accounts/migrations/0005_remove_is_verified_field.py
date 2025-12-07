# Migration to remove is_verified field from User model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_add_message_to_conversationrequest'),
    ]

    operations = [
        # Use RunSQL to safely drop the column if it exists
        # This handles the case where the field exists in DB but not in model
        migrations.RunSQL(
            sql="ALTER TABLE accounts_user DROP COLUMN IF EXISTS is_verified;",
            reverse_sql="ALTER TABLE accounts_user ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL;",
        ),
    ]
