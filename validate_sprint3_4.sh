#!/bin/bash

echo "=========================================="
echo "Sprint 3 + 4 Validation Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((FAIL++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((FAIL++))
    fi
}

echo "=== Sprint 3 Enhancements ==="
echo ""

echo "Doctor Service Enhancements:"
check_file "services/doctor-service/src/controllers/licenseController.ts"
check_file "services/doctor-service/src/controllers/templateController.ts"
check_file "services/doctor-service/src/controllers/statisticsController.ts"
check_file "services/doctor-service/src/routes/licenseRoutes.ts"
check_file "services/doctor-service/src/routes/templateRoutes.ts"
check_file "services/doctor-service/src/routes/statisticsRoutes.ts"

echo ""
echo "Doctor Portal Enhancements:"
check_file "portals/doctor-portal/src/pages/templates/TemplateList.tsx"
check_file "portals/doctor-portal/src/pages/templates/TemplateForm.tsx"

echo ""
echo "=== Sprint 4 New Features ==="
echo ""

echo "Appointment Service:"
check_dir "services/appointment-service"
check_file "services/appointment-service/src/models/schema.ts"
check_file "services/appointment-service/src/controllers/appointmentController.ts"
check_file "services/appointment-service/src/routes/appointmentRoutes.ts"
check_file "services/appointment-service/src/app.ts"
check_file "services/appointment-service/src/server.ts"
check_file "services/appointment-service/package.json"
check_file "services/appointment-service/Dockerfile"

echo ""
echo "Notification Service:"
check_dir "services/notification-service"
check_file "services/notification-service/src/models/schema.ts"
check_file "services/notification-service/src/controllers/notificationController.ts"
check_file "services/notification-service/src/services/emailService.ts"
check_file "services/notification-service/src/services/smsService.ts"
check_file "services/notification-service/src/routes/notificationRoutes.ts"
check_file "services/notification-service/src/app.ts"
check_file "services/notification-service/src/server.ts"
check_file "services/notification-service/package.json"
check_file "services/notification-service/Dockerfile"

echo ""
echo "Patient Portal:"
check_dir "portals/patient-portal"
check_file "portals/patient-portal/src/App.tsx"
check_file "portals/patient-portal/src/main.tsx"
check_file "portals/patient-portal/src/contexts/AuthContext.tsx"
check_file "portals/patient-portal/src/services/apiService.ts"
check_file "portals/patient-portal/src/components/Layout.tsx"
check_file "portals/patient-portal/src/components/ProtectedRoute.tsx"
check_file "portals/patient-portal/src/pages/Login.tsx"
check_file "portals/patient-portal/src/pages/Dashboard.tsx"
check_file "portals/patient-portal/src/pages/Appointments.tsx"
check_file "portals/patient-portal/src/pages/Prescriptions.tsx"
check_file "portals/patient-portal/src/pages/MedicalRecords.tsx"
check_file "portals/patient-portal/src/pages/Profile.tsx"
check_file "portals/patient-portal/package.json"
check_file "portals/patient-portal/Dockerfile"

echo ""
echo "=== Database Migrations ==="
check_file "shared/database/migrations/004_sprint3_missing_tables.sql"
check_file "shared/database/migrations/005_sprint4_appointments.sql"
check_file "shared/database/migrations/006_sprint4_notifications.sql"

echo ""
echo "=== Integration ==="
check_file "services/api-gateway/src/index.ts"
check_file "docker-compose.yml"
check_file ".env.example"

echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

# Count lines of code
echo "=== Code Statistics ==="
echo ""

if command -v find &> /dev/null; then
    DOCTOR_SERVICE_LINES=$(find services/doctor-service/src -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    APPOINTMENT_SERVICE_LINES=$(find services/appointment-service/src -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    NOTIFICATION_SERVICE_LINES=$(find services/notification-service/src -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    PATIENT_PORTAL_LINES=$(find portals/patient-portal/src -name "*.tsx" -o -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    DOCTOR_PORTAL_LINES=$(find portals/doctor-portal/src -name "*.tsx" -o -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    
    echo "Doctor Service: $DOCTOR_SERVICE_LINES lines"
    echo "Appointment Service: $APPOINTMENT_SERVICE_LINES lines"
    echo "Notification Service: $NOTIFICATION_SERVICE_LINES lines"
    echo "Patient Portal: $PATIENT_PORTAL_LINES lines"
    echo "Doctor Portal: $DOCTOR_PORTAL_LINES lines"
    
    TOTAL=$((DOCTOR_SERVICE_LINES + APPOINTMENT_SERVICE_LINES + NOTIFICATION_SERVICE_LINES + PATIENT_PORTAL_LINES + DOCTOR_PORTAL_LINES))
    echo ""
    echo -e "${YELLOW}Total Sprint 3 + 4 Code: $TOTAL lines${NC}"
fi

echo ""
echo "=========================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some validations failed!${NC}"
    exit 1
fi
