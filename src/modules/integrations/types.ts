export interface MetaIntegrationSettings {
  accessToken: string;
  formId: string;
  verifyToken: string;
  appSecret: string;
}

export interface MetaIntegrationTestResult {
  ok: boolean;
  message: string;
  pageId: string | null;
  pageName: string | null;
  formId: string | null;
  formName: string | null;
}

export interface WhatsappIntegrationSettings {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  appSecret: string;
  templateName: string;
  templateLanguage: string;
  templateUseLeadName: boolean;
  defaultCountryCode: string;
}

export interface WhatsappIntegrationTestResult {
  ok: boolean;
  message: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
}
