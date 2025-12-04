from itsdangerous import URLSafeSerializer
from django.conf import settings

def get_user_id_serializer():
    """Get a serializer instance for encrypting/decrypting user IDs"""
    return URLSafeSerializer(settings.SECRET_KEY, salt='user-id')

def encrypt_user_id(user_id):
    """Encrypt a user ID to a URL-safe token"""
    serializer = get_user_id_serializer()
    return serializer.dumps(user_id)

def decrypt_user_id(encrypted_id):
    """Decrypt a user ID token back to the original ID"""
    serializer = get_user_id_serializer()
    try:
        return serializer.loads(encrypted_id)
    except Exception:
        return None

