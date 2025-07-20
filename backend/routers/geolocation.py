from fastapi import APIRouter, HTTPException, Request
from typing import Optional, Dict, Any
from services.geolocation import geolocation_service

router = APIRouter(prefix="/geolocation", tags=["Geolocation"])

@router.get("/test/{ip_address}")
async def test_geolocation(ip_address: str):
    """
    Test geolocation service with a specific IP address
    
    Args:
        ip_address: The IP address to test
        
    Returns:
        Location information for the IP address
    """
    try:
        location_data = await geolocation_service.get_location_from_ip(ip_address)
        
        if location_data:
            return {
                "ip_address": ip_address,
                "location": geolocation_service.get_region_display_name(location_data),
                "details": location_data
            }
        else:
            return {
                "ip_address": ip_address,
                "location": "Unknown Location",
                "details": None,
                "error": "Could not resolve location"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geolocation service error: {str(e)}")

@router.get("/my-location")
async def get_my_location(request: Request):
    """
    Get location information for the current request's IP address
    
    Returns:
        Location information for the client's IP address
    """
    from helpers import get_client_ip
    
    client_ip = get_client_ip(request)
    
    try:
        location_data = await geolocation_service.get_location_from_ip(client_ip)
        
        if location_data:
            return {
                "ip_address": client_ip,
                "location": geolocation_service.get_region_display_name(location_data),
                "details": location_data
            }
        else:
            return {
                "ip_address": client_ip,
                "location": "Unknown Location",
                "details": None,
                "error": "Could not resolve location"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geolocation service error: {str(e)}")

@router.get("/health")
async def geolocation_health():
    """
    Health check for geolocation service
    
    Returns:
        Service status
    """
    try:
        # Test with a known IP (Google's DNS)
        test_ip = "8.8.8.8"
        location_data = await geolocation_service.get_location_from_ip(test_ip)
        
        if location_data:
            return {
                "status": "healthy",
                "service": "geolocation",
                "test_ip": test_ip,
                "test_result": "success"
            }
        else:
            return {
                "status": "degraded",
                "service": "geolocation",
                "test_ip": test_ip,
                "test_result": "failed",
                "message": "Could not resolve test IP"
            }
            
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "geolocation",
            "error": str(e)
        } 