#!/usr/bin/env python3
"""
Simple test to verify CSV functionality with actual PII data
"""

import os
import csv
import io
from datetime import datetime
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

def test_csv_with_real_data():
    """Test CSV creation with real PII data"""
    
    print("🧪 Testing CSV creation with real PII data...\n")
    
    # Get the specific bulk request that was created
    bulk_request_id = "20b1eb96-ce68-4885-a35d-e39d4db6ff11"
    
    # Get all requests for this bulk request
    requests = list(data_requests_collection.find({"bulk_request_id": bulk_request_id}))
    print(f"📊 Found {len(requests)} requests for bulk request {bulk_request_id}")
    
    # Collect data for CSV
    csv_data = []
    
    for request in requests:
        if request["status"] == "approved":
            print(f"Processing approved request {request['request_id']} for user {request['target_user_id']}")
            
            # Get target user info
            target_user = users_collection.find_one({"userid": request["target_user_id"]})
            if not target_user:
                print(f"Target user {request['target_user_id']} not found")
                continue
            
            print(f"Target user found: {target_user.get('email', 'N/A')}")
            print(f"Requested resources: {request['requested_resources']}")
            
            # Get PII data for each requested resource
            for resource in request["requested_resources"]:
                # Find the user's PII document
                user_pii_doc = user_pii_collection.find_one({
                    "user_id": request["target_user_id"]
                })
                
                if user_pii_doc and "pii" in user_pii_doc:
                    print(f"Found PII document for user {request['target_user_id']} with {len(user_pii_doc['pii'])} PII entries")
                    
                    # Find the specific resource within the PII array
                    pii_entry = next((pii for pii in user_pii_doc["pii"] if pii["resource"] == resource), None)
                    
                    if pii_entry:
                        print(f"Found PII entry for resource {resource}")
                        
                        # Get the PII value - try to decrypt if it's encrypted, otherwise use as-is
                        pii_value = pii_entry["original"]
                        
                        # Check if the value is encrypted (try to decrypt it)
                        try:
                            from helpers import decrypt_pii
                            # Try to decrypt - if it fails, it's probably plain text
                            decrypted_value = decrypt_pii(pii_value)
                            print(f"Successfully decrypted PII value for {resource}")
                        except Exception as e:
                            # If decryption fails, use the original value as-is (it's already plain text)
                            decrypted_value = pii_value
                            print(f"Using plain text PII value for {resource} (not encrypted)")
                        
                        csv_data.append({
                            "email": target_user.get("email", "N/A"),
                            "full_name": target_user.get("full_name", "N/A"),
                            "resource_type": resource,
                            "purpose": ", ".join(request["purpose"]) if isinstance(request["purpose"], list) else request["purpose"],
                            "value": decrypted_value,
                            "request_id": request["request_id"],
                            "requested_at": request["created_at"].strftime("%Y-%m-%d %H:%M:%S"),
                            "expires_at": request["expires_at"].strftime("%Y-%m-%d %H:%M:%S")
                        })
                        
                        print(f"✅ Added CSV row for {resource}: {decrypted_value[:20]}...")
                    else:
                        print(f"No PII data found for user {request['target_user_id']}, resource {resource}")
                else:
                    print(f"No PII document found for user {request['target_user_id']}")
    
    if not csv_data:
        print("❌ No CSV data collected")
        return False
    
    print(f"\n📊 Collected {len(csv_data)} records for CSV export")
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ["email", "full_name", "resource_type", "purpose", "value", "request_id", "requested_at", "expires_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(csv_data)
    
    csv_content = output.getvalue()
    output.close()
    
    print("✅ CSV content created successfully:")
    print(csv_content)
    
    # Save to test file
    test_filename = f"test_csv_output_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    test_file_path = f"public/csv_files/{test_filename}"
    
    os.makedirs("public/csv_files", exist_ok=True)
    with open(test_file_path, 'w', newline='', encoding='utf-8') as csvfile:
        csvfile.write(csv_content)
    
    print(f"✅ Test CSV file saved to: {test_file_path}")
    
    return True

if __name__ == "__main__":
    test_csv_with_real_data() 