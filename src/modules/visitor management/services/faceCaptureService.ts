import { API_BASE_URL } from "./apiConfig";
import { authFetch } from "./authService";
import flowService from "./flowService";

const base64ToBlob = (dataUrl: string, mimeType = "image/jpeg") => {
  const byteString = atob(dataUrl.split(",")[1]);
  const arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
};

const isNetworkError = (err: unknown) => err instanceof TypeError && err.message === "Failed to fetch";

type UploadFacePayload = {
  requestId: string | number;
  imageBase64: string;
  govIdImageBase64?: string;
  pose?: string;
};

type VerifyFacePayload = {
  requestId: string | number;
  imageBase64: string;
  qrCodeData?: string;
  visitorId?: string;
};

type FaceVerificationApiResponse = {
  verified?: boolean;
  matched?: boolean;
  match?: boolean;
  success?: boolean;
  confidence?: number;
  score?: number;
  message?: string;
};

type FaceVerificationResult = {
  verified: boolean;
  confidence?: number;
  message: string;
};

const getVerificationFlag = (data: FaceVerificationApiResponse) => {
  if (typeof data.verified === "boolean") return data.verified;
  if (typeof data.matched === "boolean") return data.matched;
  if (typeof data.match === "boolean") return data.match;
  if (typeof data.success === "boolean") return data.success;
  return false;
};

const normalizeConfidence = (data: FaceVerificationApiResponse) => {
  const raw = typeof data.confidence === "number" ? data.confidence : data.score;
  if (typeof raw !== "number" || Number.isNaN(raw)) return undefined;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
};

const createVerificationFormData = ({ requestId, imageBase64, qrCodeData, visitorId }: VerifyFacePayload) => {
  const formData = new FormData();
  formData.append("requestId", String(requestId));
  formData.append("faceImage", base64ToBlob(imageBase64), "live-face.jpg");
  formData.append("liveFaceImage", base64ToBlob(imageBase64), "live-face.jpg");
  if (qrCodeData) formData.append("qrCodeData", qrCodeData);
  if (visitorId) formData.append("visitorId", visitorId);
  return formData;
};

const faceCaptureService = {
  // POST /api/public/visitor/register-face  (multipart/form-data)
  uploadFace: async ({ requestId, imageBase64, govIdImageBase64, pose }: UploadFacePayload) => {
    const formData = new FormData();
    formData.append("requestId", String(requestId));
    if (pose) formData.append("pose", pose);
    formData.append("faceImage", base64ToBlob(imageBase64), "face.jpg");
    if (govIdImageBase64) {
      formData.append("govIdImage", base64ToBlob(govIdImageBase64), "gov-id.jpg");
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/api/public/visitor/register-face`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Face upload failed (${res.status}): ${text}`);
      }
      // Update localStorage with faceRegistered flag
      flowService.updateVisitor(requestId, { faceRegistered: true, photo: imageBase64 });
      return res.json().catch(() => ({}));
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn("[offline] uploadFace → localStorage");
      // Save photo locally so the flow can continue
      flowService.updateVisitor(requestId, { faceRegistered: true, photo: imageBase64 });
      const current = flowService.getCurrentVisitor();
      if (current && current.id === requestId) {
        flowService.setCurrentVisitor({ ...current, faceRegistered: true, photo: imageBase64 });
      }
      return { success: true, offline: true };
    }
  },

  verifyFace: async (payload: VerifyFacePayload): Promise<FaceVerificationResult> => {
    const endpoints = [
      `${API_BASE_URL}/api/public/visitor/verify-face`,
      `${API_BASE_URL}/api/public/visitor/verify-face-match`,
      `${API_BASE_URL}/api/visitor-requests/${payload.requestId}/verify-face`,
    ];
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const res = await authFetch(endpoint, {
          method: "POST",
          body: createVerificationFormData(payload),
        });

        if (res.status === 404 || res.status === 405) {
          lastError = new Error(`Face verification endpoint unavailable (${res.status}).`);
          continue;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Face verification failed (${res.status}): ${text || "Server rejected the request."}`);
        }

        const data = (await res.json().catch(() => ({}))) as FaceVerificationApiResponse;
        const verified = getVerificationFlag(data);
        const confidence = normalizeConfidence(data);
        const message = data.message || (verified ? "Face verification passed." : "Face did not match the registered profile.");

        if (!verified) {
          throw new Error(message);
        }

        return { verified, confidence, message };
      } catch (error) {
        if (isNetworkError(error)) {
          throw new Error("Face verification service is unavailable. Check-in is blocked until identity is verified.");
        }
        lastError = error instanceof Error ? error : new Error("Face verification failed.");
      }
    }

    throw lastError || new Error("Face verification endpoint is unavailable.");
  },
};

export default faceCaptureService;
