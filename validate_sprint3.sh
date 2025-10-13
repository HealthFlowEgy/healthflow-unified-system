#!/bin/bash

echo "=========================================="
echo "Sprint 3 Validation Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((FAILED++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ((FAILED++))
    fi
}

echo "1. PATIENT SERVICE FILES"
echo "------------------------"
check_file "services/patient-service/package.json"
check_file "services/patient-service/tsconfig.json"
check_file "services/patient-service/Dockerfile"
check_file "services/patient-service/src/app.ts"
check_file "services/patient-service/src/server.ts"
check_file "services/patient-service/src/models/schema.ts"
check_file "services/patient-service/src/controllers/patientController.ts"
check_file "services/patient-service/src/services/patientService.ts"
check_file "services/patient-service/src/routes/patientRoutes.ts"
check_file "services/patient-service/src/utils/logger.ts"
echo ""

echo "2. DOCTOR SERVICE FILES"
echo "------------------------"
check_file "services/doctor-service/package.json"
check_file "services/doctor-service/tsconfig.json"
check_file "services/doctor-service/Dockerfile"
check_file "services/doctor-service/src/app.ts"
check_file "services/doctor-service/src/server.ts"
check_file "services/doctor-service/src/models/schema.ts"
check_file "services/doctor-service/src/controllers/doctorController.ts"
check_file "services/doctor-service/src/services/doctorService.ts"
check_file "services/doctor-service/src/routes/doctorRoutes.ts"
check_file "services/doctor-service/src/utils/logger.ts"
echo ""

echo "3. DOCTOR PORTAL FILES"
echo "------------------------"
check_file "portals/doctor-portal/package.json"
check_file "portals/doctor-portal/vite.config.ts"
check_file "portals/doctor-portal/tsconfig.json"
check_file "portals/doctor-portal/tailwind.config.js"
check_file "portals/doctor-portal/index.html"
check_file "portals/doctor-portal/src/main.tsx"
check_file "portals/doctor-portal/src/App.tsx"
check_file "portals/doctor-portal/src/index.css"
check_file "portals/doctor-portal/Dockerfile"
check_file "portals/doctor-portal/nginx.conf"
echo ""

echo "4. DOCTOR PORTAL PAGES"
echo "------------------------"
check_file "portals/doctor-portal/src/pages/auth/Login.tsx"
check_file "portals/doctor-portal/src/pages/dashboard/Dashboard.tsx"
check_file "portals/doctor-portal/src/pages/patients/PatientList.tsx"
check_file "portals/doctor-portal/src/pages/patients/PatientForm.tsx"
check_file "portals/doctor-portal/src/pages/patients/PatientDetails.tsx"
check_file "portals/doctor-portal/src/pages/prescriptions/PrescriptionWizard.tsx"
check_file "portals/doctor-portal/src/pages/prescriptions/PrescriptionList.tsx"
echo ""

echo "5. DOCTOR PORTAL COMPONENTS"
echo "------------------------"
check_file "portals/doctor-portal/src/components/common/Layout.tsx"
check_file "portals/doctor-portal/src/services/apiService.ts"
check_file "portals/doctor-portal/src/contexts/AuthContext.tsx"
check_file "portals/doctor-portal/src/config/api.ts"
echo ""

echo "6. DATABASE MIGRATION"
echo "------------------------"
check_file "shared/database/migrations/003_sprint3_doctor_patient.sql"
echo ""

echo "7. DOCKER CONFIGURATION"
echo "------------------------"
check_file "docker-compose.yml"
echo ""

echo "8. CODE STATISTICS"
echo "------------------------"
PATIENT_LINES=$(find services/patient-service -type f \( -name "*.ts" -o -name "*.json" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
DOCTOR_LINES=$(find services/doctor-service -type f \( -name "*.ts" -o -name "*.json" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
PORTAL_LINES=$(find portals/doctor-portal -type f \( -name "*.tsx" -o -name "*.ts" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
TOTAL_LINES=$((PATIENT_LINES + DOCTOR_LINES + PORTAL_LINES))

echo "Patient Service: $PATIENT_LINES lines"
echo "Doctor Service: $DOCTOR_LINES lines"
echo "Doctor Portal: $PORTAL_LINES lines"
echo -e "${YELLOW}Total Sprint 3 Code: $TOTAL_LINES lines${NC}"
echo ""

echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    exit 1
fi
