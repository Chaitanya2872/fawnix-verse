import { PERMISSION_MODULE_GROUPS, STANDALONE_PAGE_OPTIONS } from "./permissions";

type PermissionSelectorProps = {
  selectedPermissions: string[];
  onTogglePermission: (permission: string) => void;
  idPrefix?: string;
};

export function PermissionSelector({
  selectedPermissions,
  onTogglePermission,
  idPrefix = "permission",
}: PermissionSelectorProps) {
  return (
    <div className="space-y-4">
      {PERMISSION_MODULE_GROUPS.map((group) => {
        const moduleChecked = selectedPermissions.includes(group.module.value);
        const moduleId = `${idPrefix}-${group.module.value}`;

        return (
          <div key={group.module.value} className="rounded-lg border border-slate-200 bg-white p-3">
            <label htmlFor={moduleId} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                id={moduleId}
                type="radio"
                readOnly
                className="peer sr-only"
                checked={moduleChecked}
                onClick={() => onTogglePermission(group.module.value)}
              />
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-500 bg-white transition-colors peer-checked:border-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 after:h-2.5 after:w-2.5 after:rounded-full after:bg-blue-600 after:opacity-0 after:transition-opacity peer-checked:after:opacity-100"
              />
              <span>{group.module.label}</span>
            </label>

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
          </div>
        );
      })}

      {STANDALONE_PAGE_OPTIONS.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Standalone Pages</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {STANDALONE_PAGE_OPTIONS.map((page) => {
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
        </div>
      ) : null}
    </div>
  );
}
