import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App.jsx'
import { Login, Register, ProtectedRoute } from "./components/auth";
import { Dashboard } from "./components/dashboard";
import { History } from "./components/history";
import { AlertsCenter } from "./components/alerts";
import { DeviceSetup } from "./components/device";
import { UserProfile } from "./components/profile";
import { AdminConsole } from "./components/admin";
import { CareTeam } from "./components/care";
import { Navigation } from "./components/ui";
import './index.css'

function AppWrapper({ children }) {
  return (
    <div>
      <Navigation />
      {children}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
     <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppWrapper>
              <Dashboard />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/caregiver" element={
          <ProtectedRoute>
            <AppWrapper>
              <Dashboard />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AppWrapper>
              <AdminConsole />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppWrapper>
              <History />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute>
            <AppWrapper>
              <AlertsCenter />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/device-setup" element={
          <ProtectedRoute>
            <AppWrapper>
              <DeviceSetup />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppWrapper>
              <UserProfile />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/care-team" element={
          <ProtectedRoute>
            <AppWrapper>
              <CareTeam />
            </AppWrapper>
          </ProtectedRoute>
        } />
        <Route path="/home" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
