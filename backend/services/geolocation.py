import httpx
import asyncio
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class GeolocationService:
    """Service for resolving IP addresses to geographic location information"""
    
    def __init__(self):
        self.base_url = "http://ip-api.com/json"
        self.timeout = 5.0  # 5 seconds timeout
        
    async def get_location_from_ip(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """
        Get location information from IP address
        
        Args:
            ip_address: The IP address to resolve
            
        Returns:
            Dictionary containing location information or None if failed
        """
        # Handle localhost and private IPs
        if self._is_localhost_or_private(ip_address):
            return {
                "country": "India",
                "countryCode": "IN",
                "region": "Delhi",
                "regionName": "Delhi",
                "city": "New Delhi",
                "zip": "",
                "lat": 28.6139,
                "lon": 77.2090,
                "timezone": "Asia/Kolkata",
                "isp": "Local Network",
                "org": "Local Development",
                "as": "",
                "query": ip_address
            }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/{ip_address}")
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "success":
                    return {
                        "country": data.get("country", "Unknown"),
                        "countryCode": data.get("countryCode", ""),
                        "region": data.get("region", ""),
                        "regionName": data.get("regionName", ""),
                        "city": data.get("city", ""),
                        "zip": data.get("zip", ""),
                        "lat": data.get("lat"),
                        "lon": data.get("lon"),
                        "timezone": data.get("timezone", ""),
                        "isp": data.get("isp", ""),
                        "org": data.get("org", ""),
                        "as": data.get("as", ""),
                        "query": data.get("query", ip_address)
                    }
                else:
                    logger.warning(f"Geolocation API failed for IP {ip_address}: {data.get('message', 'Unknown error')}")
                    return None
                    
        except httpx.TimeoutException:
            logger.warning(f"Geolocation API timeout for IP {ip_address}")
            return None
        except httpx.HTTPStatusError as e:
            logger.warning(f"Geolocation API HTTP error for IP {ip_address}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in geolocation service for IP {ip_address}: {e}")
            return None
    
    def _is_localhost_or_private(self, ip_address: str) -> bool:
        """
        Check if IP address is localhost or private network
        
        Args:
            ip_address: The IP address to check
            
        Returns:
            True if localhost or private, False otherwise
        """
        if not ip_address or ip_address.lower() in ['localhost', '127.0.0.1', '::1']:
            return True
            
        # Check for private IP ranges
        try:
            parts = ip_address.split('.')
            if len(parts) == 4:
                first_octet = int(parts[0])
                second_octet = int(parts[1])
                
                # Private IP ranges
                if first_octet == 10:  # 10.0.0.0/8
                    return True
                elif first_octet == 172 and 16 <= second_octet <= 31:  # 172.16.0.0/12
                    return True
                elif first_octet == 192 and second_octet == 168:  # 192.168.0.0/16
                    return True
                    
        except (ValueError, IndexError):
            pass
            
        return False
    
    def get_region_display_name(self, location_data: Optional[Dict[str, Any]]) -> str:
        """
        Get a human-readable region name from location data
        
        Args:
            location_data: Location data from geolocation service
            
        Returns:
            Human-readable region name
        """
        if not location_data:
            return "Unknown Location"
            
        city = location_data.get("city", "")
        region = location_data.get("regionName", "")
        country = location_data.get("country", "")
        
        if city and region:
            return f"{city}, {region}, {country}"
        elif city:
            return f"{city}, {country}"
        elif region:
            return f"{region}, {country}"
        elif country:
            return country
        else:
            return "Unknown Location"

# Global instance
geolocation_service = GeolocationService() 