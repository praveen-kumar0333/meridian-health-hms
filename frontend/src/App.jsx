import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import DoctorLayout from './layouts/DoctorLayout.jsx';
import PatientLayout from './layouts/PatientLayout.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import ProfilePage from './pages/shared/ProfilePage.jsx';

import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminEmergency from './pages/admin/AdminEmergency.jsx';
import AdminBeds from './pages/admin/AdminBeds.jsx';
import AdminPatients from './pages/admin/AdminPatients.jsx';
import AdminDoctors from './pages/admin/AdminDoctors.jsx';
import AdminAppointments from './pages/admin/AdminAppointments.jsx';
import AdminMedicalRecords from './pages/admin/AdminMedicalRecords.jsx';
import AdminBilling from './pages/admin/AdminBilling.jsx';
import AdminRevenue from './pages/admin/AdminRevenue.jsx';
import AdminNotifications from './pages/admin/AdminNotifications.jsx';

import DoctorOverview from './pages/doctor/DoctorOverview.jsx';
import DoctorAppointments from './pages/doctor/DoctorAppointments.jsx';
import DoctorPatients from './pages/doctor/DoctorPatients.jsx';
import DoctorMessages from './pages/doctor/DoctorMessages.jsx';
import DoctorMedicalRecords from './pages/doctor/DoctorMedicalRecords.jsx';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions.jsx';
import DoctorAvailability from './pages/doctor/DoctorAvailability.jsx';

import PatientOverview from './pages/patient/PatientOverview.jsx';
import PatientEmergency from './pages/patient/PatientEmergency.jsx';
import PatientBookAppointment from './pages/patient/PatientBookAppointment.jsx';
import PatientAppointments from './pages/patient/PatientAppointments.jsx';
import PatientMessages from './pages/patient/PatientMessages.jsx';
import PatientMedicalRecords from './pages/patient/PatientMedicalRecords.jsx';
import PatientPrescriptions from './pages/patient/PatientPrescriptions.jsx';
import PatientBilling from './pages/patient/PatientBilling.jsx';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner label="Initializing Meridian Health..." />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Admin Portal */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="emergency" element={<AdminEmergency />} />
                <Route path="beds" element={<AdminBeds />} />
                <Route path="patients" element={<AdminPatients />} />
                <Route path="doctors" element={<AdminDoctors />} />
                <Route path="appointments" element={<AdminAppointments />} />
                <Route path="medical-records" element={<AdminMedicalRecords />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="revenue" element={<AdminRevenue />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Doctor Portal */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route path="/doctor" element={<DoctorLayout />}>
                <Route index element={<DoctorOverview />} />
                <Route path="appointments" element={<DoctorAppointments />} />
                <Route path="patients" element={<DoctorPatients />} />
                <Route path="messages" element={<DoctorMessages />} />
                <Route path="medical-records" element={<DoctorMedicalRecords />} />
                <Route path="prescriptions" element={<DoctorPrescriptions />} />
                <Route path="availability" element={<DoctorAvailability />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Patient Portal */}
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route path="/patient" element={<PatientLayout />}>
                <Route index element={<PatientOverview />} />
                <Route path="emergency" element={<PatientEmergency />} />
                <Route path="book-appointment" element={<PatientBookAppointment />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="messages" element={<PatientMessages />} />
                <Route path="medical-records" element={<PatientMedicalRecords />} />
                <Route path="prescriptions" element={<PatientPrescriptions />} />
                <Route path="billing" element={<PatientBilling />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
