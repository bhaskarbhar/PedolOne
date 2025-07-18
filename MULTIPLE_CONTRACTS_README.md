# Multiple Contracts Between Organizations

This document describes the enhanced inter-organization contract system that now supports multiple contracts between two organizations for different purposes and resource types.

## Overview

The system has been upgraded to allow organizations to establish multiple contracts with each other, each serving different purposes:

- **Data Sharing Contracts**: For sharing PII and sensitive data
- **File Sharing Contracts**: For secure document exchange
- **Service Integration Contracts**: For API and service access
- **Compliance Reporting Contracts**: For regulatory compliance

## Key Features

### 🔄 Multiple Contract Support
- **Multiple Active Contracts**: Organizations can have multiple active contracts simultaneously
- **Contract Types**: Different contract types for different purposes
- **Resource-Specific Permissions**: Each contract defines specific resources and purposes
- **Contract Naming**: Human-readable contract names for easy identification
- **Version Control**: Contract versioning for updates and renewals

### 📋 Contract Types

#### 1. Data Sharing (`data_sharing`)
- **Purpose**: Sharing PII and sensitive data between organizations
- **Resources**: aadhaar, pan, account, ifsc, creditcard, debitcard, gst, itform16, upi, passport, drivinglicense
- **Default Retention**: 30 days
- **Use Cases**: KYC verification, identity validation, account opening

#### 2. File Sharing (`file_sharing`)
- **Purpose**: Secure document exchange with read-only access
- **Resources**: excel_files, pdf_files, document_files, image_files
- **Default Retention**: 90 days
- **Use Cases**: Document sharing, compliance reporting, secure file viewing

#### 3. Service Integration (`service_integration`)
- **Purpose**: API integration and service access
- **Resources**: api_access, service_endpoints, webhook_access
- **Default Retention**: 365 days
- **Use Cases**: Real-time data exchange, API access, service integration

#### 4. Compliance Reporting (`compliance_reporting`)
- **Purpose**: Regulatory compliance and reporting
- **Resources**: compliance_data, audit_logs, regulatory_reports
- **Default Retention**: 7 years
- **Use Cases**: Regulatory reporting, audit trails, compliance monitoring

## API Endpoints

### Contract Management

#### Create Contract
```bash
POST /inter-org-contracts/create
{
  "target_org_id": "org_123",
  "contract_name": "Bank-Insurance Data Sharing 2024",
  "contract_type": "data_sharing",
  "contract_description": "Comprehensive data sharing agreement",
  "resources_allowed": [
    {
      "resource_name": "aadhaar",
      "purpose": ["KYC verification", "Identity validation"],
      "retention_window": "30 days",
      "created_at": "2024-01-15T10:00:00Z",
      "ends_at": "2025-01-15T10:00:00Z"
    }
  ],
  "approval_message": "Requesting data sharing agreement"
}
```

#### Get Contract Types
```bash
GET /inter-org-contracts/contract-types
```

#### Get Contracts by Type
```bash
GET /inter-org-contracts/org/{org_id}/contracts-by-type?contract_type=data_sharing
```

#### Get Contract Statistics
```bash
GET /inter-org-contracts/org/{org_id}/contract-statistics
```

#### Get Partner Organizations
```bash
GET /inter-org-contracts/org/{org_id}/partner-organizations
```

### Data Sharing with Multiple Contracts

#### Share Data (Automatically selects appropriate contract)
```bash
POST /organization/{org_id}/share-data
{
  "target_org_id": "org_456",
  "user_id": 123,
  "resources": ["aadhaar", "pan"],
  "purpose": ["KYC verification"]
}
```

#### Send Data Request (Works with multiple contracts)
```bash
POST /data-requests/send-request
{
  "target_user_email": "user@example.com",
  "requested_resources": ["aadhaar", "pan"],
  "purpose": ["KYC verification"],
  "retention_window": "30 days",
  "request_message": "Requesting data for KYC verification"
}
```

## Database Schema

### Enhanced InterOrgContract Collection
```javascript
{
  "_id": ObjectId,
  "contract_id": "uuid-string",
  "contract_name": "Bank-Insurance Data Sharing 2024",
  "contract_type": "data_sharing",
  "contract_description": "Comprehensive data sharing agreement",
  "source_org_id": "org_123",
  "source_org_name": "BankABC",
  "target_org_id": "org_456",
  "target_org_name": "InsuranceABC",
  "created_at": ISODate("2024-01-15T10:00:00Z"),
  "ends_at": ISODate("2025-01-15T10:00:00Z"),
  "resources_allowed": [
    {
      "resource_name": "aadhaar",
      "purpose": ["KYC verification", "Identity validation"],
      "retention_window": "30 days",
      "created_at": ISODate("2024-01-15T10:00:00Z"),
      "ends_at": ISODate("2025-01-15T10:00:00Z"),
      "signature": "sha256-hash"
    }
  ],
  "status": "active",
  "approval_status": "approved",
  "version": "1.0",
  "parent_contract_id": null
}
```

