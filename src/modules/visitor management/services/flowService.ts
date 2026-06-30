const STORAGE_KEY = "vms_flow_visitors";
const CURRENT_VISITOR_KEY = "vms_flow_current_visitor";
const DELETED_IDS_KEY = "vms_deleted_visitor_ids";

const readDeletedIds = () => {
  try {
    return JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "[]");
  } catch {
    return [];
  }
};

const readStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeStorage = (visitors) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
  } catch (error) {
    console.error("Failed to write visitors to storage", error);
  }
};

const hasIdentityValue = (value) => value !== undefined && value !== null && value !== "";

const sameVisitor = (visitor, id) =>
  hasIdentityValue(id) &&
  (String(visitor?.id) === String(id) || String(visitor?.visitorId) === String(id));

const sharesVisitorIdentity = (a, b) => {
  const keys = [a?.id, a?.visitorId].filter(hasIdentityValue).map(String);
  return keys.some((key) => String(b?.id) === key || String(b?.visitorId) === key);
};

const flowService = {
  generateVisitorId: () => {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `VMS-${date}-${rand}`;
  },

  saveVisitor: (visitor) => {
    const visitors = readStorage();
    const exists = visitors.some((item) => sharesVisitorIdentity(item, visitor));
    writeStorage(
      exists
        ? visitors.map((item) => (sharesVisitorIdentity(item, visitor) ? { ...item, ...visitor } : item))
        : [...visitors, visitor]
    );
  },

  getVisitors: () => readStorage(),

  getVisitorById: (id) =>
    readStorage().find((v) => sameVisitor(v, id)),

  getVisitorByVisitorId: (visitorId) =>
    readStorage().find((v) => String(v.visitorId) === String(visitorId)),

  deleteVisitor: (id) => {
    writeStorage(readStorage().filter((v) => !sameVisitor(v, id)));
  },

  markDeleted: (id) => {
    try {
      const ids = readDeletedIds();
      if (!ids.map(String).includes(String(id))) {
        localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids, id]));
      }
    } catch {
      // Ignore storage write failures for this local deletion marker.
    }
  },

  getDeletedIds: () => readDeletedIds(),

  clearDeletedId: (id) => {
    try {
      localStorage.setItem(
        DELETED_IDS_KEY,
        JSON.stringify(readDeletedIds().filter((i) => String(i) !== String(id)))
      );
    } catch {
      // Ignore storage write failures for this local deletion marker.
    }
  },

  updateVisitor: (id, updates) => {
    const visitors = readStorage();
    const current = flowService.getCurrentVisitor();
    const hasStoredVisitor = visitors.some((visitor) => sameVisitor(visitor, id));
    const next = hasStoredVisitor
      ? visitors.map((visitor) => (sameVisitor(visitor, id) ? { ...visitor, ...updates } : visitor))
      : current && sameVisitor(current, id)
        ? [...visitors, { ...current, ...updates }]
        : visitors;
    writeStorage(next);
    if (current && sameVisitor(current, id)) {
      flowService.setCurrentVisitor({ ...current, ...updates });
    }
    return next;
  },

  setCurrentVisitor: (visitor) => {
    try {
      localStorage.setItem(CURRENT_VISITOR_KEY, JSON.stringify(visitor));
    } catch (error) {
      console.error("Failed to write current visitor to storage", error);
    }
  },

  getCurrentVisitor: () => {
    try {
      const stored = localStorage.getItem(CURRENT_VISITOR_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to read current visitor from storage", error);
      return null;
    }
  },

  clearCurrentVisitor: () => {
    localStorage.removeItem(CURRENT_VISITOR_KEY);
  },
};

export default flowService;
