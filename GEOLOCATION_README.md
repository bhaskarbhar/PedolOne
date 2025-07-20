# Geolocation Integration for Audit Logs

This document describes the geolocation functionality implemented in the PedolOne system to enhance audit logs with geographic location information based on IP addresses.

## Overview

The geolocation system automatically resolves IP addresses to geographic locations and enriches audit logs with region, country, and city information. For localhost and private IP addresses, it defaults to India as specified in the requirements.

## Features

- **IP to Location Resolution**: Uses the free ip-api.com service to resolve public IP addresses
- **Localhost/Private IP Handling**: Automatically defaults to India for localhost (127.0.0.1, ::1) and private IP ranges
- **Audit Log Enhancement**: Automatically enriches all audit logs with location information
- **Frontend Display**: Shows location information in the audit log table
- **Error Handling**: Graceful fallback when geolocation service is unavailable

## Implementation Details

### 1. Geolocation Service (`services/geolocation.py`)

The core geolocation service provides:
- `get_location_from_ip(ip_address)`: Resolves IP to location data
- `_is_localhost_or_private(ip_address)`: Detects localhost and private IPs
- `get_region_display_name(location_data)`: Formats location for display

### 2. Database Schema Updates

The audit log models have been extended with:
- `region`: Human-readable location string
- `country`: Country name
- `city`: City name

### 3. API Endpoints

New geolocation endpoints:
- `GET /geolocation/test/{ip_address}`: Test geolocation with specific IP
- `GET /geolocation/my-location`: Get location for current request
- `GET /geolocation/health`: Health check for geolocation service

### 4. Frontend Updates

The audit log table now displays:
- IP Address column
- Location column (showing region information)

## Usage

### Testing the Geolocation Service

1. **Run the test script**:
   ```bash
   cd PedolOne
   python test_geolocation.py
   ```

2. **Test via API**:
   ```bash
   # Test with a specific IP
   curl http://localhost:8000/geolocation/test/8.8.8.8
   
   # Get your current location
   curl http://localhost:8000/geolocation/my-location
   
   # Health check
   curl http://localhost:8000/geolocation/health
   ```

### Viewing Enhanced Audit Logs

1. Access the audit logs through the web interface
2. The location column will show geographic information for each log entry
3. For localhost/private IPs, it will show "New Delhi, Delhi, India"

## Configuration

### Environment Variables

No additional environment variables are required. The system uses the free ip-api.com service.

### Private IP Ranges

The system automatically detects and handles these private IP ranges:
- `10.0.0.0/8` (10.x.x.x)
- `172.16.0.0/12` (172.16.x.x to 172.31.x.x)
- `192.168.0.0/16` (192.168.x.x)

### Localhost Detection

The following are treated as localhost:
- `localhost`
- `127.0.0.1`
- `::1`

## Error Handling

The system includes comprehensive error handling:

1. **API Timeouts**: 5-second timeout for geolocation requests
2. **Service Unavailable**: Graceful fallback to "Unknown Location"
3. **Invalid IPs**: Proper handling of malformed IP addresses
4. **Network Issues**: Continues operation even if geolocation fails

## Performance Considerations

- **Async Operations**: All geolocation calls are asynchronous
- **Caching**: Consider implementing caching for frequently accessed IPs
- **Rate Limiting**: The free ip-api.com service has rate limits
- **Timeout**: 5-second timeout prevents hanging requests

## Security Considerations

- **IP Privacy**: Only public IPs are sent to external services
- **Data Minimization**: Only necessary location data is stored
- **Fallback**: System continues to work even if geolocation fails

## Dependencies

The geolocation functionality requires:
- `httpx==0.25.2`: For HTTP requests to geolocation API
- `asyncio`: For asynchronous operations

## Troubleshooting

### Common Issues

1. **"Unknown Location" appearing**:
   - Check internet connectivity
   - Verify ip-api.com is accessible
   - Check if IP is in private range

2. **Slow response times**:
   - Geolocation API may be slow
   - Consider implementing caching
   - Check network connectivity

3. **All locations showing as India**:
   - You're likely testing with localhost/private IPs
   - This is expected behavior

### Debug Mode

To enable debug logging, add to your environment:
```bash
export PYTHONPATH="${PYTHONPATH}:./PedolOne/backend"
```

## Future Enhancements

Potential improvements:
1. **Caching**: Implement Redis/MongoDB caching for IP locations
2. **Multiple Providers**: Add fallback geolocation services
3. **Geofencing**: Add location-based access controls
4. **Analytics**: Location-based usage analytics
5. **Custom Regions**: Allow custom region definitions

## API Response Examples

### Successful Geolocation Response
```json
{
  "ip_address": "8.8.8.8",
  "location": "Mountain View, California, United States",
  "details": {
    "country": "United States",
    "countryCode": "US",
    "region": "CA",
    "regionName": "California",
    "city": "Mountain View",
    "zip": "94043",
    "lat": 37.4056,
    "lon": -122.0775,
    "timezone": "America/Los_Angeles",
    "isp": "Google LLC",
    "org": "Google Public DNS",
    "as": "AS15169 Google LLC"
  }
}
```

### Localhost Response
```json
{
  "ip_address": "127.0.0.1",
  "location": "New Delhi, Delhi, India",
  "details": {
    "country": "India",
    "countryCode": "IN",
    "region": "Delhi",
    "regionName": "Delhi",
    "city": "New Delhi",
    "lat": 28.6139,
    "lon": 77.2090,
    "timezone": "Asia/Kolkata",
    "isp": "Local Network",
    "org": "Local Development"
  }
}
``` 