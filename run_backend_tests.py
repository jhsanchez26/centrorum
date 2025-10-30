"""
Backend-only test runner for Centrorum
"""
import subprocess
import sys
import os

if sys.platform == 'win32':
    import io
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def main():
    """Run backend tests only"""
    print("Running Backend Tests Only")
    print("=" * 50)
    
    original_dir = os.getcwd()
    os.chdir('backend')
    
    try:
        print("Installing backend dependencies...")
        install_result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], check=True, capture_output=True, text=True, timeout=300)
        print("Dependencies installed successfully")
        
        print("Running tests...")
        result = subprocess.run([
            sys.executable, '-m', 'pytest',
            '--cov=accounts',
            '--cov=listings',
            '--cov-report=html',
            '--cov-report=term-missing',
            '-v',
            '--tb=short'
        ], timeout=300)
        
        if result.returncode == 0:
            print("\nBackend tests passed!")
            print("Coverage report generated in backend/htmlcov/index.html")
        else:
            print("\nBackend tests failed!")
        
        return result.returncode
        
    except subprocess.TimeoutExpired:
        print("Tests timed out after 5 minutes")
        return 1
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return 1
    except Exception as e:
        print(f"Error running backend tests: {e}")
        return 1
    finally:
        os.chdir(original_dir)

if __name__ == '__main__':
    sys.exit(main())
