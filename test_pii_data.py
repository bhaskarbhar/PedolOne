#!/usr/bin/env python3
"""
Test script to check PII data in the system and debug CSV creation
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")

# Collections
users_collection = db.get_collection("users")
user_pii_collection = db.get_collection("user_pii")
data_requests_collection = db.get_collection("data_requests")

def check_pii_data():
    """Check PII data in the system"""
    
    print("🔍 Checking PII data in the system...\n")
    
    # Check users
    users = list(users_collection.find({}))
    print(f"📊 Total users: {len(users)}")
    
    for user in users[:5]:  # Show first 5 users
        print(f"  - User ID: {user.get('userid')}, Email: {user.get('email')}, Type: {user.get('user_type')}")
    
    # Check PII data
    pii_docs = list(user_pii_collection.find({}))
    print(f"\n📊 Total PII documents: {len(pii_docs)}")
    
    for pii_doc in pii_docs:
        user_id = pii_doc.get('user_id')
        pii_entries = pii_doc.get('pii', [])
        print(f"  - User ID: {user_id}, PII entries: {len(pii_entries)}")
        
        for entry in pii_entries:
            resource = entry.get('resource')
            has_original = 'original' in entry
            has_tokenized = 'tokenized' in entry
            print(f"    * Resource: {resource}, Has original: {has_original}, Has tokenized: {has_tokenized}")
    
    # Check data requests
    requests = list(data_requests_collection.find({}))
    print(f"\n📊 Total data requests: {len(requests)}")
    
    for req in requests:
        request_id = req.get('request_id')
        status = req.get('status')
        target_user_id = req.get('target_user_id')
        requested_resources = req.get('requested_resources', [])
        is_bulk = req.get('is_bulk_request', False)
        bulk_id = req.get('bulk_request_id')
        
        print(f"  - Request ID: {request_id}, Status: {status}, Target User: {target_user_id}")
        print(f"    Resources: {requested_resources}, Is Bulk: {is_bulk}, Bulk ID: {bulk_id}")

def check_specific_bulk_request(bulk_request_id):
    """Check a specific bulk request"""
    
    print(f"\n🔍 Checking bulk request: {bulk_request_id}")
    
    requests = list(data_requests_collection.find({"bulk_request_id": bulk_request_id}))
    print(f"📊 Found {len(requests)} requests for this bulk request")
    
    for req in requests:
        print(f"\n  Request ID: {req.get('request_id')}")
        print(f"  Status: {req.get('status')}")
        print(f"  Target User ID: {req.get('target_user_id')}")
        print(f"  Requested Resources: {req.get('requested_resources')}")
        
        # Check if user has PII data
        user_id = req.get('target_user_id')
        pii_doc = user_pii_collection.find_one({"user_id": user_id})
        
        if pii_doc:
            pii_entries = pii_doc.get('pii', [])
            print(f"  PII entries found: {len(pii_entries)}")
            
            for entry in pii_entries:
                resource = entry.get('resource')
                requested_resources = req.get('requested_resources', [])
                
                if resource in requested_resources:
                    print(f"    ✅ Resource '{resource}' matches requested resource")
                    print(f"    Has original data: {'original' in entry}")
                    print(f"    Has tokenized data: {'tokenized' in entry}")
                else:
                    print(f"    ❌ Resource '{resource}' not in requested resources {requested_resources}")
        else:
            print(f"  ❌ No PII document found for user {user_id}")

def main():
    """Run the test"""
    print("🧪 PII Data Debug Test\n")
    
    try:
        check_pii_data()
        
        # Check the specific bulk request that was created
        bulk_request_id = "20b1eb96-ce68-4885-a35d-e39d4db6ff11"
        check_specific_bulk_request(bulk_request_id)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 