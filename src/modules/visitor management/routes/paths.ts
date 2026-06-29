export const VMS_BASE_PATH = "/vms";

export const VMS_PATHS = {
  root: VMS_BASE_PATH,
  login: `${VMS_BASE_PATH}/login`,
  dashboard: `${VMS_BASE_PATH}/dashboard`,
  visitors: `${VMS_BASE_PATH}/visitors`,
  newVisitor: `${VMS_BASE_PATH}/visitors/new`,
  visitorDetails: (id: string | number) => `${VMS_BASE_PATH}/visitors/${id}`,
  approvals: `${VMS_BASE_PATH}/approvals`,
  desk: `${VMS_BASE_PATH}/desk`,
  history: `${VMS_BASE_PATH}/history`,
  reports: `${VMS_BASE_PATH}/reports`,
  settings: `${VMS_BASE_PATH}/settings`,
  faceRegistration: `${VMS_BASE_PATH}/face-registration`,
  faceRegistrationFor: (id: string | number) => `${VMS_BASE_PATH}/face-registration/${id}`,
};

export const VMS_LEGACY_REDIRECTS = [
  { from: "create-visitor", to: VMS_PATHS.newVisitor },
  { from: "visitor-requests", to: VMS_PATHS.visitors },
  { from: "check-in-out", to: VMS_PATHS.desk },
  { from: "visitor-verification", to: VMS_PATHS.desk },
  { from: "visitor-validation", to: VMS_PATHS.desk },
  { from: "face-capture", to: VMS_PATHS.faceRegistration },
  { from: "visitor-details-saved", to: VMS_PATHS.visitors },
  { from: "photo-saved", to: VMS_PATHS.desk },
];
