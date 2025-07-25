# PedolOne Alerts System

## Overview

The PedolOne Alerts System provides comprehensive security monitoring and suspicious activity detection for organizations. It automatically detects and alerts on various security threats and unusual patterns in real-time.

## Features

### 🔴 Alert Types

1. **Failed Login Attempts**
   - Detects multiple failed login attempts from the same user
   - Threshold: 3+ failed attempts within 2 minutes
   - Severity: High

2. **Multiple Data Requests**
   - Detects rapid-fire data requests from the same user
   - Threshold: 5+ requests within 5 minutes
   - Severity: Medium

3. **Foreign Access Attempts**
   - Detects access attempts from outside India
   - Uses IP geolocation to determine country
   - Excludes local/private IP addresses (127.x.x.x, 192.168.x.x, 10.x.x.x, etc.)
   - Severity: High

4. **Suspicious Activity**
   - General suspicious activity detection
   - Severity: Variable

5. **Data Breach**
   - Potential data breach indicators
   - Severity: Critical

6. **Unusual Patterns**
   - Unusual access patterns and behaviors
   - Severity: Medium

### 📊 Alert Management

- **Real-time Detection**: Alerts are generated immediately when suspicious activity is detected
- **Geolocation Tracking**: Each alert includes IP address and location information
- **Severity Levels**: Low, Medium, High, Critical
- **Read/Unread Status**: Track which alerts have been reviewed
- **Bulk Actions**: Mark all alerts as read with one click
- **Filtering**: Filter alerts by type, severity, and status
- **Pagination**: Handle large numbers of alerts efficiently
- **Login Popup**: Admin users get immediate notification of unread alerts when they log in
- **IP Blocking**: Block suspicious IP addresses directly from alerts
- **Mark as Read**: Individual alert marking with real-time status updates
- **Delete Alerts**: Remove alerts permanently with confirmation dialog

### 🔍 Alert Details

Each alert includes:
- Alert type and display name
- Severity level with color coding
- Detailed description
- User ID (if applicable)
- IP address
- Geographic location (city, country, region)
- Timestamp
- Read/unread status
- Additional metadata

## API Endpoints

### Alerts Management

```
GET /alerts/org/{org_id} - Get organization alerts with pagination
GET /alerts/org/{org_id}/unread-count - Get count of unread alerts
PUT /alerts/{alert_id}/mark-read - Mark specific alert as read
DELETE /alerts/{alert_id} - Delete specific alert
PUT /alerts/org/{org_id}/mark-all-read - Mark all alerts as read
GET /alerts/types - Get all available alert types
```

### Suspicious Activity Detection

```
POST /alerts/check-suspicious-activity - Check for suspicious activity
```

### IP Blocking Management

```
POST /alerts/block-ip - Block an IP address
GET /alerts/blocked-ips - Get list of blocked IP addresses
DELETE /alerts/unblock-ip/{ip_address} - Unblock an IP address
```

### Query Parameters

- `limit`: Number of alerts to return (default: 50)
- `offset`: Number of alerts to skip (default: 0)
- `alert_type`: Filter by alert type
- `severity`: Filter by severity level
- `is_read`: Filter by read status (true/false)
- `start_date`: Filter by start date (YYYY-MM-DD)
- `end_date`: Filter by end date (YYYY-MM-DD)

## Frontend Integration

### Alerts Tab

The alerts system is integrated into the Organization Dashboard with a dedicated "Alerts" tab that includes:

1. **Header Section**
   - Alert count badge showing unread alerts
   - Security status indicator

2. **Action Buttons**
   - "Mark All as Read" - Bulk action for unread alerts

3. **Blocked IPs Section**
   - Display all currently blocked IP addresses
   - Unblock IP addresses with one click

3. **Filters**
   - Alert Type dropdown
   - Severity dropdown
   - Status dropdown (All/Unread/Read)

4. **Alerts Table**
   - Type with severity icons
   - Severity badges with color coding
   - Description
   - Location information
   - IP address
   - Creation timestamp
   - Status badges
   - Action buttons (Mark Read)

5. **Pagination**
   - Previous/Next buttons
   - Results counter
   - Configurable page size

6. **Login Alert Popup**
   - Automatic popup when admin logs in with unread alerts
   - Shows recent alerts with details
   - Direct navigation to alerts section
   - Dismiss option

### Visual Design

