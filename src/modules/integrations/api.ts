import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type {
  MetaIntegrationSettings,
  MetaIntegrationTestResult,
  WhatsappIntegrationSettings,
  WhatsappIntegrationTestResult,
} from "./types";

function rethrowApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchMetaIntegrationSettings(): Promise<MetaIntegrationSettings> {
  try {
    await ensureApiSession();
    const response = await api.get<MetaIntegrationSettings>(
      "/integrations/meta/settings"
    );
    return response.data ?? {
      accessToken: "",
      formId: "",
      verifyToken: "",
      appSecret: "",
    };
  } catch (error) {
    rethrowApiError(error, "Failed to load Meta integration settings.");
  }
}

export async function updateMetaIntegrationSettings(
  input: MetaIntegrationSettings
): Promise<MetaIntegrationSettings> {
  try {
    await ensureApiSession();
    const response = await api.put<MetaIntegrationSettings>(
      "/integrations/meta/settings",
      input
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update Meta integration settings.");
  }
}

export async function testMetaIntegration(): Promise<MetaIntegrationTestResult> {
  try {
    await ensureApiSession();
    const response = await api.post<MetaIntegrationTestResult>(
      "/integrations/meta/settings/test"
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to test Meta integration.");
  }
}

export async function fetchWhatsappIntegrationSettings(): Promise<WhatsappIntegrationSettings> {
  try {
    await ensureApiSession();
    const response = await api.get<WhatsappIntegrationSettings>(
      "/integrations/whatsapp/settings"
    );
    return response.data ?? {
      accessToken: "",
      phoneNumberId: "",
      businessAccountId: "",
      verifyToken: "",
      appSecret: "",
      templateName: "",
      templateLanguage: "",
      templateUseLeadName: false,
      defaultCountryCode: "",
    };
  } catch (error) {
    rethrowApiError(error, "Failed to load WhatsApp integration settings.");
  }
}

export async function updateWhatsappIntegrationSettings(
  input: WhatsappIntegrationSettings
): Promise<WhatsappIntegrationSettings> {
  try {
    await ensureApiSession();
    const response = await api.put<WhatsappIntegrationSettings>(
      "/integrations/whatsapp/settings",
      input
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update WhatsApp integration settings.");
  }
}

export async function testWhatsappIntegration(): Promise<WhatsappIntegrationTestResult> {
  try {
    await ensureApiSession();
    const response = await api.post<WhatsappIntegrationTestResult>(
      "/integrations/whatsapp/settings/test"
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to test WhatsApp integration.");
  }
}
