# Comprehensive Contract Management System

This document describes the enhanced contract management system that allows organizations to fully manage their inter-organization contracts with comprehensive editing, deletion, version control, and approval workflows.

## 🚀 New Features

### 1. **Contract Name & Description Management**
- **Custom Contract Names**: Set meaningful names for contracts instead of auto-generated IDs
- **Contract Descriptions**: Add detailed descriptions explaining the purpose and scope
- **Contract Types**: Choose from predefined contract types (data_sharing, file_sharing, service_integration, compliance_reporting)

### 2. **Contract Editing with Approval Workflow**
- **Edit Active Contracts**: Modify contract name, description, type, and resources
- **Approval Required**: All changes require approval from the other organization
- **Version Control**: Each edit creates a new version with change tracking
- **Change Summary**: Add messages explaining what was changed and why

### 3. **Contract Deletion with Approval Workflow**
- **Request Deletion**: Initiate deletion requests for active contracts
- **Reason Required**: Must provide a reason for deletion
- **Approval Required**: Other organization must approve the deletion
- **Audit Trail**: Complete tracking of deletion requests and responses

### 4. **Version Control System**
- **Automatic Versioning**: Each contract edit creates a new version
- **Version History**: View all versions of a contract with timestamps
- **Change Tracking**: See what changed between versions
- **Approval Status**: Track approval status for each version

### 5. **Comprehensive Audit Logging**
- **Action Tracking**: Log all contract-related actions (create, edit, delete, approve, reject)
- **User Attribution**: Track who performed each action
- **IP Address Logging**: Record IP addresses for security
- **Detailed Information**: Store complete action details for compliance

### 6. **Enhanced UI/UX**
- **Action Buttons**: Edit, Delete, View Versions, View Audit Logs
- **Modal Interfaces**: Clean, intuitive modal dialogs for all actions
- **Status Indicators**: Clear visual indicators for contract and action status
- **Responsive Design**: Works on all screen sizes

## 🔧 Backend Implementation

### New Models Added

```python
# Contract Management Models
class ContractUpdateRequest(BaseModel):
    contract_id: str
    contract_name: Optional[str] = None
    contract_description: Optional[str] = None
    contract_type: Optional[str] = None
    resources_allowed: Optional[List[ContractResource]] = None
    approval_message: Optional[str] = None
    version: Optional[str] = None

class ContractDeletionRequest(BaseModel):
    contract_id: str
    deletion_reason: str
    approval_message: Optional[str] = None

class ContractActionRequest(BaseModel):
    contract_id: str
    action_type: str  # "update", "delete", "renew", "suspend"
    status: str  # "approved", "rejected"
    response_message: Optional[str] = None

class ContractVersion(BaseModel):
    version_id: str
    version_number: str
    contract_id: str
    contract_name: str
    contract_description: Optional[str] = None
    contract_type: str
    resources_allowed: List[ContractResource]
    created_at: datetime
    created_by: int
    parent_version_id: Optional[str] = None
    change_summary: Optional[str] = None
    approval_status: str = "pending"
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class ContractAuditLog(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    contract_id: str
    action_type: str
    action_by: int
    action_by_org_id: str
    action_details: dict
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
```

### New API Endpoints

#### Contract Management
- `PUT /inter-org-contracts/update` - Request contract updates
- `DELETE /inter-org-contracts/delete` - Request contract deletion
- `POST /inter-org-contracts/approve-action` - Approve/reject contract actions
- `GET /inter-org-contracts/contract-types` - Get available contract types

#### Version Control
- `GET /inter-org-contracts/versions/{contract_id}` - Get contract version history

#### Audit Logging
- `GET /inter-org-contracts/audit-logs/{contract_id}` - Get contract audit logs

## 🎯 Frontend Implementation

### New State Management

```javascript
// Contract management state
const [showEditContractModal, setShowEditContractModal] = useState(false);
const [showDeleteContractModal, setShowDeleteContractModal] = useState(false);
const [showContractVersionsModal, setShowContractVersionsModal] = useState(false);
const [showContractAuditModal, setShowContractAuditModal] = useState(false);
const [selectedContract, setSelectedContract] = useState(null);
const [contractVersions, setContractVersions] = useState([]);
const [contractAuditLogs, setContractAuditLogs] = useState([]);
const [contractTypes, setContractTypes] = useState([]);

// Contract edit form state
const [editContractForm, setEditContractForm] = useState({
  contract_name: "",
  contract_description: "",
  contract_type: "data_sharing",
  resources_allowed: [],
  approval_message: ""
});

// Contract deletion form state
const [deleteContractForm, setDeleteContractForm] = useState({
  deletion_reason: "",
  approval_message: ""
});
```

### New Action Buttons

The contracts table now includes comprehensive action buttons:

- **Edit Contract** (📝): Opens edit modal for active contracts
- **Delete Contract** (🗑️): Opens deletion modal for active contracts
- **View Versions** (📋): Shows version history
- **View Audit Logs** (📊): Shows audit trail
- **Approve/Reject Actions** (✅/❌): For pending update/deletion requests

## 🔄 Workflow Examples

### Contract Update Workflow

