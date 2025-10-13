import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PharmacyProvider } from './contexts/PharmacyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PharmacyRegistration from './pages/PharmacyRegistration';
import PharmacyList from './pages/PharmacyList';
import InventoryManagement from './pages/InventoryManagement';
import DispensingWorkflow from './pages/DispensingWorkflow';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <PharmacyProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pharmacies" element={<PharmacyList />} />
              <Route path="/pharmacies/register" element={<PharmacyRegistration />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/dispensing" element={<DispensingWorkflow />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </PharmacyProvider>
    </AuthProvider>
  );
}

export default App;

