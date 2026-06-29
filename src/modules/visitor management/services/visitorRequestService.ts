import { API_BASE_URL } from "./apiConfig";
import { authFetch } from "./authService";
import flowService from "./flowService";

export const PURPOSE_OPTIONS = [
  { value: "OFFICIAL_MEETING", label: "Official Meeting" },
  { value: "CONSULTANT_VISIT", label: "Consultant Visit" },
  { value: "PERSONAL_VISIT", label: "Personal Visit" },
  { value: "OTHERS", label: "Others" },
];

// True only when the server was completely unreachable (no HTTP response at all)
const isNetworkError = (err) => err instanceof TypeError && err.message === "Failed to fetch";

// Backend status + arrived flag → frontend display status
const resolveStatus = (req) => {
  if (req.status === "COMPLETED") return "Checked Out";
  if (req.status === "APPROVED" && req.arrived) return "Checked In";
  if (req.status === "APPROVED") return "Approved";
  if (req.status === "REJECTED") return "Rejected";
  if (req.status === "CANCELLED") return "Cancelled";
  return "Pending";
};

// Backend VisitorRequest → frontend visitor shape
export const normalize = (req) => ({
  id: req.id,
  visitorId: req.visitorId || `VISITOR_${req.id}`,
  name: req.visitorFullName || req.name || "",
  email: req.email || "",
  mobile: req.whatsappMobile || req.mobile || "",
  company: req.company || "",
  purpose: req.purposeOfVisit || req.purpose || "",
  otherPurpose: req.otherPurpose || "",
  fromDateTime: req.fromDateTime || req.visitDate || "",
  toDateTime: req.toDateTime || "",
  status: req.visitorFullName != null ? resolveStatus(req) : (req.status || "Pending"),
  photo: req.faceImageUrl || req.photo || null,
  faceRegistered: req.faceRegistered || false,
  qrCodeData: req.qrCodeData || "",
  qrCodeUrl: req.qrCodeUrl || "",
  checkIn: req.arrivedAt || req.checkIn || null,
  checkOut: req.departedAt || req.checkOut || null,
  createdAt: req.createdAt || "",
  employeeToMeet: req.requestedByEmployeeName || req.employeeToMeet || "",
  registrationToken: req.registrationToken || "",
  rejectionReason: req.rejectionReason || null,
});

const handleResponse = async (res) => {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
  return res.json().catch(() => ({}));
};

// Build statistics from localStorage visitors
const localStats = (visitors) => ({
  totalRequests: visitors.length,
  pendingRequests: visitors.filter((v) => v.status === "Pending").length,
  approvedRequests: visitors.filter((v) => v.status === "Approved" || v.status === "Checked In").length,
  rejectedRequests: visitors.filter((v) => v.status === "Rejected").length,
  currentlyArrived: visitors.filter((v) => v.status === "Checked In").length,
});

