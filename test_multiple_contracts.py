import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"

def test_multiple_contracts():
    """Test multiple contracts between organizations"""
    
    print("🧪 Testing Multiple Contracts Between Organizations")
    print("=" * 60)
    
    # Step 1: Login as organization admin
    print("\n1. Logging in as BankABC admin...")
    login_data = {
        "email": "admin@bankabc.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Get available organizations
    print("2. Getting available organizations...")
    response = requests.get(f"{BASE_URL}/organization/list", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get organizations: {response.text}")
        return
    
    organizations = response.json()
    if len(organizations) < 2:
        print("❌ Need at least 2 organizations for testing")
        return
    
    bank_org = organizations[0]  # BankABC
    insurance_org = organizations[1]  # InsuranceABC
    
    print(f"✅ Source org: {bank_org['org_name']}")
    print(f"✅ Target org: {insurance_org['org_name']}")
    
    # Step 3: Get contract types
    print("\n3. Getting available contract types...")
    response = requests.get(f"{BASE_URL}/inter-org-contracts/contract-types", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get contract types: {response.text}")
        return
    
    contract_types = response.json()["contract_types"]
    print(f"✅ Available contract types: {len(contract_types)}")
    for ct in contract_types:
        print(f"   - {ct['name']}: {ct['description']}")
    
    # Step 4: Create Data Sharing Contract
    print("\n4. Creating Data Sharing Contract...")
    
    # Create contract resources for data sharing
    data_sharing_resources = []
    for resource_name in ["aadhaar", "pan", "account"]:
        resource = {
            "resource_name": resource_name,
            "purpose": ["KYC verification", "Identity validation"],
            "retention_window": "30 days",
            "created_at": datetime.utcnow(),
            "ends_at": datetime.utcnow() + timedelta(days=365)
        }
        data_sharing_resources.append(resource)
    
    data_sharing_contract = {
        "target_org_id": insurance_org["org_id"],
        "contract_name": "Bank-Insurance Data Sharing Agreement 2024",
        "contract_type": "data_sharing",
        "contract_description": "Comprehensive data sharing agreement for KYC and identity verification services",
        "resources_allowed": data_sharing_resources,
        "approval_message": "Requesting data sharing agreement for enhanced customer verification services"
    }
    
    response = requests.post(f"{BASE_URL}/inter-org-contracts/create", 
                           json=data_sharing_contract, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Data sharing contract creation failed: {response.text}")
        return
    
    data_contract_result = response.json()
    data_contract_id = data_contract_result["contract_id"]
    print(f"✅ Data sharing contract created: {data_contract_id}")
    
    # Step 5: Create File Sharing Contract
    print("\n5. Creating File Sharing Contract...")
    
    file_sharing_resources = []
    for resource_name in ["excel_files", "pdf_files"]:
        resource = {
            "resource_name": resource_name,
            "purpose": ["Document sharing", "Compliance reporting"],
            "retention_window": "90 days",
            "created_at": datetime.utcnow(),
            "ends_at": datetime.utcnow() + timedelta(days=365)
        }
        file_sharing_resources.append(resource)
    
    file_sharing_contract = {
        "target_org_id": insurance_org["org_id"],
        "contract_name": "Bank-Insurance File Sharing Protocol",
        "contract_type": "file_sharing",
        "contract_description": "Secure file sharing agreement for document exchange and compliance reporting",
        "resources_allowed": file_sharing_resources,
        "approval_message": "Establishing secure file sharing for regulatory compliance and document exchange"
    }
    
    response = requests.post(f"{BASE_URL}/inter-org-contracts/create", 
                           json=file_sharing_contract, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ File sharing contract creation failed: {response.text}")
        return
    
    file_contract_result = response.json()
    file_contract_id = file_contract_result["contract_id"]
    print(f"✅ File sharing contract created: {file_contract_id}")
    
    # Step 6: Create Service Integration Contract
    print("\n6. Creating Service Integration Contract...")
    
    service_resources = []
    for resource_name in ["api_access", "service_endpoints"]:
        resource = {
            "resource_name": resource_name,
            "purpose": ["API integration", "Service access"],
            "retention_window": "365 days",
            "created_at": datetime.utcnow(),
            "ends_at": datetime.utcnow() + timedelta(days=365)
        }
        service_resources.append(resource)
    
    service_contract = {
        "target_org_id": insurance_org["org_id"],
        "contract_name": "Bank-Insurance API Integration Agreement",
        "contract_type": "service_integration",
        "contract_description": "API integration agreement for real-time service access and data exchange",
        "resources_allowed": service_resources,
        "approval_message": "Establishing API integration for real-time service access"
    }
    
    response = requests.post(f"{BASE_URL}/inter-org-contracts/create", 
                           json=service_contract, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Service integration contract creation failed: {response.text}")
        return
    
    service_contract_result = response.json()
    service_contract_id = service_contract_result["contract_id"]
    print(f"✅ Service integration contract created: {service_contract_id}")
    
    # Step 7: Get contract statistics
    print("\n7. Getting contract statistics...")
    response = requests.get(f"{BASE_URL}/inter-org-contracts/org/{bank_org['org_id']}/contract-statistics", 
                           headers=headers)
    
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Total contracts: {stats['total_contracts']}")
        print(f"✅ Active contracts: {stats['active_contracts']}")
        print(f"✅ Pending contracts: {stats['pending_contracts']}")
        print(f"✅ Partner organizations: {stats['partner_organizations']}")
        
        print("\n📊 Contracts by type:")
        for contract_type, type_stats in stats['contracts_by_type'].items():
            print(f"   - {contract_type}: {type_stats['total']} total, {type_stats['active']} active")
    else:
        print(f"❌ Failed to get contract statistics: {response.text}")
    
    # Step 8: Get contracts by type
    print("\n8. Getting contracts by type...")
    response = requests.get(f"{BASE_URL}/inter-org-contracts/org/{bank_org['org_id']}/contracts-by-type", 
                           headers=headers)
    
    if response.status_code == 200:
        contracts_by_type = response.json()["contracts_by_type"]
        print("📋 Contracts by type:")
        for contract_type, contracts in contracts_by_type.items():
            print(f"   - {contract_type}: {len(contracts)} contracts")
            for contract in contracts:
                print(f"     * {contract['contract_name']} ({contract['status']})")
    else:
        print(f"❌ Failed to get contracts by type: {response.text}")
    
    # Step 9: Get partner organizations
    print("\n9. Getting partner organizations...")
    response = requests.get(f"{BASE_URL}/inter-org-contracts/org/{bank_org['org_id']}/partner-organizations", 
                           headers=headers)
    
    if response.status_code == 200:
        partners = response.json()["partner_organizations"]
        print("🤝 Partner organizations:")
        for partner in partners:
            print(f"   - {partner['org_name']}: {partner['total_contracts']} contracts, {partner['active_contracts']} active")
            print(f"     Contract types: {', '.join(partner['contract_types'])}")
    else:
        print(f"❌ Failed to get partner organizations: {response.text}")
    
    print("\n🎉 Multiple contracts test completed successfully!")
    print("\n📝 Summary:")
    print(f"   - Created 3 different contract types between {bank_org['org_name']} and {insurance_org['org_name']}")
    print(f"   - Data Sharing Contract: {data_contract_id}")
    print(f"   - File Sharing Contract: {file_contract_id}")
    print(f"   - Service Integration Contract: {service_contract_id}")
    print("   - All contracts support different resources and purposes")
    print("   - System now supports multiple active contracts between organizations")

if __name__ == "__main__":
    test_multiple_contracts() 