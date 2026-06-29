import { useLocation, useNavigate } from "react-router-dom";
import { Icons } from "../common/Icons";
import authService from "../../services/authService";

const routeTitles: Record<string, [string, string]> = {
  "/vms/dashboard":            ["Dashboard",            "Today's overview and visitor activity"],
  "/vms/create-visitor":       ["New Visitor",           "Register a new visitor request"],
  "/vms/visitor-requests":     ["Visitors",              "Search, manage and act on visitor records"],
  "/vms/approvals":            ["Approvals",             "Review and approve pending visitor requests"],
  "/vms/visitor-verification": ["Visitor Verification",  "Verify QR code and face match at the desk"],
  "/vms/face-registration":    ["Face Registration",     "Capture and register visitor identity photo"],
  "/vms/face-capture":         ["Face Registration",     "Capture and register visitor identity photo"],
  "/vms/visitor-validation":   ["Visitor Verification",  "Verify QR code and face match at the desk"],
  "/vms/check-in-out":         ["Check-In / Check-Out",  "Process visitor arrivals and departures"],
  "/vms/settings":             ["Settings",              "Workspace and security preferences"],
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getUser();
  const [title, subtitle] = routeTitles[location.pathname] || ["Visitor Management", "Office operations console"];

  const handleLogout = () => {
    authService.logout();
    navigate("/vms/login");
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="topbar-actions">
        <span className="topbar-status">
          <Icons.Shield />
          Secure
        </span>
        <button className="icon-button" type="button" aria-label="Notifications">
          <Icons.Bell />
        </button>
        <div className="user-chip" aria-label="Signed in user" title={user?.fullName || user?.username || "User"}>
          <span className="avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
        </div>
        <button className="icon-button" type="button" aria-label="Sign out" title="Sign out" onClick={handleLogout}>
          <Icons.LogOut />
        </button>
      </div>
    </header>
  );
}

export default Header;