const visitorRequestService = {
  // POST /api/visitor-requests
  create: async (form) => {
    const payload = {
      visitorFullName: form.name,
      email: form.email,
      whatsappMobile: form.mobile,
      company: form.company,
      requestedByEmployeeName: form.employeeToMeet,
      purposeOfVisit: form.purpose,
      otherPurpose: form.purpose === "OTHERS" ? (form.otherPurpose || "") : null,
      fromDateTime: form.fromDateTime,
      toDateTime: form.toDateTime,
    };
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      flowService.saveVisitor(visitor);
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] create visitor → localStorage");
      const id = Date.now();
      const visitor = {
        id,
        visitorId: `VISITOR_${id}`,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        company: form.company,
        purpose: form.purpose,
        otherPurpose: form.otherPurpose || "",
        fromDateTime: form.fromDateTime,
        toDateTime: form.toDateTime,
        status: "Pending",
        photo: null,
        faceRegistered: false,
        qrCodeData: `VMS|LOCAL_${id}`,
        qrCodeUrl: "",
        checkIn: null,
        checkOut: null,
        createdAt: new Date().toISOString(),
        employeeToMeet: form.employeeToMeet || "",
        registrationToken: "",
        rejectionReason: null,
      };
      flowService.saveVisitor(visitor);
      return visitor;
    }
  },

  // GET /api/visitor-requests?filter=...
  getAll: async (filter = "") => {
    const url = filter
      ? `${API_BASE_URL}/api/visitor-requests?filter=${filter}`
      : `${API_BASE_URL}/api/visitor-requests`;
    try {
      const res = await authFetch(url);
      const data = await handleResponse(res);
      const all = Array.isArray(data) ? data.map(normalize) : [];
      const deletedIds = new Set(flowService.getDeletedIds().map(String));

      // Clean up confirmed deletions: if API no longer returns the ID, backend has deleted it
      flowService.getDeletedIds().forEach((deletedId) => {
        if (!all.find((v) => String(v.id) === String(deletedId))) {
          flowService.clearDeletedId(deletedId);
        }
      });

      // Filter out locally-deleted visitors from the API response
      const visitors = all.filter((v) => !deletedIds.has(String(v.id)));

      // Keep localStorage in sync for offline use
      visitors.forEach((v) => {
        if (!flowService.getVisitorById(v.id)) flowService.saveVisitor(v);
      });
      return visitors;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] getAll → localStorage");
      const deletedIds = new Set(flowService.getDeletedIds().map(String));
      return flowService.getVisitors().filter((v) => !deletedIds.has(String(v.id)));
    }
  },

  // GET /api/visitor-requests/{id}
  getById: async (id) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}`);
      const data = await handleResponse(res);
      return normalize(data);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] getById → localStorage");
      const found = flowService.getVisitorById(id);
      if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
      return found;
    }
  },

  // GET /api/visitor-requests/search?keyword=...
  search: async (keyword) => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/visitor-requests/search?keyword=${encodeURIComponent(keyword)}`
      );
      const data = await handleResponse(res);
      return Array.isArray(data) ? data.map(normalize) : [];
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] search → localStorage");
      const kw = keyword.toLowerCase();
      return flowService.getVisitors().filter(
        (v) =>
          v.name?.toLowerCase().includes(kw) ||
          v.company?.toLowerCase().includes(kw) ||
          v.visitorId?.toLowerCase().includes(kw)
      );
    }
  },

  // GET /api/visitor-requests/statistics
  getStatistics: async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/statistics`);
      return handleResponse(res);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] getStatistics → localStorage");
      return localStats(flowService.getVisitors());
    }
  },

  // POST /api/visitor-requests/{id}/approve
  approve: async (id) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}/approve`, {
        method: "POST",
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      flowService.updateVisitor(id, { status: "Approved" });
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] approve → localStorage");
      flowService.updateVisitor(id, { status: "Approved" });
      const found = flowService.getVisitorById(id);
      if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
      return { ...found, status: "Approved" };
    }
  },

  // POST /api/visitor-requests/{id}/reject
  reject: async (id, rejectionReason = "") => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ requestId: id, approved: false, rejectionReason }),
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      flowService.updateVisitor(id, { status: "Rejected", rejectionReason });
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] reject → localStorage");
      flowService.updateVisitor(id, { status: "Rejected", rejectionReason });
      const found = flowService.getVisitorById(id);
      if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
      return { ...found, status: "Rejected", rejectionReason };
    }
  },

  // DELETE /api/visitor-requests/{id}
  delete: async (id) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Delete failed (${res.status}): ${text}`);
      }
      flowService.deleteVisitor(id);
      flowService.markDeleted(id);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] delete → localStorage");
      flowService.deleteVisitor(id);
      flowService.markDeleted(id);
    }
  },

  // POST /api/visitor-requests/verify-qr
  verifyQr: async (input) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/verify-qr`, {
        method: "POST",
        body: JSON.stringify({ qrCodeData: input, action: "CHECK_IN" }),
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      const deletedIds = new Set(flowService.getDeletedIds().map(String));
      if (deletedIds.has(String(visitor.id))) {
        throw new Error(`No visitor found for: ${input}`);
      }
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] verifyQr → localStorage");
      const deletedIds = new Set(flowService.getDeletedIds().map(String));
      const found = flowService.getVisitors().find(
        (v) =>
          !deletedIds.has(String(v.id)) &&
          (v.qrCodeData === input || v.visitorId === input || String(v.id) === input)
      );
      if (!found) throw new Error(`No visitor found for: ${input}`, { cause: err });
      return found;
    }
  },

  // POST /api/visitor-requests/{id}/check-in
  checkIn: async (id, qrCodeData) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}/check-in`, {
        method: "POST",
        body: JSON.stringify({ qrCodeData, action: "CHECK_IN" }),
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      flowService.updateVisitor(id, { status: "Checked In", checkIn: new Date().toISOString() });
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] checkIn → localStorage");
      const checkIn = new Date().toISOString();
      flowService.updateVisitor(id, { status: "Checked In", checkIn });
      const found = flowService.getVisitorById(id);
      if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
      return { ...found, status: "Checked In", checkIn };
    }
  },

  // POST /api/visitor-requests/{id}/check-out
  checkOut: async (id, qrCodeData) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/${id}/check-out`, {
        method: "POST",
        body: JSON.stringify({ qrCodeData, action: "CHECK_OUT" }),
      });
      const data = await handleResponse(res);
      const visitor = normalize(data);
      flowService.updateVisitor(id, { status: "Checked Out", checkOut: new Date().toISOString() });
      return visitor;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] checkOut → localStorage");
      const checkOut = new Date().toISOString();
      flowService.updateVisitor(id, { status: "Checked Out", checkOut });
      const found = flowService.getVisitorById(id);
      if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
      return { ...found, status: "Checked Out", checkOut };
    }
  },
};

export default visitorRequestService;
