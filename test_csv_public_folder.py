#!/usr/bin/env python3
"""
Test script to verify CSV functionality with public folder storage
"""

import os
import csv
import io
import uuid
from datetime import datetime

def test_csv_public_folder():
    """Test CSV creation and storage in public folder"""
    
    # Create test data
    csv_data = [
        {
            "email": "user1@example.com",
            "full_name": "John Doe",
            "resource_type": "email",
            "purpose": "Marketing",
            "value": "john.doe@example.com",
            "request_id": "req_123",
            "requested_at": "2024-01-01 10:00:00",
            "expires_at": "2024-01-31 10:00:00"
        },
        {
            "email": "user2@example.com", 
            "full_name": "Jane Smith",
            "resource_type": "phone",
            "purpose": "Customer Support",
            "value": "+1234567890",
            "request_id": "req_124",
            "requested_at": "2024-01-01 11:00:00",
            "expires_at": "2024-01-31 11:00:00"
        }
    ]
    
    # Generate unique file ID and filename
    file_id = str(uuid.uuid4())
    bulk_request_id = "test_bulk_123"
    filename = f"bulk_data_export_{bulk_request_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    file_path = f"public/csv_files/{filename}"
    
    print(f"📁 Creating CSV file: {file_path}")
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ["email", "full_name", "resource_type", "purpose", "value", "request_id", "requested_at", "expires_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(csv_data)
    
    csv_content = output.getvalue()
    output.close()
    
    print("✅ CSV content created successfully:")
    print(csv_content)
    
    # Save CSV file to public folder
    os.makedirs("public/csv_files", exist_ok=True)
    with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
        csvfile.write(csv_content)
    
    print(f"✅ CSV file saved to: {file_path}")
    
    # Verify file exists
    if os.path.exists(file_path):
        print("✅ File exists on disk")
        
        # Read and verify content
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            read_content = csvfile.read()
        
        if read_content == csv_content:
            print("✅ File content matches original")
        else:
            print("❌ File content does not match")
            return False
            
        # Test CSV parsing
        csv_reader = csv.DictReader(io.StringIO(read_content))
        rows = list(csv_reader)
        
        print(f"✅ CSV parsed successfully with {len(rows)} rows:")
        for i, row in enumerate(rows):
            print(f"Row {i+1}: {row}")
        
        # Clean up test file
        os.remove(file_path)
        print(f"✅ Test file cleaned up: {file_path}")
        
    else:
        print(f"❌ File not found: {file_path}")
        return False
    
    return True

def test_csv_viewer_html():
    """Test CSV viewer HTML generation"""
    
    # Sample CSV content
    csv_content = """email,full_name,resource_type,purpose,value,request_id,requested_at,expires_at
user1@example.com,John Doe,email,Marketing,john.doe@example.com,req_123,2024-01-01 10:00:00,2024-01-31 10:00:00
user2@example.com,Jane Smith,phone,Customer Support,+1234567890,req_124,2024-01-01 11:00:00,2024-01-31 11:00:00"""
    
    # Parse CSV content
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(csv_reader)
    
    if not rows:
        print("❌ No rows found in CSV")
        return False
    
    # Convert to HTML table
    fieldnames = rows[0].keys()
    html_content = "<table class='table table-striped table-bordered' id='secure-csv-table'>"
    
    # Add header row
    html_content += "<thead><tr>"
    for field in fieldnames:
        html_content += f"<th>{field}</th>"
    html_content += "</tr></thead>"
    
    # Add data rows
    html_content += "<tbody>"
    for row in rows:
        html_content += "<tr>"
        for field in fieldnames:
            html_content += f"<td>{row.get(field, '')}</td>"
        html_content += "</tr>"
    html_content += "</tbody></table>"
    
    print("✅ HTML table generated successfully:")
    print(html_content[:200] + "..." if len(html_content) > 200 else html_content)
    
    return True

def main():
    """Run all tests"""
    print("🧪 Testing CSV Functionality with Public Folder Storage\n")
    
    try:
        # Test CSV creation and storage
        print("1. Testing CSV creation and storage in public folder...")
        if not test_csv_public_folder():
            print("❌ CSV public folder test failed")
            return False
        
        print("\n2. Testing CSV viewer HTML generation...")
        if not test_csv_viewer_html():
            print("❌ CSV viewer HTML test failed")
            return False
        
        print("\n✅ All tests passed! CSV functionality with public folder storage is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    main() 