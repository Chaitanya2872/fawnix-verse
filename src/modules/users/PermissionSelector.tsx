import type { PermissionModuleGroup } from "./permissions";

type PermissionSelectorProps = {
  selectedPermissions: string[];
  onTogglePermission: (permission: string) => void;
  permissionGroups: PermissionModuleGroup[];
  idPrefix?: string;
};

export function PermissionSelector({
  selectedPermissions,
  onTogglePermission,
  permissionGroups,
  idPrefix = "permission",
}: PermissionSelectorProps) {
  return (
    <div className="space-y-4">
      {permissionGroups.map((group) => {
        const moduleChecked = group.module ? selectedPermissions.includes(group.module.value) : false;
        const moduleId = group.module ? `${idPrefix}-${group.module.value}` : `${idPrefix}-${group.key}`;

        return (
          <div key={group.key} className="rounded-lg border border-slate-200 bg-white p-3">
            {group.module ? (
              <label htmlFor={moduleId} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  id={moduleId}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={moduleChecked}
                  onChange={() => onTogglePermission(group.module!.value)}
                />
                <span>{group.module.label}</span>
              </label>
            ) : (
              <p className="text-sm font-semibold text-slate-800">{group.label}</p>
            )}

            {group.pages.length ? (
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                {group.pages.map((page) => {
                  const pageId = `${idPrefix}-${page.value}`;
                  return (
                    <label key={page.value} htmlFor={pageId} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        id={pageId}
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        checked={selectedPermissions.includes(page.value)}
                        onChange={() => onTogglePermission(page.value)}
                      />
                      <span className="leading-5">{page.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {group.features.length ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Features</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.features.map((feature) => {
                    const featureId = `${idPrefix}-${feature.value}`;
                    return (
                      <label key={feature.value} htmlFor={featureId} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          id={featureId}
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          checked={selectedPermissions.includes(feature.value)}
                          onChange={() => onTogglePermission(feature.value)}
                        />
                        <span className="leading-5">
                          {feature.label}
                          {feature.description ? <span className="block text-xs text-slate-500">{feature.description}</span> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