1. **User clicks "Edit" button** on an active contract
2. **Edit modal opens** with current contract details
3. **User modifies** contract name, description, type, or resources
4. **User submits** update request with optional message
5. **Backend creates** new version and marks as pending
6. **Other organization receives** notification of update request
7. **Other organization can** approve or reject the update
8. **If approved**, contract is updated with new version
9. **If rejected**, update is cancelled with reason

### Contract Deletion Workflow

1. **User clicks "Delete" button** on an active contract
2. **Delete modal opens** requiring deletion reason
3. **User provides** reason and optional message
4. **User submits** deletion request
5. **Backend marks** contract for deletion (pending)
6. **Other organization receives** notification of deletion request
7. **Other organization can** approve or reject the deletion
8. **If approved**, contract is marked as deleted
9. **If rejected**, deletion is cancelled with reason

## 📊 Contract Types

The system supports multiple contract types:

1. **Data Sharing** (`data_sharing`)
   - Purpose: Sharing PII and sensitive data
   - Resources: aadhaar, pan, account, ifsc, creditcard, etc.
   - Default Retention: 30 days

2. **File Sharing** (`file_sharing`)
   - Purpose: Secure document and file exchange
   - Resources: excel, pdf, doc, docx, csv, json, xml
   - Default Retention: 90 days

3. **Service Integration** (`service_integration`)
   - Purpose: API and service access
   - Resources: api_access, webhook, database, storage
   - Default Retention: 1 year

4. **Compliance Reporting** (`compliance_reporting`)
   - Purpose: Regulatory compliance and reporting
   - Resources: audit_logs, compliance_data, regulatory_reports, kyc_data
   - Default Retention: 5 years

## 🔒 Security Features

### Approval Workflows
- **All changes require approval** from the other organization
- **No unilateral modifications** possible
- **Audit trail** for all approvals and rejections

### Access Control
- **Organization-based permissions** - only contract participants can manage
- **User authentication** required for all actions
- **IP address logging** for security monitoring

### Data Integrity
- **Version control** prevents data loss
- **Change tracking** maintains history
- **Rollback capability** through version history

## 📈 Benefits

### For Organizations
- **Complete Control**: Full management of contract lifecycle
- **Transparency**: Clear visibility into all contract changes
- **Compliance**: Comprehensive audit trails for regulatory requirements
- **Flexibility**: Easy contract modifications as business needs change

### For System Administrators
- **Monitoring**: Complete visibility into contract activities
- **Security**: Robust audit logging and access controls
- **Maintenance**: Version control prevents data corruption
- **Scalability**: Designed to handle multiple contracts per organization

## 🚀 Getting Started

### Prerequisites
- Backend server running with updated models and endpoints
- Frontend with new contract management components
- Database with new collections for versions and audit logs

### Usage
1. **Navigate to Contracts tab** in Organization Dashboard
2. **View existing contracts** with enhanced action buttons
3. **Click action buttons** to manage contracts:
   - Edit: Modify contract details
   - Delete: Request contract deletion
   - Versions: View version history
   - Audit: View audit logs
4. **Approve/Reject** pending actions from other organizations

## 🔧 Configuration

### Contract Types
Contract types can be configured in the backend:

```python
contract_types = [
    {
        "type_id": "data_sharing",
        "name": "Data Sharing",
        "description": "Contract for sharing PII and sensitive data",
        "allowed_resources": ["aadhaar", "pan", "account", ...],
        "default_retention": "30 days"
    },
    # Add more types as needed
]
```

### Retention Periods
Available retention periods:
- 7 days, 15 days, 30 days, 60 days, 90 days
- 1 year, 2 years, 5 years

### Audit Logging
Audit logs capture:
- Action type (create, update, delete, approve, reject)
- User ID and organization
- Timestamp and IP address
- Complete action details

## 🐛 Troubleshooting

### Common Issues

1. **Contract not editable**
   - Ensure contract status is "active"
   - Verify user belongs to contract organization

2. **Approval not working**
   - Check if user belongs to the other organization
   - Verify contract has pending actions

3. **Versions not showing**
   - Ensure contract has been edited at least once
   - Check database for version records

4. **Audit logs empty**
   - Verify audit logging is enabled
   - Check database connection

### Error Messages

- **"Only active contracts can be updated"**: Contract must be in active status
- **"No pending action found"**: No update/deletion request to approve
- **"You can only approve actions for contracts involving your organization"**: User not authorized
- **"Contract name is required"**: Must provide contract name when editing

## 📝 Future Enhancements

### Planned Features
- **Bulk Operations**: Edit/delete multiple contracts
- **Template System**: Predefined contract templates
- **Advanced Analytics**: Contract usage and performance metrics
- **Integration APIs**: External system integration
- **Mobile Support**: Mobile-optimized interface

### Performance Optimizations
- **Caching**: Cache frequently accessed contract data
- **Pagination**: Handle large numbers of contracts efficiently
- **Real-time Updates**: WebSocket notifications for contract changes

## 🤝 Contributing

To contribute to the contract management system:

1. **Follow coding standards** and existing patterns
2. **Add comprehensive tests** for new features
3. **Update documentation** for any changes
4. **Test thoroughly** before submitting changes

## 📞 Support

For questions or issues with the contract management system:

1. Check this documentation first
2. Review error logs and audit trails
3. Contact the development team with specific error details
4. Provide contract IDs and user information for debugging

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Compatibility**: Backend v2.0+, Frontend v2.0+ 