import { API_BASE_URL } from "./apiConfig";
import { authFetch } from "./authService";
import flowService from "./flowService";

const base64ToBlob = (dataUrl, mimeType = "image/jpeg") => {
  const byteString = atob(dataUrl.split(",")[1]);
  const arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
};

const isNetworkError = (err) => err instanceof TypeError && err.message === "Failed to fetch";

type UploadFacePayload = {
  requestId: string | number;
  imageBase64: string;
  govIdImageBase64?: string;
  pose?: string;
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
};

export default faceCaptureService;
