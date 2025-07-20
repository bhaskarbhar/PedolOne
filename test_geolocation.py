#!/usr/bin/env python3
"""
Test script for geolocation functionality
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'PedolOne', 'backend'))

from services.geolocation import geolocation_service

async def test_geolocation():
    """Test the geolocation service with various IP addresses"""
    
    test_ips = [
        "8.8.8.8",  # Google DNS (should be US)
        "1.1.1.1",  # Cloudflare DNS (should be US)
        "127.0.0.1",  # Localhost (should default to India)
        "192.168.1.1",  # Private IP (should default to India)
        "203.208.60.1",  # Example IP (should be somewhere in Asia)
    ]
    
    print("Testing Geolocation Service")
    print("=" * 50)
    
    for ip in test_ips:
        print(f"\nTesting IP: {ip}")
        try:
            location_data = await geolocation_service.get_location_from_ip(ip)
            
            if location_data:
                display_name = geolocation_service.get_region_display_name(location_data)
                print(f"  Location: {display_name}")
                print(f"  Country: {location_data.get('country', 'Unknown')}")
                print(f"  City: {location_data.get('city', 'Unknown')}")
                print(f"  ISP: {location_data.get('isp', 'Unknown')}")
            else:
                print("  Result: Could not resolve location")
                
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\n" + "=" * 50)
    print("Geolocation test completed!")

if __name__ == "__main__":
    asyncio.run(test_geolocation()) 