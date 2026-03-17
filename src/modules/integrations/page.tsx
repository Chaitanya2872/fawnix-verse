import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/modules/auth/hooks";
import { hasStoredSession } from "@/services/api-client";
import {
  useMetaIntegrationSettings,
  useTestMetaIntegration,
  useTestWhatsappIntegration,
  useUpdateMetaIntegrationSettings,
  useUpdateWhatsappIntegrationSettings,
  useWhatsappIntegrationSettings,
} from "./hooks";
import type {
  MetaIntegrationSettings,
  WhatsappIntegrationSettings,
} from "./types";

const EMPTY_META_FORM: MetaIntegrationSettings = {
  accessToken: "",
  formId: "",
  verifyToken: "",
  appSecret: "",
};

const EMPTY_WHATSAPP_FORM: WhatsappIntegrationSettings = {
  accessToken: "",
  phoneNumberId: "",
  businessAccountId: "",
  verifyToken: "",
  appSecret: "",
  templateName: "fawnix_lead_intro",
  templateLanguage: "en_US",
  templateUseLeadName: false,
  defaultCountryCode: "",
};

export default function IntegrationsPage() {
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const isAdmin =
    currentUser?.roles?.includes("ROLE_ADMIN") ||
    currentUser?.roles?.includes("ROLE_SALES_MANAGER");

  const metaSettingsQuery = useMetaIntegrationSettings({ enabled: Boolean(isAdmin) });
  const whatsappSettingsQuery = useWhatsappIntegrationSettings({ enabled: Boolean(isAdmin) });
  const updateMetaMutation = useUpdateMetaIntegrationSettings();
  const updateWhatsappMutation = useUpdateWhatsappIntegrationSettings();
  const testMetaMutation = useTestMetaIntegration();
  const testWhatsappMutation = useTestWhatsappIntegration();

  const [metaFormState, setMetaFormState] =
    useState<MetaIntegrationSettings>(EMPTY_META_FORM);
  const [whatsappFormState, setWhatsappFormState] =
    useState<WhatsappIntegrationSettings>(EMPTY_WHATSAPP_FORM);
  const [metaStatusMessage, setMetaStatusMessage] = useState<string | null>(null);
  const [whatsappStatusMessage, setWhatsappStatusMessage] = useState<string | null>(null);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showWhatsappSecret, setShowWhatsappSecret] = useState(false);
  const [metaTestMessage, setMetaTestMessage] = useState<string | null>(null);
  const [whatsappTestMessage, setWhatsappTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (metaSettingsQuery.data) {
      setMetaFormState(metaSettingsQuery.data);
    }
  }, [metaSettingsQuery.data]);

  useEffect(() => {
    if (whatsappSettingsQuery.data) {
      setWhatsappFormState(whatsappSettingsQuery.data);
    }
  }, [whatsappSettingsQuery.data]);

  const handleMetaChange = (field: keyof MetaIntegrationSettings, value: string) => {
    setMetaFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleWhatsappChange = (
    field: keyof WhatsappIntegrationSettings,
    value: string | boolean
  ) => {
    setWhatsappFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleMetaSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMetaStatusMessage(null);

    updateMetaMutation.mutate(metaFormState, {
      onSuccess: () => setMetaStatusMessage("Meta settings saved successfully."),
      onError: (error) =>
        setMetaStatusMessage(
          error instanceof Error ? error.message : "Failed to update Meta settings."
        ),
    });
  };

  const handleWhatsappSubmit = (event: FormEvent) => {
    event.preventDefault();
    setWhatsappStatusMessage(null);

    updateWhatsappMutation.mutate(whatsappFormState, {
      onSuccess: () =>
        setWhatsappStatusMessage("WhatsApp settings saved successfully."),
      onError: (error) =>
        setWhatsappStatusMessage(
          error instanceof Error
            ? error.message
            : "Failed to update WhatsApp settings."
        ),
    });
  };

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            You need admin access to manage integrations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Integrations
        </h1>
        <p className="text-sm text-slate-500">
          Manage your Meta lead ads connection and capture settings.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Meta Lead Ads</CardTitle>
          <CardDescription>
            Provide your Meta Page access token and the form ID you want to
            capture leads from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMetaSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="meta-access-token">Page Access Token</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="meta-access-token"
                  type={showMetaToken ? "text" : "password"}
                  value={metaFormState.accessToken}
                  onChange={(event) =>
                    handleMetaChange("accessToken", event.target.value)
                  }
                  placeholder="EAAG..."
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMetaToken((prev) => !prev)}
                >
                  {showMetaToken ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                We store this securely in your CRM database for webhook lead
                fetches.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meta-form-id">Lead Form ID</Label>
              <Input
                id="meta-form-id"
                value={metaFormState.formId}
                onChange={(event) =>
                  handleMetaChange("formId", event.target.value)
                }
                placeholder="123456789012345"
              />
              <p className="text-xs text-slate-500">
                Only leads from this form will be accepted when set.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meta-verify-token">Webhook Verify Token</Label>
              <Input
                id="meta-verify-token"
                value={metaFormState.verifyToken}
                onChange={(event) =>
                  handleMetaChange("verifyToken", event.target.value)
                }
                placeholder="your-verify-token"
              />
              <p className="text-xs text-slate-500">
                Used to verify Meta webhook subscription.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meta-app-secret">App Secret</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="meta-app-secret"
                  type={showMetaSecret ? "text" : "password"}
                  value={metaFormState.appSecret}
                  onChange={(event) =>
                    handleMetaChange("appSecret", event.target.value)
                  }
                  placeholder="app-secret"
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMetaSecret((prev) => !prev)}
                >
                  {showMetaSecret ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Used to validate webhook signatures.
              </p>
            </div>

            {metaStatusMessage ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {metaStatusMessage}
              </div>
            ) : null}

            {metaTestMessage ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {metaTestMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={updateMetaMutation.isPending}>
                {updateMetaMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={testMetaMutation.isPending}
                onClick={() => {
                  setMetaTestMessage(null);
                  testMetaMutation.mutate(undefined, {
                    onSuccess: (data) => {
                      const summary = data.ok
                        ? `Connected ${data.pageName ?? ""}`.trim()
                        : data.message;
                      setMetaTestMessage(summary);
                    },
                    onError: (error) => {
                      setMetaTestMessage(
                        error instanceof Error
                          ? error.message
                          : "Meta connection test failed."
                      );
                    },
                  });
                }}
              >
                {testMetaMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              {metaSettingsQuery.isLoading ? (
                <span className="text-xs text-slate-400">Loading...</span>
              ) : null}
              {metaSettingsQuery.isError ? (
                <span className="text-xs text-red-600">
                  Failed to load settings.
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>WhatsApp Cloud API</CardTitle>
          <CardDescription>
            Manage WhatsApp credentials and template settings for automated
            follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWhatsappSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="wa-access-token">Access Token</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="wa-access-token"
                  type={showWhatsappToken ? "text" : "password"}
                  value={whatsappFormState.accessToken}
                  onChange={(event) =>
                    handleWhatsappChange("accessToken", event.target.value)
                  }
                  placeholder="EAAG..."
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWhatsappToken((prev) => !prev)}
                >
                  {showWhatsappToken ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wa-phone-number-id">Phone Number ID</Label>
                <Input
                  id="wa-phone-number-id"
                  value={whatsappFormState.phoneNumberId}
                  onChange={(event) =>
                    handleWhatsappChange("phoneNumberId", event.target.value)
                  }
                  placeholder="1234567890"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wa-business-id">Business Account ID</Label>
                <Input
                  id="wa-business-id"
                  value={whatsappFormState.businessAccountId}
                  onChange={(event) =>
                    handleWhatsappChange("businessAccountId", event.target.value)
                  }
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wa-verify-token">Webhook Verify Token</Label>
                <Input
                  id="wa-verify-token"
                  value={whatsappFormState.verifyToken}
                  onChange={(event) =>
                    handleWhatsappChange("verifyToken", event.target.value)
                  }
                  placeholder="verify-token"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wa-app-secret">App Secret</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="wa-app-secret"
                    type={showWhatsappSecret ? "text" : "password"}
                    value={whatsappFormState.appSecret}
                    onChange={(event) =>
                      handleWhatsappChange("appSecret", event.target.value)
                    }
                    placeholder="app-secret"
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWhatsappSecret((prev) => !prev)}
                  >
                    {showWhatsappSecret ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wa-template-name">Template Name</Label>
                <Input
                  id="wa-template-name"
                  value={whatsappFormState.templateName}
                  onChange={(event) =>
                    handleWhatsappChange("templateName", event.target.value)
                  }
                  placeholder="fawnix_lead_intro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wa-template-language">Template Language</Label>
                <Input
                  id="wa-template-language"
                  value={whatsappFormState.templateLanguage}
                  onChange={(event) =>
                    handleWhatsappChange("templateLanguage", event.target.value)
                  }
                  placeholder="en_US"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wa-default-country-code">
                  Default Country Code
                </Label>
                <Input
                  id="wa-default-country-code"
                  value={whatsappFormState.defaultCountryCode}
                  onChange={(event) =>
                    handleWhatsappChange("defaultCountryCode", event.target.value)
                  }
                  placeholder="91"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="wa-use-lead-name"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={whatsappFormState.templateUseLeadName}
                  onChange={(event) =>
                    handleWhatsappChange(
                      "templateUseLeadName",
                      event.target.checked
                    )
                  }
                />
                <Label htmlFor="wa-use-lead-name" className="text-sm">
                  Use lead name in template body
                </Label>
              </div>
            </div>

            {whatsappStatusMessage ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {whatsappStatusMessage}
              </div>
            ) : null}

            {whatsappTestMessage ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {whatsappTestMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={updateWhatsappMutation.isPending}>
                {updateWhatsappMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={testWhatsappMutation.isPending}
                onClick={() => {
                  setWhatsappTestMessage(null);
                  testWhatsappMutation.mutate(undefined, {
                    onSuccess: (data) => {
                      const summary = data.ok
                        ? `Connected ${data.verifiedName ?? ""}`.trim()
                        : data.message;
                      setWhatsappTestMessage(summary);
                    },
                    onError: (error) => {
                      setWhatsappTestMessage(
                        error instanceof Error
                          ? error.message
                          : "WhatsApp connection test failed."
                      );
                    },
                  });
                }}
              >
                {testWhatsappMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              {whatsappSettingsQuery.isLoading ? (
                <span className="text-xs text-slate-400">Loading...</span>
              ) : null}
              {whatsappSettingsQuery.isError ? (
                <span className="text-xs text-red-600">
                  Failed to load settings.
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
