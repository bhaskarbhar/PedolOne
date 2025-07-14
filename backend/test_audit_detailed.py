#!/usr/bin/env python3
"""
Detailed test to debug the audit endpoint
"""
from pymongo import MongoClient
import json

def test_audit_detailed():
    # Connect to MongoDB
    client = MongoClient('mongodb://localhost:27017/')
    db = client.PedolOne
    
    print("=== DETAILED AUDIT TEST ===")
    
    # Check what we're looking for
    org_id = "bankabc_001"
    org_name = "BankABC"
    
    print(f"Looking for logs with:")
    print(f"  - org_id: {org_id}")
    print(f"  - org_name: {org_name}")
    
    # Test the query manually
    query = {
        "$or": [
            {"fintech_name": org_id},  # Direct logs with this org ID
            {"fintech_name": org_name},  # Direct logs with this org name
            {"source_org_id": org_id},  # Inter-org logs where this org is source
            {"target_org_id": org_id}   # Inter-org logs where this org is target
        ]
    }
    
    print(f"\nQuery: {json.dumps(query, indent=2)}")
    
    # Execute the query
    logs = list(db.logs.find(query))
    print(f"\nFound {len(logs)} logs")
    
    # Show all logs in the database
    all_logs = list(db.logs.find())
    print(f"\nAll logs in database ({len(all_logs)}):")
    for i, log in enumerate(all_logs):
        print(f"  {i+1}. fintech_name: '{log['fintech_name']}', user_id: {log['user_id']}, resource: {log['resource_name']}")
    
    # Test individual parts of the query
    print(f"\nTesting individual query parts:")
    
    # Test fintech_name = org_id
    logs_org_id = list(db.logs.find({"fintech_name": org_id}))
    print(f"  - fintech_name = '{org_id}': {len(logs_org_id)} logs")
    
    # Test fintech_name = org_name
    logs_org_name = list(db.logs.find({"fintech_name": org_name}))
    print(f"  - fintech_name = '{org_name}': {len(logs_org_name)} logs")
    
    # Test source_org_id = org_id
    logs_source = list(db.logs.find({"source_org_id": org_id}))
    print(f"  - source_org_id = '{org_id}': {len(logs_source)} logs")
    
    # Test target_org_id = org_id
    logs_target = list(db.logs.find({"target_org_id": org_id}))
    print(f"  - target_org_id = '{org_id}': {len(logs_target)} logs")
    
    client.close()

if __name__ == "__main__":
    test_audit_detailed() 