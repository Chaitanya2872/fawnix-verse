const statusMap = {
  Pending:      "pending",
  Approved:     "approved",
  Rejected:     "rejected",
  Completed:    "completed",
  "Checked In": "checkedin",
  "Checked Out": "completed",
  Arrived:      "checkedin",
};

function displayStatus(status) {
  if (status === "Checked Out") return "Completed";
  if (status === "Checked In") return "Arrived";
  return status || "Pending";
}

const inlineStyles = {
  checkedin: { color: "#065f46", background: "#d1fae5", border: "1px solid #6ee7b7" },
};

function StatusBadge({ status }) {
  const label = displayStatus(status);
  const tone = statusMap[status] || statusMap[label] || "pending";
  const extraStyle = inlineStyles[tone] || {};

  return (
    <span className={`status-badge status-badge-${tone}`} style={extraStyle}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
