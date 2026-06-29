export const normalizeStatus = (visitor) => {
  if (!visitor) return "Pending";
  if (visitor.status === "Checked Out") return "Completed";
  if (visitor.status === "Checked In") return "Arrived";
  return visitor.status || "Pending";
};

export const isApproved = (visitor) =>
  ["Approved", "Checked In", "Checked Out", "Completed"].includes(visitor?.status);

export const isArrived = (visitor) => Boolean(visitor?.checkIn && !visitor?.checkOut);

export const getVisitorStats = (visitors) => ({
  total: visitors.length,
  pending: visitors.filter((visitor) => visitor.status === "Pending").length,
  approved: visitors.filter(isApproved).length,
  rejected: visitors.filter((visitor) => visitor.status === "Rejected").length,
  arrived: visitors.filter(isArrived).length,
});

export const formatDateTime = (date = new Date()) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

export const initials = (name = "Visitor") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
