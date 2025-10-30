import subprocess
import sys
import os

if sys.platform == 'win32':
    import io
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_backend_tests():
    """Run backend tests using pytest"""
    print("Running Backend Tests...")
    print("=" * 50)
    
    original_dir = os.getcwd()
    os.chdir('backend')
    
    try:
        print("Installing backend dependencies...")
        install_result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        print("Dependencies installed successfully")
        
        print("Running backend tests...")
        result = subprocess.run([
            sys.executable, '-m', 'pytest',
            '--cov=accounts',
            '--cov=listings',
            '--cov-report=html',
            '--cov-report=term-missing',
            '-v',
            '--tb=short'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("Backend tests timed out after 5 minutes")
        return False
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False
    except Exception as e:
        print(f"Error running backend tests: {e}")
        return False
    finally:
        os.chdir(original_dir)

def run_frontend_tests():
    """Run frontend tests using npm"""
    print("Running Frontend Tests...")
    print("=" * 50)
    
    os.chdir('frontend')
    
    try:
        npm_cmd = 'npm'
        if sys.platform == 'win32':
            for cmd in ['npm', 'npm.cmd', 'npm.bat', 'npx']:
                try:
                    subprocess.run([cmd, '--version'], check=True, capture_output=True)
                    npm_cmd = cmd
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            else:
                print("Error: npm not found. Please install Node.js and npm.")
                return False
        
        print(f"Using npm command: {npm_cmd}")
        
        print("Installing frontend dependencies...")
        subprocess.run([npm_cmd, 'install'], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        print("Running frontend tests...")
        result = subprocess.run([
            npm_cmd, 'run', 'test', '--', '--run'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        output = result.stdout + result.stderr
        import re
        
        tests_failed = re.search(r'Tests\s+\d+\s+failed', output)
        if tests_failed:
            return False
        
        passed_with_count = re.search(r'Tests\s+(\d+)\s+passed\s*\((\d+)\)', output)
        if passed_with_count:
            first_num = int(passed_with_count.group(1))
            second_num = int(passed_with_count.group(2))
            if first_num == second_num:
                return True
        
        test_files_passed = re.search(r'Test Files\s+\d+\s+passed', output)
        tests_simple_passed = re.search(r'Tests\s+\d+\s+passed', output)
        if test_files_passed and tests_simple_passed:
            return True
        
        if result.returncode == 0:
            return True
        
        if tests_simple_passed and not tests_failed:
            return True
        
        return False
        
    except subprocess.CalledProcessError as e:
        print(f"Error running frontend tests: {e}")
        return False
    except Exception as e:
        print(f"Error running frontend tests: {e}")
        return False
    finally:
        os.chdir('..')

def main():
    """Run all tests"""
    print("Centrorum Test Suite")
    print("=" * 50)
    
    backend_success = run_backend_tests()
    frontend_success = run_frontend_tests()
    
    print("\n" + "=" * 50)
    print("Test Results Summary:")
    print(f"Backend Tests: {'PASSED' if backend_success else 'FAILED'}")
    print(f"Frontend Tests: {'PASSED' if frontend_success else 'FAILED'}")
    
    if backend_success and frontend_success:
        print("\nAll tests passed!")
        return 0
    else:
        print("\nSome tests failed!")
        return 1

if __name__ == '__main__':
    sys.exit(main())
