import { NavLink, useLocation } from "react-router-dom";
import { Icons } from "../common/Icons";

const navItems = [
  { to: "/dashboard",            label: "Dashboard",            Icon: Icons.Dashboard },
  { to: "/create-visitor",       label: "New Visitor",          Icon: Icons.UserPlus },
  { to: "/visitor-requests",     label: "Visitors",             Icon: Icons.FileText },
  { to: "/approvals",            label: "Approvals",            Icon: Icons.Approvals },
  { to: "/visitor-verification", label: "Visitor Verification", Icon: Icons.Shield,   aliases: ["/visitor-validation", "/face-registration", "/face-capture"] },
  { to: "/check-in-out",         label: "Check-In / Check-Out", Icon: Icons.QrCode },
  { to: "/settings",             label: "Settings",             Icon: Icons.Settings },
];

type SidebarProps = {
  collapsed?: boolean;
  mobileOpen: boolean;
  onToggle?: () => void;
  onNavigate: () => void;
};

function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-label="Primary navigation">
      <div className="sidebar-header">
        <NavLink className="sidebar-brand" to="/dashboard" onClick={onNavigate}>
          <span className="brand-mark">VMS</span>
          <span className="brand-copy">
            <span className="brand-name">Visitor Management</span>
            <span className="brand-subtitle">Office operations</span>
          </span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Workspace</span>
        {navItems.map(({ to, label, Icon, aliases = [] }) => {
          const isActive = location.pathname === to || aliases.includes(location.pathname);
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              onClick={onNavigate}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            style={isActive ? { background: "rgba(219,234,254,0.72)" } : {}}
            >
              <span className="sidebar-icon">
                <Icon />
              </span>
              <span className="sidebar-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <strong><span className="sidebar-status-dot" />Security Desk</strong>
          <span>Operations active</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
