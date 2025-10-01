from django.test import TestCase
class HealthTest(TestCase):
    def test_health(self):
        from django.urls import reverse
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
