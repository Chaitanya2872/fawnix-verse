import { useState } from "react";
import Alert from "../../components/common/Alert";
import { Icons } from "../../components/common/Icons";

const initialSettings = {
  emailAlerts: true,
  badgePrinting: true,
  faceVerification: true,
  autoCheckout: false,
};

function Settings() {
  const [settings, setSettings] = useState(initialSettings);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="page-stack">
      {/* <div className="page-header"> */}
        {/* <div className="page-title">
          <h1>Settings</h1>
          <p className="page-description">Manage security desk preferences, notifications, and verification behavior.</p>
        </div> */}
        <button className="btn btn-primary" type="button" onClick={saveSettings}>
          Save Changes
        </button>
      {/* </div> */}

      {saved && (
        <Alert type="success" title="Settings saved">
          Your workspace preferences have been updated.
        </Alert>
      )}

      <section className="settings-grid">
        <SettingsPanel
          icon={<Icons.Bell />}
          title="Notifications"
          description="Keep hosts and security users informed."
          rows={[
            ["Email alerts", "Notify hosts when a visitor request is created.", settings.emailAlerts, () => toggle("emailAlerts")],
            ["Badge printing", "Prompt reception to print passes after check-in.", settings.badgePrinting, () => toggle("badgePrinting")],
          ]}
        />

        <SettingsPanel
          icon={<Icons.Shield />}
          title="Validation"
          description="Control identity verification at the desk."
          rows={[
            ["Face verification", "Require a registered photo before validation.", settings.faceVerification, () => toggle("faceVerification")],
            ["Auto checkout", "Mark visitors completed after office hours.", settings.autoCheckout, () => toggle("autoCheckout")],
          ]}
        />

        <div className="settings-panel">
          <div className="card-header">
            <div>
              <h3>System Profile</h3>
              <p>Default workspace context</p>
            </div>
            <Icons.Settings />
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span>Workspace</span>
              <strong>Head Office</strong>
            </div>
            <div className="detail-row">
              <span>Desk</span>
              <strong>Security Reception</strong>
            </div>
            <div className="detail-row">
              <span>Timezone</span>
              <strong>Asia/Calcutta</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({ icon, title, description, rows }) {
  return (
    <div className="settings-panel">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {icon}
      </div>

      <div className="detail-list">
        {rows.map(([label, helper, checked, onChange]) => (
          <label className="setting-row" key={label}>
            <span>
              <strong>{label}</strong>
              <small>{helper}</small>
            </span>
            <input type="checkbox" checked={checked} onChange={onChange} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default Settings;
