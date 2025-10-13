"""
Sprint 2 Integration Tests
Tests complete prescription workflow with new services
"""

import pytest
import requests
import time

API_GATEWAY_URL = "http://localhost:8000"

class TestSprint2Flow:
    """Test Sprint 2 prescription workflow"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        # Register user
        email = f"doctor{int(time.time())}@test.com"
        
        requests.post(
            f"{API_GATEWAY_URL}/api/auth/register",
            json={
                "email": email,
                "password": "Test123!",
                "first_name": "Dr",
                "last_name": "Smith",
                "role": "doctor"
            }
        )
        
        # Login
        response = requests.post(
            f"{API_GATEWAY_URL}/api/auth/login",
            json={
                "email": email,
                "password": "Test123!"
            }
        )
        
        return response.json()['access_token']
    
    def test_complete_prescription_workflow(self, auth_token):
        """
        Test complete workflow:
        1. Search for medicine
        2. Create prescription
        3. Submit for AI validation
        4. Check prescription status
        """
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Step 1: Search for medicine
        print("\n1. Searching for medicine...")
        medicine_response = requests.get(
            f"{API_GATEWAY_URL}/api/medicines",
            params={"query": "Paracetamol"},
            headers=headers
        )
        
        assert medicine_response.status_code == 200
        medicines = medicine_response.json()['data']
        assert len(medicines) > 0
        
        medicine = medicines[0]
        print(f"   Found: {medicine['trade_name']} ({medicine['generic_name']})")
        
        # Step 2: Create prescription
        print("\n2. Creating prescription...")
        prescription_data = {
            "doctor": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Dr. Ahmed Hassan",
                "license": "123456",
                "specialty": "General Practice"
            },
            "patient": {
                "id": "660e8400-e29b-41d4-a716-446655440000",
                "name": "Mohamed Ali",
                "age": 35,
                "gender": "male"
            },
            "diagnosis": "Fever and headache",
            "clinicalNotes": "Patient presents with fever for 2 days",
            "medications": [
                {
                    "medicineId": medicine['id'],
                    "medicineName": medicine['trade_name'],
                    "medicineGenericName": medicine['generic_name'],
                    "medicineStrength": medicine['strength'],
                    "medicineForm": medicine['dosage_form'],
                    "dosage": "500mg",
                    "frequency": "3 times daily",
                    "duration": "5 days",
                    "quantity": 15,
                    "refills": 0,
                    "instructions": "Take with food",
                    "substitutionAllowed": True
                }
            ]
        }
        
        prescription_response = requests.post(
            f"{API_GATEWAY_URL}/api/prescriptions",
            json=prescription_data,
            headers=headers
        )
        
        assert prescription_response.status_code == 201
        prescription = prescription_response.json()['data']
        prescription_id = prescription['id']
        
        print(f"   Created: {prescription['prescription_number']}")
        print(f"   Status: {prescription['status']}")
        
        # Step 3: Submit for AI validation
        print("\n3. Submitting for AI validation...")
        validation_response = requests.post(
            f"{API_GATEWAY_URL}/api/prescriptions/{prescription_id}/submit",
            headers=headers
        )
        
        assert validation_response.status_code == 200
        validation_result = validation_response.json()['data']
        
        print(f"   Validation Status: {validation_result['prescription']['ai_validation_status']}")
        print(f"   Confidence Score: {validation_result['prescription']['ai_validation_score']}")
        
        # Step 4: Get prescription with history
        print("\n4. Retrieving prescription details...")
        get_response = requests.get(
            f"{API_GATEWAY_URL}/api/prescriptions/{prescription_id}",
            headers=headers
        )
        
        assert get_response.status_code == 200
        final_prescription = get_response.json()['data']
        
        print(f"   Prescription Number: {final_prescription['prescription_number']}")
        print(f"   Status: {final_prescription['status']}")
        print(f"   Items: {len(final_prescription['items'])} medication(s)")
        
        # Step 5: Get prescription history
        print("\n5. Checking prescription history...")
        history_response = requests.get(
            f"{API_GATEWAY_URL}/api/prescriptions/{prescription_id}/history",
            headers=headers
        )
        
        assert history_response.status_code == 200
        history = history_response.json()['data']
        
        print(f"   History Entries: {len(history)}")
        for entry in history:
            print(f"   - {entry['action']} at {entry['timestamp']}")
        
        print("\n✅ Complete workflow test PASSED")
    
    def test_medicine_search(self, auth_token):
        """Test medicine search functionality"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Search by trade name
        response = requests.get(
            f"{API_GATEWAY_URL}/api/medicines",
            params={"query": "Panadol"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data
        assert len(data['data']) > 0
        
        # Search by category
        response = requests.get(
            f"{API_GATEWAY_URL}/api/medicines",
            params={"category": "Analgesic"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data
    
    def test_drug_interactions(self, auth_token):
        """Test drug interaction checking"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Get two medicines
        response = requests.get(
            f"{API_GATEWAY_URL}/api/medicines",
            params={"limit": 2},
            headers=headers
        )
        
        medicines = response.json()['data']
        
        if len(medicines) >= 2:
            # Check interactions
            interaction_response = requests.post(
                f"{API_GATEWAY_URL}/api/medicines/check-interactions",
                json={
                    "medicineIds": [medicines[0]['id'], medicines[1]['id']]
                },
                headers=headers
            )
            
            assert interaction_response.status_code == 200
            data = interaction_response.json()
            assert 'data' in data
            assert 'hasInteractions' in data['data']

if __name__ == "__main__":
    # Run tests
    test = TestSprint2Flow()
    token = test.auth_token()
    test.test_complete_prescription_workflow(token)
    test.test_medicine_search(token)
    test.test_drug_interactions(token)