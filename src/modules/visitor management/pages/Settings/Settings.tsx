import { useState } from "react";
import { Bell, BadgeCheck, Clock3, Mail, Printer, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VmsAlert,
  VmsCard,
  VmsCardHeader,
  VmsIconBadge,
  VmsPage,
} from "../../components/vms/VmsPage";

const initialSettings = {
  emailAlerts: true,
  hostNotifications: true,
  badgePrinting: true,
  faceVerification: true,
  requireApprovalBeforeCheckIn: true,
  autoCheckout: false,
};

type SettingsState = typeof initialSettings;

function Settings() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof SettingsState) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <VmsPage
      title="Settings"
      description="Configure security desk behavior, notification preferences, badge prompts, and verification policy."
      actions={
        <Button type="button" onClick={saveSettings}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Changes
        </Button>
      }
    >
      {saved ? (
        <VmsAlert tone="success">
          Visitor Management settings saved.
        </VmsAlert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <SettingsPanel
          icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          title="Notifications"
          description="Keep hosts and security users informed."
          rows={[
            {
              label: "Email alerts",
              helper: "Notify security users when requests are created or updated.",
              icon: <Mail className="h-4 w-4" aria-hidden="true" />,
              checked: settings.emailAlerts,
              onChange: () => toggle("emailAlerts"),
            },
            {
              label: "Host notifications",
              helper: "Send approval and arrival messages to the host.",
              icon: <Bell className="h-4 w-4" aria-hidden="true" />,
              checked: settings.hostNotifications,
              onChange: () => toggle("hostNotifications"),
            },
          ]}
        />

        <SettingsPanel
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          title="Verification"
          description="Define what is required before desk entry."
          rows={[
            {
              label: "Face verification",
              helper: "Require a registered face profile before check-in.",
              icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
              checked: settings.faceVerification,
              onChange: () => toggle("faceVerification"),
            },
            {
              label: "Approval gate",
              helper: "Block desk check-in until a request is approved.",
              icon: <BadgeCheck className="h-4 w-4" aria-hidden="true" />,
              checked: settings.requireApprovalBeforeCheckIn,
              onChange: () => toggle("requireApprovalBeforeCheckIn"),
            },
          ]}
        />

        <SettingsPanel
          icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
          title="Desk Behavior"
          description="Reception workflow defaults."
          rows={[
            {
              label: "Badge printing",
              helper: "Prompt reception to print badges after successful check-in.",
              icon: <Printer className="h-4 w-4" aria-hidden="true" />,
              checked: settings.badgePrinting,
              onChange: () => toggle("badgePrinting"),
            },
            {
              label: "Auto checkout",
              helper: "Mark active visitors complete after office hours.",
              icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
              checked: settings.autoCheckout,
              onChange: () => toggle("autoCheckout"),
            },
          ]}
        />
      </section>

      <VmsCard>
        <VmsCardHeader title="Workspace Profile" description="Default security desk context used for reporting and badge metadata." />
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <ProfileField label="Workspace" value="Head Office" />
          <ProfileField label="Desk" value="Security Reception" />
          <ProfileField label="Timezone" value="Asia/Calcutta" />
        </div>
      </VmsCard>
    </VmsPage>
  );
}

type SettingRow = {
  label: string;
  helper: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: () => void;
};

function SettingsPanel({
  icon,
  title,
  description,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  rows: SettingRow[];
}) {
  return (
    <VmsCard>
      <VmsCardHeader
        title={title}
        description={description}
        actions={<VmsIconBadge>{icon}</VmsIconBadge>}
      />
      <div className="space-y-3 p-4">
        {rows.map((row) => (
          <label key={row.label} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3 transition hover:border-primary/40 hover:bg-accent/60">
            <span className="flex gap-3">
              <span className="mt-0.5 text-muted-foreground">{row.icon}</span>
              <span>
                <strong className="block text-sm font-semibold text-foreground">{row.label}</strong>
                <small className="mt-1 block text-sm leading-5 text-muted-foreground">{row.helper}</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={row.checked}
              onChange={row.onChange}
              className="mt-1 h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ))}
      </div>
    </VmsCard>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default Settings;
