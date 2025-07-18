import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"

def test_backend_errors():
    """Test backend endpoints to see what errors are returned"""
    
    print("🧪 Testing Backend Error Responses")
    print("=" * 50)
    
    # Test 1: Try to create a contract without required fields
    print("\n1. Testing contract creation without required fields...")
    try:
        response = requests.post(f"{BASE_URL}/inter-org-contracts/create", 
                               json={"target_org_id": "test"})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Try to create a data request without required fields
    print("\n2. Testing data request creation without required fields...")
    try:
        response = requests.post(f"{BASE_URL}/data-requests/send-request", 
                               json={"target_user_email": "test@test.com"})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Check if backend is running
    print("\n3. Testing backend health...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding correctly")
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")

if __name__ == "__main__":
    test_backend_errors() 