- **Color Coding**: Severity levels are color-coded for quick identification
  - Critical: Red (#dc2626)
  - High: Orange (#ea580c)
  - Medium: Yellow (#d97706)
  - Low: Green (#059669)

- **Icons**: Each alert type has a distinctive icon
- **Responsive Design**: Works on all screen sizes
- **Real-time Updates**: Alerts update automatically when new ones are created

## Database Schema

### Alerts Collection

```javascript
{
  _id: ObjectId,
  org_id: String,           // Organization ID
  alert_type: String,       // Type of alert
  severity: String,         // low, medium, high, critical
  description: String,      // Alert description
  user_id: Number,          // User ID (optional)
  ip_address: String,       // IP address
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  additional_data: Object,  // Additional metadata
  is_read: Boolean,         // Read status
  created_at: Date,         // Creation timestamp
  resolved_at: Date,        // Resolution timestamp (optional)
  resolved_by: Number       // User who resolved (optional)
}
```

## Security Features

### Access Control
- Only organization members can view their organization's alerts
- Strict authentication required for all endpoints
- IP-based access logging

### Data Protection
- Sensitive information is logged securely
- IP addresses are anonymized where appropriate
- Location data is obtained from trusted geolocation services

### Real-time Monitoring
- Continuous monitoring of user activities
- Automatic alert generation
- Immediate notification system

## Usage Examples

### Manual Suspicious Activity Check

```javascript
// Frontend
const handleCheckSuspiciousActivity = async () => {
  try {
    const api = createAxiosInstance();
    await api.post('/alerts/check-suspicious-activity');
    
    // Refresh alerts after checking
    fetchAlerts(true);
    fetchUnreadAlertsCount();
  } catch (err) {
    console.error('Error checking suspicious activity:', err);
  }
};
```

### Fetching Alerts with Filters

```javascript
// Frontend
const fetchAlerts = async (resetPagination = false) => {
  const params = new URLSearchParams({
    limit: '20',
    offset: resetPagination ? '0' : '20',
    alert_type: 'failed_login',
    severity: 'high',
    is_read: 'false'
  });
  
  const response = await api.get(`/alerts/org/${orgId}?${params}`);
  setAlerts(response.data.alerts);
};
```

### Marking Alerts as Read

```javascript
// Frontend
const handleMarkAlertAsRead = async (alertId) => {
  try {
    const api = createAxiosInstance();
    await api.put(`/alerts/${alertId}/mark-read`);
    
    // Update local state
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, is_read: true }
        : alert
    ));
  } catch (err) {
    console.error('Error marking alert as read:', err);
  }
};
```

## Testing

### Demo Script

Use the provided `test_alerts.py` script to demonstrate the alerts system:

```bash
python test_alerts.py
```

This script will:
1. Authenticate with the system
2. Simulate failed login attempts
3. Create multiple data requests
4. Simulate foreign access
5. View generated alerts
6. Mark alerts as read

### Manual Testing

1. **Failed Login Testing**:
   - Attempt to login with wrong credentials multiple times
   - Check if alerts are generated after 3+ attempts

2. **Multiple Requests Testing**:
   - Create multiple data requests in quick succession
   - Verify alerts are generated after 5+ requests

3. **Foreign Access Testing**:
   - Access the system from a non-Indian IP address
   - Check if foreign access alerts are generated

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing configuration.

### Thresholds

Alert thresholds can be modified in the alerts router:

- Failed login attempts: 3 attempts in 10 minutes
- Multiple requests: 5 requests in 5 minutes
- Foreign access: Any access from outside India

### Geolocation Service

The system uses `ip-api.com` for geolocation. This can be changed to other services by modifying the `get_location_from_ip` function.

## Monitoring and Maintenance

### Log Monitoring
- Monitor alert generation logs
- Track false positive rates
- Adjust thresholds as needed

### Performance
- Alerts are generated asynchronously
- Database queries are optimized with indexes
- Pagination prevents memory issues with large datasets

### Data Retention
- Alerts are stored indefinitely (can be modified)
- Consider implementing data retention policies
- Archive old alerts for compliance

## Future Enhancements

1. **Email Notifications**: Send email alerts to administrators
2. **SMS Alerts**: Critical alerts via SMS
3. **Webhook Integration**: Send alerts to external systems
4. **Machine Learning**: Advanced pattern detection
5. **Custom Thresholds**: Per-organization alert thresholds
6. **Alert Escalation**: Automatic escalation for critical alerts
7. **Integration with SIEM**: Export alerts to security information systems

## Troubleshooting

### Common Issues

1. **No Alerts Generated**:
   - Check if the alerts router is properly included in main.py
   - Verify database connection
   - Check authentication tokens

2. **Geolocation Not Working**:
   - Verify internet connectivity
   - Check ip-api.com service status
   - Review IP address format

3. **Frontend Not Loading**:
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Check authentication state

### Debug Mode

Enable debug logging by adding console.log statements in the alerts functions to track alert generation and processing.

## Support

For issues or questions about the alerts system, please refer to the main project documentation or contact the development team. 