import type { ReactNode } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "../index.css";
import Login from "../pages/Login/loginpage";
import authService from "../services/authService";

import Dashboard from "../pages/Dashboard/Dashboard";
import CreateVisitor from "../pages/CreateVisitor/CreateVisitor";
import FaceCapture from "../pages/FaceCapture/FaceCapture";
import VisitorVerification from "../pages/VisitorVerification/VisitorVerification";
import VisitorRequests from "../pages/VisitorRequests/VisitorRequests";
import Approvals from "../pages/Approvals/Approvals";
import CheckInOut from "../pages/CheckInOut/CheckInOut";
import Settings from "../pages/Settings/Settings";

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!authService.isLoggedIn()) {
    return <Navigate to="/vms/login" replace />;
  }
  return <>{children}</>;
}

function VmsLayout() {
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />

      <Route element={<ProtectedRoute><VmsLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/vms/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="create-visitor" element={<CreateVisitor />} />
        <Route path="visitor-requests" element={<VisitorRequests />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="visitor-verification" element={<VisitorVerification />} />
        <Route path="visitor-validation" element={<Navigate to="/vms/visitor-verification" replace />} />
        <Route path="face-registration" element={<FaceCapture />} />
        <Route path="face-capture" element={<Navigate to="/vms/face-registration" replace />} />
        <Route path="check-in-out" element={<CheckInOut />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/vms/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
