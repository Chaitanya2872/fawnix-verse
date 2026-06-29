import { NavLink, useLocation } from "react-router-dom";
import { Icons } from "../common/Icons";

const navItems = [
  { to: "/vms/dashboard",            label: "Dashboard",            Icon: Icons.Dashboard },
  { to: "/vms/visitors/new",         label: "New Visitor",          Icon: Icons.UserPlus },
  { to: "/vms/visitors",             label: "Visitors",             Icon: Icons.FileText },
  { to: "/vms/approvals",            label: "Approvals",            Icon: Icons.Approvals },
  { to: "/vms/desk",                 label: "Desk Check-In",        Icon: Icons.QrCode, aliases: ["/vms/visitor-verification", "/vms/visitor-validation", "/vms/check-in-out"] },
  { to: "/vms/history",              label: "History",              Icon: Icons.Clock },
  { to: "/vms/reports",              label: "Reports",              Icon: Icons.Activity },
  { to: "/vms/settings",             label: "Settings",             Icon: Icons.Settings },
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
        <NavLink className="sidebar-brand" to="/vms/dashboard" onClick={onNavigate}>
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
          <span>Desk workflow active</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