## Usage Examples

### Scenario 1: Multiple Contract Types Between Organizations

BankABC and InsuranceABC establish three different contracts:

1. **Data Sharing Contract**: For KYC and identity verification
2. **File Sharing Contract**: For document exchange
3. **Service Integration Contract**: For API access

```python
# Create Data Sharing Contract
data_contract = {
    "target_org_id": "insurance_org_id",
    "contract_name": "Bank-Insurance Data Sharing 2024",
    "contract_type": "data_sharing",
    "resources_allowed": [
        {"resource_name": "aadhaar", "purpose": ["KYC verification"]},
        {"resource_name": "pan", "purpose": ["Identity validation"]}
    ]
}

# Create File Sharing Contract
file_contract = {
    "target_org_id": "insurance_org_id",
    "contract_name": "Bank-Insurance File Sharing",
    "contract_type": "file_sharing",
    "resources_allowed": [
        {"resource_name": "excel_files", "purpose": ["Document sharing"]},
        {"resource_name": "pdf_files", "purpose": ["Compliance reporting"]}
    ]
}

# Create Service Integration Contract
service_contract = {
    "target_org_id": "insurance_org_id",
    "contract_name": "Bank-Insurance API Integration",
    "contract_type": "service_integration",
    "resources_allowed": [
        {"resource_name": "api_access", "purpose": ["API integration"]}
    ]
}
```

### Scenario 2: Data Sharing with Contract Selection

When sharing data, the system automatically selects the appropriate contract:

```python
# Share data - system automatically selects data_sharing contract
share_request = {
    "target_org_id": "insurance_org_id",
    "user_id": 123,
    "resources": ["aadhaar", "pan"],
    "purpose": ["KYC verification"]
}

# Response includes which contract was used
response = {
    "message": "Data shared successfully with InsuranceABC using contract 'Bank-Insurance Data Sharing 2024'",
    "policies_created": 2,
    "contract_used": {
        "contract_id": "data_contract_id",
        "contract_name": "Bank-Insurance Data Sharing 2024",
        "contract_type": "data_sharing"
    }
}
```

### Scenario 3: Contract Statistics and Monitoring

```python
# Get comprehensive contract statistics
stats = {
    "total_contracts": 15,
    "active_contracts": 12,
    "pending_contracts": 2,
    "expired_contracts": 1,
    "partner_organizations": 8,
    "contracts_by_type": {
        "data_sharing": {"total": 8, "active": 7, "pending": 1, "expired": 0},
        "file_sharing": {"total": 4, "active": 3, "pending": 1, "expired": 0},
        "service_integration": {"total": 3, "active": 2, "pending": 0, "expired": 1}
    }
}
```

## Benefits

### 🎯 **Flexibility**
- Organizations can establish different contracts for different purposes
- Each contract can have specific resource and purpose restrictions
- Support for contract versioning and updates

### 🔒 **Security**
- Granular permission control per contract
- Resource-specific access controls
- Comprehensive audit logging with contract identification

### 📊 **Management**
- Contract statistics and monitoring
- Partner organization overview
- Contract type filtering and organization

### 🔄 **Scalability**
- Support for unlimited contracts between organizations
- Easy contract management and renewal
- Backward compatibility with existing contracts

## Migration from Single Contract System

The system maintains backward compatibility with existing single-contract setups:

1. **Existing Contracts**: Continue to work as before
2. **Legacy Support**: Old contract structures are automatically handled
3. **Gradual Migration**: Organizations can gradually adopt multiple contracts
4. **Default Values**: Missing fields are populated with sensible defaults

## Testing

Run the test script to verify multiple contracts functionality:

```bash
python test_multiple_contracts.py
```

This will:
1. Create multiple contract types between organizations
2. Test contract statistics and filtering
3. Verify data sharing with contract selection
4. Demonstrate partner organization management

## Future Enhancements

1. **Contract Templates**: Pre-defined contract templates for common use cases
2. **Contract Negotiation**: Multi-step contract approval workflow
3. **Contract Analytics**: Advanced analytics and reporting
4. **Automated Renewal**: Automatic contract renewal notifications
5. **Contract Comparison**: Side-by-side contract comparison tools
6. **Bulk Operations**: Manage multiple contracts simultaneously

## Support

For issues or questions regarding multiple contracts:
1. Check the contract creation logs
2. Verify contract approval status
3. Ensure resources and purposes match contract definitions
4. Test with the provided test script
5. Review contract statistics for insights 