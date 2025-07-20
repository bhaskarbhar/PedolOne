#!/usr/bin/env python3
"""
Test script to verify server starts correctly with file sharing
"""

import sys
import os

# Add the backend directory to the Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

# Change to backend directory for file operations
os.chdir(backend_path)

def test_imports():
    """Test if all imports work correctly"""
    print("🔍 Testing imports...")
    
    try:
        # Test basic imports
        print("Testing basic imports...")
        from helpers import (
            users_collection, 
            organizations_collection, 
            inter_org_contracts_collection,
            logs_collection,
            get_organization_by_id,
            get_client_ip,
            get_database
        )
        print("✅ Basic imports successful")
        
        # Test models import
        print("Testing models import...")
        from models import (
            FileRequest, 
            SharedFile, 
            CreateFileRequest, 
            UploadFileRequest, 
            DirectFileShare
        )
        print("✅ Models import successful")
        
        # Test file sharing router import
        print("Testing file sharing router import...")
        from routers.file_sharing import router
        print("✅ File sharing router import successful")
        
        # Test main app import
        print("Testing main app import...")
        from main import app
        print("✅ Main app import successful")
        
        print("\n🎉 All imports successful! Server should start correctly.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_collections():
    """Test if database collections are accessible"""
    print("\n🔍 Testing database collections...")
    
    try:
        from helpers import get_database
        db = get_database()
        
        # Test if collections exist
        collections = [
            "users",
            "organizations", 
            "inter_org_contracts",
            "logs",
            "file_requests",
            "shared_files"
        ]
        
        for collection_name in collections:
            try:
                collection = db[collection_name]
                # Try to access collection info
                collection.find_one()
                print(f"✅ Collection '{collection_name}' accessible")
            except Exception as e:
                print(f"⚠️ Collection '{collection_name}' not accessible: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing PedolOne Server with File Sharing")
    print("=" * 50)
    
    # Test imports
    imports_ok = test_imports()
    
    # Test collections
    collections_ok = test_collections()
    
    print("\n" + "=" * 50)
    if imports_ok and collections_ok:
        print("✅ All tests passed! Server should start successfully.")
        print("\nTo start the server, run:")
        print("cd backend")
        print("uvicorn main:app --reload")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1) 