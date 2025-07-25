#!/usr/bin/env python3
"""
Test script to verify failed login alert functionality
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_failed_login_alerts():
    """Test that failed login attempts trigger alerts"""
    print("🧪 Testing Failed Login Alert System")
    print("=" * 50)
    
    # Test email (should exist in your system)
    test_email = "aryancollegeskills@gmail.com"
    
    print(f"📧 Testing with email: {test_email}")
    print(f"⏰ Will attempt 4 failed logins in quick succession")
    print(f"🎯 Expected: Alert triggered after 3+ failed attempts in 2 minutes")
    print()
    
    # Attempt multiple failed logins
    for i in range(4):
        print(f"🔴 Attempt {i+1}/4: Failed login attempt...")
        
        failed_login_data = {
            "email": test_email,
            "password": f"wrong_password_{i}"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=failed_login_data)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✅ Expected: Invalid credentials")
            else:
                print(f"   ⚠️  Unexpected: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Small delay between attempts
        time.sleep(0.5)
    
    print()
    print("🔍 Now checking if alerts were generated...")
    print("   (You should check the alerts tab in the dashboard)")
    print()
    print("📋 To verify manually:")
    print("   1. Log into the organization dashboard")
    print("   2. Go to the Alerts tab")
    print("   3. Look for 'Failed Login Attempts' alerts")
    print("   4. Check that the alert shows the correct details")
    print()
    print("🎯 Expected Alert Details:")
    print("   - Type: Failed Login")
    print("   - Severity: High")
    print("   - Description: Multiple failed login attempts detected")
    print("   - IP Address: Your local IP")
    print("   - Time Window: 2 minutes")

if __name__ == "__main__":
    test_failed_login_alerts() 