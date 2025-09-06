import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App.jsx'
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import AlertsCenter from "./components/AlertsCenter";
import DeviceSetup from "./components/DeviceSetup";
import UserProfile from "./components/UserProfile";
import AdminConsole from "./components/AdminConsole";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
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
        <Route path="/home" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
