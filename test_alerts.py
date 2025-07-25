#!/usr/bin/env python3
"""
Test script to demonstrate the alerts functionality
This script simulates various suspicious activities to trigger alerts
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
ORG_ID = "test_org_123"  # Replace with actual org ID
USER_ID = 1  # Replace with actual user ID

def login_and_get_token():
    """Login and get authentication token"""
    login_data = {
        "email": "admin@testorg.com",  # Replace with actual admin email
        "password": "admin123"  # Replace with actual password
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_failed_login_alert(token):
    """Simulate failed login attempts"""
    print("🔴 Simulating failed login attempts...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Simulate multiple failed logins (3+ attempts in 2 minutes will trigger alert)
    for i in range(4):
        failed_login_data = {
            "email": "hacker@evil.com",
            "password": "wrong_password"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=failed_login_data)
        print(f"Failed login attempt {i+1}: {response.status_code}")
        time.sleep(0.5)  # Faster attempts to trigger the 2-minute threshold
    
    # Check for suspicious activity
    response = requests.post(f"{BASE_URL}/alerts/check-suspicious-activity", headers=headers)
    print(f"Suspicious activity check: {response.status_code}")

def create_multiple_requests_alert(token):
    """Simulate multiple data requests"""
    print("🟡 Simulating multiple data requests...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Simulate multiple data requests
    for i in range(7):
        request_data = {
            "target_org_id": "target_org_456",
            "target_user_email": "user@target.com",
            "requested_resources": ["personal_info", "financial_data"],
            "requested_purposes": ["research", "analysis"],
            "retention_window": "30 days",
            "request_message": f"Test request {i+1}"
        }
        
        response = requests.post(f"{BASE_URL}/data-requests/create", json=request_data, headers=headers)
        print(f"Data request {i+1}: {response.status_code}")
        time.sleep(0.5)
    
    # Check for suspicious activity
    response = requests.post(f"{BASE_URL}/alerts/check-suspicious-activity", headers=headers)
    print(f"Suspicious activity check: {response.status_code}")

def create_foreign_access_alert(token):
    """Simulate foreign access (this would normally be detected by IP)"""
    print("🟠 Simulating foreign access detection...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # This would normally be detected by the IP address
    # For demo purposes, we'll just check suspicious activity
    response = requests.post(f"{BASE_URL}/alerts/check-suspicious-activity", headers=headers)
    print(f"Foreign access check: {response.status_code}")

def view_alerts(token):
    """View all alerts for the organization"""
    print("📋 Viewing alerts...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/alerts/org/{ORG_ID}", headers=headers)
    if response.status_code == 200:
        alerts = response.json()
        print(f"Found {alerts['total_count']} alerts:")
        for alert in alerts['alerts']:
            print(f"  - {alert['alert_type_display']} ({alert['severity']}): {alert['description']}")
            print(f"    Location: {alert['location']['city']}, {alert['location']['country']}")
            print(f"    IP: {alert['ip_address']}")
            print(f"    Created: {alert['created_at']}")
            print(f"    Status: {'Read' if alert['is_read'] else 'Unread'}")
            print()
    else:
        print(f"Failed to fetch alerts: {response.text}")

def mark_alerts_as_read(token):
    """Mark all alerts as read"""
    print("✅ Marking all alerts as read...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.put(f"{BASE_URL}/alerts/org/{ORG_ID}/mark-all-read", headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"Marked {result['modified_count']} alerts as read")
    else:
        print(f"Failed to mark alerts as read: {response.text}")

def test_ip_blocking(token):
    """Test IP blocking functionality"""
    print("🚫 Testing IP blocking functionality...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test blocking an IP
    test_ip = "192.168.1.100"
    block_data = {"ip_address": test_ip}
    
    response = requests.post(f"{BASE_URL}/alerts/block-ip", json=block_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ IP {test_ip} blocked successfully")
        print(f"Blocked IPs: {result['blocked_ips']}")
    else:
        print(f"❌ Failed to block IP: {response.text}")
    
    # Test getting blocked IPs
    response = requests.get(f"{BASE_URL}/alerts/blocked-ips", headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"📋 Current blocked IPs: {result['blocked_ips']}")
    else:
        print(f"❌ Failed to get blocked IPs: {response.text}")
    
    # Test unblocking an IP
    response = requests.delete(f"{BASE_URL}/alerts/unblock-ip/{test_ip}", headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ IP {test_ip} unblocked successfully")
        print(f"Remaining blocked IPs: {result['blocked_ips']}")
    else:
        print(f"❌ Failed to unblock IP: {response.text}")

def main():
    print("🚨 PedolOne Alerts System Demo")
    print("=" * 50)
    
    # Login and get token
    token = login_and_get_token()
    if not token:
        print("❌ Failed to get authentication token. Please check your credentials.")
        return
    
    print("✅ Successfully authenticated")
    print()
    
    # Simulate various suspicious activities
    create_failed_login_alert(token)
    print()
    
    create_multiple_requests_alert(token)
    print()
    
    create_foreign_access_alert(token)
    print()
    
    # Wait a moment for alerts to be processed
    print("⏳ Waiting for alerts to be processed...")
    time.sleep(2)
    
    # View all alerts
    view_alerts(token)
    print()
    
    # Mark alerts as read
    mark_alerts_as_read(token)
    print()
    
    # Test IP blocking functionality
    test_ip_blocking(token)
    print()
    
    # View alerts again to confirm they're marked as read
    print("📋 Viewing alerts after marking as read...")
    view_alerts(token)
    
    print("\n🎉 Demo completed!")

if __name__ == "__main__":
    main() 