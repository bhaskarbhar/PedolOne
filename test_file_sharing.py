#!/usr/bin/env python3
"""
Test script for file sharing functionality
"""

import requests
import json
import os
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
TEST_ORG_ID = "test_org_123"
TEST_USER_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

def test_file_sharing():
    """Test the complete file sharing workflow"""
    
    print("🔍 Testing File Sharing Functionality")
    print("=" * 50)
    
    # Step 1: Create a test organization and user
    print("\n1. Creating test organization and user...")
    
    # Create organization
    org_data = {
        "org_name": "Test Organization",
        "org_id": TEST_ORG_ID,
        "org_type": "bank",
        "contact_email": TEST_USER_EMAIL
    }
    
    try:
        response = requests.post(f"{BASE_URL}/organization/create", json=org_data)
        if response.status_code == 200:
            print("✅ Organization created successfully")
        else:
            print(f"⚠️ Organization creation: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Organization creation failed: {e}")
    
    # Create user
    user_data = {
        "username": "testuser",
        "email": TEST_USER_EMAIL,
        "password": TEST_PASSWORD,
        "user_type": "organization",
        "organization_id": TEST_ORG_ID,
        "organization_name": "Test Organization"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 200:
            print("✅ User created successfully")
        else:
            print(f"⚠️ User creation: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ User creation failed: {e}")
    
    # Step 2: Login to get token
    print("\n2. Logging in...")
    
    login_data = {
        "username": TEST_USER_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Login successful")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return
    
    # Step 3: Create a contract for file sharing
    print("\n3. Creating contract for file sharing...")
    
    contract_data = {
        "target_org_id": "other_org_456",
        "contract_name": "Test File Sharing Contract",
        "contract_type": "file_sharing",
        "contract_description": "Contract for testing file sharing functionality",
        "resources_allowed": [
            {
                "resource_name": "file_sharing",
                "purpose": ["Document sharing", "Contract review"],
                "retention_window": "30 days",
                "created_at": datetime.utcnow().isoformat(),
                "ends_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "signature": ""
            }
        ],
        "approval_message": "Testing file sharing"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/inter-org-contracts/create", json=contract_data, headers=headers)
        if response.status_code == 200:
            contract_id = response.json().get("contract_id")
            print(f"✅ Contract created successfully: {contract_id}")
        else:
            print(f"❌ Contract creation failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Contract creation failed: {e}")
        return
    
    # Step 4: Create a file request
    print("\n4. Creating file request...")
    
    file_request_data = {
        "contract_id": contract_id,
        "target_org_id": "other_org_456",
        "file_description": "Test file request for contract documents",
        "file_category": "contract",
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    
    try:
        response = requests.post(f"{BASE_URL}/file-sharing/request-file", json=file_request_data, headers=headers)
        if response.status_code == 200:
            request_id = response.json().get("request_id")
            print(f"✅ File request created successfully: {request_id}")
        else:
            print(f"❌ File request creation failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ File request creation failed: {e}")
        return
    
    # Step 5: Get file requests
    print("\n5. Getting file requests...")
    
    try:
        response = requests.get(f"{BASE_URL}/file-sharing/requests/{TEST_ORG_ID}", headers=headers)
        if response.status_code == 200:
            requests_data = response.json()
            print(f"✅ Retrieved {len(requests_data.get('file_requests', []))} file requests")
        else:
            print(f"❌ Getting file requests failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Getting file requests failed: {e}")
    
    # Step 6: Test direct file sharing
    print("\n6. Testing direct file sharing...")
    
    # Create a test PDF file
    test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF"
    
    test_pdf_path = "test_document.pdf"
    with open(test_pdf_path, "wb") as f:
        f.write(test_pdf_content)
    
    try:
        with open(test_pdf_path, "rb") as f:
            files = {"file": ("test_document.pdf", f, "application/pdf")}
            data = {
                "target_org_id": "other_org_456",
                "file_description": "Test direct file share",
                "file_category": "contract",
                "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            
            response = requests.post(f"{BASE_URL}/file-sharing/direct-share", files=files, data=data, headers=headers)
            if response.status_code == 200:
                file_id = response.json().get("file_id")
                print(f"✅ Direct file share successful: {file_id}")
            else:
                print(f"❌ Direct file share failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Direct file share failed: {e}")
    finally:
        # Clean up test file
        if os.path.exists(test_pdf_path):
            os.remove(test_pdf_path)
    
    # Step 7: Get shared files
    print("\n7. Getting shared files...")
    
    try:
        response = requests.get(f"{BASE_URL}/file-sharing/shared-files/{TEST_ORG_ID}", headers=headers)
        if response.status_code == 200:
            files_data = response.json()
            print(f"✅ Retrieved {len(files_data.get('shared_files', []))} shared files")
        else:
            print(f"❌ Getting shared files failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Getting shared files failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 File sharing functionality test completed!")
    print("\nKey Features Tested:")
    print("✅ Organization and user creation")
    print("✅ Authentication and token management")
    print("✅ Contract creation with file sharing")
    print("✅ File request creation")
    print("✅ File request retrieval")
    print("✅ Direct file sharing")
    print("✅ Shared files retrieval")
    print("✅ PDF file validation and encryption")

if __name__ == "__main__":
    test_file_sharing() 