import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './layouts/Navbar.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { Role } from '@eliteship/shared';

// Public pages
import { HomePage } from './pages/HomePage.js';
import { TrackPage } from './pages/TrackPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

// Authenticated pages
import { CreateShipmentPage } from './pages/CreateShipmentPage.js';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage.js';
import { DriverDashboardPage } from './pages/DriverDashboardPage.js';
import { HubDashboardPage } from './pages/HubDashboardPage.js';
import { AdminConsolePage } from './pages/AdminConsolePage.js';

const App: React.FC = () => {
 return (
 <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
 <div className="min-h-screen flex flex-col bg-slate-50 ">
 <Navbar />
 <main className="flex-1">
 <Routes>
 {/* Public */}
 <Route path="/" element={<HomePage />} />
 <Route path="/track" element={<TrackPage />} />
 <Route path="/track/:trackingNumber" element={<TrackPage />} />
 <Route path="/login" element={<LoginPage />} />
 <Route path="/register" element={<RegisterPage />} />

 {/* Authenticated — any role */}
 <Route
 path="/create-shipment"
 element={
 <ProtectedRoute>
 <CreateShipmentPage />
 </ProtectedRoute>
 }
 />

 {/* Customer */}
 <Route
 path="/customer/dashboard"
 element={
 <ProtectedRoute allowedRoles={[Role.CUSTOMER, Role.ADMIN]}>
 <CustomerDashboardPage />
 </ProtectedRoute>
 }
 />

 {/* Driver workspace */}
 <Route
 path="/driver/dashboard"
 element={
 <ProtectedRoute allowedRoles={[Role.DRIVER, Role.ADMIN]}>
 <DriverDashboardPage />
 </ProtectedRoute>
 }
 />

 {/* Hub operations */}
 <Route
 path="/hub/dashboard"
 element={
 <ProtectedRoute allowedRoles={[Role.HUB_STAFF, Role.ADMIN]}>
 <HubDashboardPage />
 </ProtectedRoute>
 }
 />

 {/* Admin console */}
 <Route
 path="/admin"
 element={
 <ProtectedRoute allowedRoles={[Role.ADMIN]}>
 <AdminConsolePage />
 </ProtectedRoute>
 }
 />
 <Route path="/admin/:tab" element={
 <ProtectedRoute allowedRoles={[Role.ADMIN]}>
 <AdminConsolePage />
 </ProtectedRoute>
 } />

 {/* Fallback */}
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </main>
 </div>
 </BrowserRouter>
 );
};

export default App;
