#!/usr/bin/env python3
"""
Test script to verify the audit endpoint works correctly
"""
import requests
import json

def test_audit_endpoint():
    # Test the audit endpoint directly
    url = "http://localhost:8000/audit/org/bankabc_001"
    
    # Get a token first (you'll need to replace this with a valid token)
    # For now, let's test without auth to see if the endpoint works
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} audit logs")
            for i, log in enumerate(data[:3]):  # Show first 3 logs
                print(f"Log {i+1}: {log}")
        else:
            print("Error response:", response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_audit_endpoint() 