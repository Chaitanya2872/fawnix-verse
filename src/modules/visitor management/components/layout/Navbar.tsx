import { Icons } from "../common/Icons";

const Navbar = () => {
  return (
    <nav className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <strong>Visitor Management System</strong>
          <span>Office operations console</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notifications">
          <Icons.Bell />
        </button>
        <div className="user-chip">
          <span className="avatar">AD</span>
          <div>
            <strong>Admin</strong>
            <span>Security desk</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
