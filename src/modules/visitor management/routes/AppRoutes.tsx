import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
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

function ProtectedRoute({ children }) {
  if (!authService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-visitor" element={<CreateVisitor />} />
          <Route path="/visitor-requests" element={<VisitorRequests />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/visitor-verification" element={<VisitorVerification />} />
          {/* Legacy aliases — redirect to canonical routes */}
          <Route path="/visitor-validation" element={<Navigate to="/visitor-verification" replace />} />
          <Route path="/face-registration" element={<FaceCapture />} />
          <Route path="/face-capture" element={<Navigate to="/face-registration" replace />} />
          <Route path="/check-in-out" element={<CheckInOut />} />
          <Route path="/settings" element={<Settings />} />
          {/* Removed: /visitor-details-saved, /photo-saved (pure splash pages — replaced by inline toasts) */}
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
