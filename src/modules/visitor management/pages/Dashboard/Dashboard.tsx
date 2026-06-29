import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Table from "../../components/common/Table";
import StatusBadge from "../../components/common/StatusBadge";
import { Icons } from "../../components/common/Icons";
import visitorRequestService from "../../services/visitorRequestService";
import { initials } from "../../utils/visitorUtils";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  note: string;
  icon?: ReactNode;
  onClick?: () => void;
  highlight?: boolean;
};

function MetricCard({ label, value, note, icon, onClick, highlight = false }: MetricCardProps) {
  const Tag = onClick ? "button" : "div";
  const extraStyle: CSSProperties = {
    ...(onClick ? { cursor: "pointer", width: "100%", textAlign: "left" } : {}),
    ...(highlight ? { borderColor: "var(--blue-200)", background: "linear-gradient(135deg,#ffffff 0%,var(--blue-50) 100%)" } : {}),
  };
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className="metric-card"
      style={extraStyle}
      onClick={onClick}
      title={onClick ? `Go to ${label}` : undefined}
    >
      <div className="metric-card-header">
        <div className="metric-label">{label}</div>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{value ?? "—"}</div>
      <div className="metric-change">{note}</div>
    </Tag>
  );
}

function WorkflowCard({ to, title, description, icon }) {
  return (
    <Link className="action-card" to={to}>
      <div className="action-card-top">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {icon && (
          <span style={{ flex: "0 0 auto", width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, background: "linear-gradient(135deg,var(--blue-50),#e0f2fe)", color: "var(--blue-700)" }}>
            {icon}
          </span>
        )}
      </div>
    </Link>
  );
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, visitors] = await Promise.all([
          visitorRequestService.getStatistics(),
          visitorRequestService.getAll(),
        ]);
        setStats(statsData);

        // Today's visitors first; fall back to latest 6 if none today
        const todayVisitors = visitors.filter((v) => isToday(v.fromDateTime) || isToday(v.createdAt));
        const sorted = [...visitors].sort((a, b) => b.id - a.id);
        setRecent(todayVisitors.length > 0 ? todayVisitors.sort((a, b) => b.id - a.id).slice(0, 8) : sorted.slice(0, 6));
      } catch (err) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const columns = [
    {
      header: "Visitor",
      accessor: "name",
      render: (visitor) => (
        <div className="visitor-cell">
          {visitor.photo ? (
            <img className="visitor-photo" src={visitor.photo} alt="" />
          ) : (
            <span className="visitor-avatar">{initials(visitor.name)}</span>
          )}
          <div>
            <div className="cell-title">{visitor.name}</div>
            <div className="cell-subtitle">{visitor.company || "Individual visitor"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Visitor ID",
      accessor: "visitorId",
      render: (_, value) => <span className="mono">{value || "—"}</span>,
    },
    { header: "Host", accessor: "employeeToMeet", render: (_, value) => value || "—" },
    {
      header: "From",
      accessor: "fromDateTime",
      render: (_, value) => value ? value.replace("T", " ").slice(0, 16) : "—",
    },
    {
      header: "Status",
      accessor: "status",
      render: (visitor) => <StatusBadge status={visitor.status} />,
    },
  ];

  return (
    <div className="dashboard-page">
      {/* ── Header row ── */}
      <div className="page-header">
        <button className="btn btn-primary" type="button" onClick={() => navigate("/create-visitor")}>
          <Icons.UserPlus />
          New Visitor
        </button>
      </div>

      {error && (
        <div className="card empty-state">
          <Icons.AlertCircle />
          <strong>Failed to load</strong>
          <span>{error}</span>
        </div>
      )}

      {/* ── Stat cards ── */}
      <section className="stat-grid" aria-label="Visitor statistics">
        <MetricCard
          label="Total Requests"
          value={loading ? "…" : stats?.totalRequests}
          note="All visitor records"
          icon={<Icons.FileText />}
        />
        <MetricCard
          label="Pending"
          value={loading ? "…" : stats?.pendingRequests}
          note="Awaiting approval"
          icon={<Icons.Clock />}
          highlight={Boolean(!loading && stats?.pendingRequests > 0)}
          onClick={() => navigate("/approvals")}
        />
        <MetricCard
          label="Approved"
          value={loading ? "…" : stats?.approvedRequests}
          note="Cleared by host"
          icon={<Icons.Check />}
        />
        <MetricCard
          label="Rejected"
          value={loading ? "…" : stats?.rejectedRequests}
          note="Not permitted"
          icon={<Icons.X />}
        />
        <MetricCard
          label="On Premises"
          value={loading ? "…" : stats?.currentlyArrived}
          note="Currently checked in"
          icon={<Icons.Shield />}
          highlight={Boolean(!loading && stats?.currentlyArrived > 0)}
          onClick={() => navigate("/check-in-out")}
        />
      </section>

      {/* ── Quick-action cards ── */}
      <section className="workflow-grid" aria-label="Primary workflows">
        <WorkflowCard
          to="/visitor-requests"
          title="Visitors"
          description="Search, sort, export, and act on all registered visitor records."
          icon={<Icons.FileText />}
        />
        <WorkflowCard
          to="/approvals"
          title="Approvals"
          description="Review pending requests and approve or reject from a focused queue."
          icon={<Icons.Approvals />}
        />
        <WorkflowCard
          to="/check-in-out"
          title="Check-In / Check-Out"
          description="Scan QR codes, process arrivals, and record departures at the desk."
          icon={<Icons.QrCode />}
        />
      </section>

      {/* ── Recent visitors ── */}
      <section className="recent-visitors-section">
        <div className="section-header" style={{ marginBottom: 14 }}>
          <div className="section-title">
            <h2>Today's Visitors</h2>
            <p>Visitors scheduled or registered today.</p>
          </div>
          <Link className="btn btn-outline" to="/visitor-requests">View All</Link>
        </div>

        {loading ? (
          <div className="card empty-state">
            <Icons.Activity />
            <strong>Loading visitors…</strong>
          </div>
        ) : (
          <Table
            columns={columns}
            data={recent}
            emptyMessage="No visitors registered today."
          />
        )}
      </section>
    </div>
  );
}

export default Dashboard;
