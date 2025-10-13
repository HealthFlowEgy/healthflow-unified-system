import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'react-hot-toast'

// Contexts
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/contexts/I18nContext'

// Components
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorFallback } from '@/components/ui/ErrorFallback'
import { Layout } from '@/components/layout/Layout'

// Pages (Lazy loaded)
const Dashboard = React.lazy(() => import('@/pages/Dashboard'))
const Login = React.lazy(() => import('@/pages/auth/Login'))
const Register = React.lazy(() => import('@/pages/auth/Register'))
const PrescriptionUpload = React.lazy(() => import('@/pages/prescription/PrescriptionUpload'))
const PrescriptionList = React.lazy(() => import('@/pages/prescription/PrescriptionList'))
const PrescriptionDetail = React.lazy(() => import('@/pages/prescription/PrescriptionDetail'))
const PatientProfile = React.lazy(() => import('@/pages/patient/PatientProfile'))
const Analytics = React.lazy(() => import('@/pages/analytics/Analytics'))
const Settings = React.lazy(() => import('@/pages/settings/Settings'))
const AdminPanel = React.lazy(() => import('@/pages/admin/AdminPanel'))
const NotFound = React.lazy(() => import('@/pages/NotFound'))

// Hooks
import { useAuth } from '@/hooks/useAuth'

// Styles
import '@/styles/globals.css'

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole = [] 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole.length > 0 && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// ============================================================================
// PUBLIC ROUTE COMPONENT
// ============================================================================

interface PublicRouteProps {
  children: React.ReactNode
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo)
        // Send error to monitoring service
        if (import.meta.env.PROD) {
          // Sentry or other error tracking service
          console.error('Production error logged')
        }
      }}
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <ThemeProvider>
              <AuthProvider>
                <Router>
                  <div className="min-h-screen bg-background font-sans antialiased">
                    <Routes>
                      {/* Public Routes */}
                      <Route
                        path="/login"
                        element={
                          <PublicRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <Login />
                            </Suspense>
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/register"
                        element={
                          <PublicRoute>
                            <Suspense fallback={<LoadingSpinner />}>
                              <Register />
                            </Suspense>
                          </PublicRoute>
                        }
                      />

                      {/* Protected Routes */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        {/* Dashboard */}
                        <Route
                          index
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Dashboard />
                            </Suspense>
                          }
                        />
                        <Route
                          path="dashboard"
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Dashboard />
                            </Suspense>
                          }
                        />

                        {/* Prescription Management */}
                        <Route
                          path="prescriptions/upload"
                          element={
                            <ProtectedRoute requiredRole={['doctor', 'pharmacist']}>
                              <Suspense fallback={<LoadingSpinner />}>
                                <PrescriptionUpload />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="prescriptions"
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <PrescriptionList />
                            </Suspense>
                          }
                        />
                        <Route
                          path="prescriptions/:id"
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <PrescriptionDetail />
                            </Suspense>
                          }
                        />

                        {/* Patient Management */}
                        <Route
                          path="patients/:id"
                          element={
                            <ProtectedRoute requiredRole={['doctor', 'pharmacist', 'nurse']}>
                              <Suspense fallback={<LoadingSpinner />}>
                                <PatientProfile />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Analytics */}
                        <Route
                          path="analytics"
                          element={
                            <ProtectedRoute requiredRole={['doctor', 'admin', 'super_admin']}>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Analytics />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Settings */}
                        <Route
                          path="settings"
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <Settings />
                            </Suspense>
                          }
                        />

                        {/* Admin Panel */}
                        <Route
                          path="admin/*"
                          element={
                            <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                              <Suspense fallback={<LoadingSpinner />}>
                                <AdminPanel />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />
                      </Route>

                      {/* Catch all route */}
                      <Route
                        path="*"
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <NotFound />
                          </Suspense>
                        }
                      />
                    </Routes>

                    {/* Global Components */}
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: 'hsl(var(--background))',
                          color: 'hsl(var(--foreground))',
                          border: '1px solid hsl(var(--border))',
                        },
                        success: {
                          iconTheme: {
                            primary: 'hsl(var(--primary))',
                            secondary: 'hsl(var(--primary-foreground))',
                          },
                        },
                        error: {
                          iconTheme: {
                            primary: 'hsl(var(--destructive))',
                            secondary: 'hsl(var(--destructive-foreground))',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </AuthProvider>
            </ThemeProvider>
          </I18nProvider>
          
          {/* Development Tools */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  )
}

export default App

