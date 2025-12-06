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
        install_result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt', '-q'
        ], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        
        result = subprocess.run([
            sys.executable, '-m', 'pytest',
            '--ignore=test_runner.py',
            '--cov=accounts',
            '--cov=listings',
            '--cov-report=html',
            '--cov-report=term-missing',
            '-v',
            '--tb=no'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        
        # Parse and display only test results
        lines = result.stdout.split('\n')
        test_results = []
        summary_lines = []
        
        for line in lines:
            line_stripped = line.strip()
            # Capture individual test results
            if (' PASSED' in line or ' FAILED' in line or ' ERROR' in line) and 'test_' in line:
                test_results.append(line_stripped)
            # Capture summary lines
            elif any(keyword in line.lower() for keyword in ['passed', 'failed', 'error', 'warnings']):
                if 'test session starts' not in line.lower() and 'short test summary' not in line.lower():
                    summary_lines.append(line_stripped)
        
        if test_results:
            for test in test_results:
                print(test)
        
        # Show summary at the end
        if summary_lines:
            print("\n" + "=" * 50)
            for line in summary_lines[-3:]:  # Show last 3 summary lines
                if line:
                    print(line)
        
        if result.stderr and result.returncode != 0:
            error_lines = [line.strip() for line in result.stderr.split('\n') if line.strip() and 'warning' not in line.lower()]
            if error_lines:
                print("\nErrors:")
                for err in error_lines[:5]:  # Show first 5 error lines
                    print(err)
        
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
        
        subprocess.run([npm_cmd, 'install', '--silent'], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        result = subprocess.run([
            npm_cmd, 'run', 'test', '--', '--run', '--reporter=verbose'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        # Parse and display only test results
        lines = result.stdout.split('\n')
        test_results = []
        summary_lines = []
        
        for line in lines:
            line_stripped = line.strip()
            # Capture test results (✓ or × markers, or PASS/FAIL)
            if ('✓' in line or '×' in line) and ('test' in line.lower() or '.test.' in line or '.spec.' in line):
                test_results.append(line_stripped)
            # Capture summary lines
            elif any(keyword in line for keyword in ['Test Files', 'Tests ', 'passed', 'failed']):
                if line_stripped and 'node_modules' not in line:
                    summary_lines.append(line_stripped)
        
        if test_results:
            for test in test_results:
                print(test)
        
        # Show summary at the end
        if summary_lines:
            print("\n" + "=" * 50)
            for line in summary_lines[-3:]:  # Show last 3 summary lines
                if line:
                    print(line)
        
        if result.stderr and result.returncode != 0:
            error_lines = [line.strip() for line in result.stderr.split('\n') if line.strip() and 'warning' not in line.lower()]
            if error_lines:
                print("\nErrors:")
                for err in error_lines[:5]:  # Show first 5 error lines
                    print(err)
        
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
