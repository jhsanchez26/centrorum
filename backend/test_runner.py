import subprocess
import sys

result = subprocess.run([
    sys.executable, '-m', 'pytest',
    'accounts/tests/test_profile_views.py',
    'accounts/tests/test_messaging_views.py',
    '-v', '--tb=short'
], capture_output=True, text=True)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr, file=sys.stderr)

sys.exit(result.returncode)
