export default function SetupRolesPermissionsPage() {
  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="page-title">Roles & Permissions</h1>
        <p className="page-subtitle">
          Permissions are managed from the Admin Users module.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm text-gray-600">
          To adjust role access, open the Admin &gt; Users page and update role
          permissions for each user. This keeps the workspace aligned with the
          centralized Fawnix access model.
        </p>
      </div>
    </div>
  );
}
