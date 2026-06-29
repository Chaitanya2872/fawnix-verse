import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "../index.css";
import Login from "../pages/Login/loginpage";
import authService from "../services/authService";
import Dashboard from "../pages/Dashboard/Dashboard";
import CreateVisitor from "../pages/CreateVisitor/CreateVisitor";
import FaceCapture from "../pages/FaceCapture/FaceCapture";
import VisitorRequests from "../pages/VisitorRequests/VisitorRequests";
import VisitorDetails from "../pages/VisitorDetails/VisitorDetails";
import Approvals from "../pages/Approvals/Approvals";
import CheckInOut from "../pages/CheckInOut/CheckInOut";
import VisitorHistory from "../pages/VisitorHistory/VisitorHistory";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import { VMS_LEGACY_REDIRECTS, VMS_PATHS } from "./paths";

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!authService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicLoginRoute() {
  if (authService.isLoggedIn()) {
    return <Navigate to={VMS_PATHS.dashboard} replace />;
  }
  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<PublicLoginRoute />} />

      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={VMS_PATHS.dashboard} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="visitors" element={<VisitorRequests />} />
        <Route path="visitors/new" element={<CreateVisitor />} />
        <Route path="visitors/:id" element={<VisitorDetails />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="desk" element={<CheckInOut />} />
        <Route path="history" element={<VisitorHistory />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="face-registration" element={<FaceCapture />} />
        <Route path="face-registration/:id" element={<FaceCapture />} />

        {VMS_LEGACY_REDIRECTS.map((route) => (
          <Route key={route.from} path={route.from} element={<Navigate to={route.to} replace />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to={VMS_PATHS.dashboard} replace />} />
    </Routes>
  );
}

export default AppRoutes;
