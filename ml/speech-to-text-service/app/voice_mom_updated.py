import hashlib
import json
import logging
import mimetypes
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Callable, TypeVar

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

try:
  from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency at import time
  load_dotenv = None


ROOT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT_DIR.parent
ENV_FILES_LOADED: list[str] = []
if load_dotenv is not None:
  for env_path in (ROOT_DIR / ".env", REPO_ROOT / ".env"):
    if env_path.exists():
      load_dotenv(env_path)
      ENV_FILES_LOADED.append(str(env_path))

logger = logging.getLogger("speech-service")
if not logging.getLogger().handlers:
  logging.basicConfig(level=logging.INFO)


@dataclass
class Settings:
  service_name: str
  host: str
  port: int
  default_model: str
  max_upload_mb: int
  request_timeout_seconds: int
  allowed_extensions: set[str]
  allow_origins: list[str]


def load_settings() -> Settings:
  allowed_extensions = {
      ".aac",
      ".flac",
      ".m4a",
      ".mp3",
      ".mp4",
      ".mpeg",
      ".ogg",
      ".wav",
      ".webm",
  }
  allow_origins = [
      origin.strip()
      for origin in os.getenv("ALLOW_ORIGINS", "*").split(",")
      if origin.strip()
  ] or ["*"]

  return Settings(
      service_name=os.getenv("SERVICE_NAME", "speech-to-text-service"),
      host=os.getenv("HOST", "0.0.0.0"),
      port=int(os.getenv("PORT", "8000")),
      default_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
      max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "25")),
      request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120")),
      allowed_extensions=allowed_extensions,
      allow_origins=allow_origins,
  )


SETTINGS = load_settings()


class HealthResponse(BaseModel):
  status: str
  ready: bool
  provider: str
  configuredModels: list[str]
  activeApiKeys: int
  defaultModel: str


class TranscriptionResponse(BaseModel):
  transcript: str
  summary: str
  remarksSummary: str
  conversationSummary: str
  model: str
  provider: str
  cached: bool = False


class ApiKeyClient:
  def __init__(self, api_key: str, index: int) -> None:
    self.api_key = api_key
    self.index = index
    self.client = genai.Client(api_key=api_key)
    self.failures = 0


@dataclass
class CrmSummaryBundle:
  remarks_summary: str
  conversation_summary: str


T = TypeVar("T")


class GeminiSpeechService:
  def __init__(self, settings: Settings) -> None:
    self.settings = settings
    self.clients: list[ApiKeyClient] = []
    self.cache: dict[str, TranscriptionResponse] = {}
    self._lock = Lock()
    self._round_robin_index = 0
    self._key_source: str | None = None

  def initialize(self) -> None:
    api_keys, source = self._load_api_keys()
    self._key_source = source
    self.clients = [ApiKeyClient(api_key, index) for index, api_key in enumerate(api_keys)]
    self._log_configuration(api_keys, source)

  def is_ready(self) -> bool:
    return bool(self.clients)

  def active_api_keys(self) -> int:
    return len(self.clients)

  def health(self) -> HealthResponse:
    return HealthResponse(
        status="healthy" if self.is_ready() else "degraded",
        ready=self.is_ready(),
        provider="google-genai",
        configuredModels=[self.settings.default_model],
        activeApiKeys=self.active_api_keys(),
        defaultModel=self.settings.default_model,
    )

  def transcribe(self, file_name: str, content_type: str, audio_bytes: bytes, model_name: str) -> TranscriptionResponse:
    if not self.is_ready():
      raise HTTPException(
          status_code=503,
          detail="No Gemini API key configured for the speech service. Set GEMINI_API_KEYS or GEMINI_API_KEY."
      )

    cache_key = self._build_cache_key(file_name, model_name, audio_bytes)
    cached = self.cache.get(cache_key)
    if cached is not None:
      return cached.model_copy(update={"cached": True})

    transcript = self._call_with_rotation(
        lambda client: self._transcribe_with_client(client, audio_bytes, content_type, model_name)
    )
    summaries = self._call_with_rotation(
        lambda client: self._build_crm_summaries(client, transcript, model_name)
    )

    response = TranscriptionResponse(
        transcript=transcript,
        summary=summaries.remarks_summary,
        remarksSummary=summaries.remarks_summary,
        conversationSummary=summaries.conversation_summary,
        model=model_name,
        provider="google-genai",
    )
    self.cache[cache_key] = response
    return response

  def _load_api_keys(self) -> tuple[list[str], str]:
    multiple = os.getenv("GEMINI_API_KEYS", "")
    multi_keys = self._parse_api_keys(multiple)
    if multi_keys:
      return self._dedupe_keys(multi_keys), "GEMINI_API_KEYS"

    single = os.getenv("GEMINI_API_KEY", "").strip()
    if single:
      return [single], "GEMINI_API_KEY"

    return [], "none"

  def _parse_api_keys(self, raw_value: str) -> list[str]:
    return [value.strip() for value in raw_value.split(",") if value.strip()]

  def _dedupe_keys(self, keys: list[str]) -> list[str]:
    deduped: list[str] = []
    for api_key in keys:
      if api_key not in deduped:
        deduped.append(api_key)
    return deduped

  def _log_configuration(self, api_keys: list[str], source: str) -> None:
    env_files = ", ".join(ENV_FILES_LOADED) if ENV_FILES_LOADED else "none"
    logger.info("Speech service env files loaded: %s", env_files)
    logger.info(
        "Speech service config: model=%s max_upload_mb=%s allow_origins=%s",
        self.settings.default_model,
        self.settings.max_upload_mb,
        ",".join(self.settings.allow_origins)
    )
    if api_keys:
      logger.info("Gemini API keys loaded from %s (%d configured).", source, len(api_keys))
    else:
      logger.warning("No Gemini API keys configured. Set GEMINI_API_KEYS or GEMINI_API_KEY.")

  def _build_cache_key(self, file_name: str, model_name: str, audio_bytes: bytes) -> str:
    digest = hashlib.md5(audio_bytes).hexdigest()
    return f"{file_name}:{model_name}:{digest}"

  def _call_with_rotation(self, operation: Callable[[genai.Client], T]) -> T:
    last_error: Exception | None = None

    for _ in range(max(len(self.clients), 1) * 2):
      wrapper = self._next_client()
      try:
        result = operation(wrapper.client)
        if isinstance(result, str):
          if result.strip():
            return result
        elif result is not None:
          return result
      except Exception as exception:  # pragma: no cover - network/provider errors
        wrapper.failures += 1
        last_error = exception

    if last_error is not None:
      raise HTTPException(status_code=502, detail=f"Speech model request failed: {last_error}")
    raise HTTPException(status_code=502, detail="Speech model request failed.")

  def _next_client(self) -> ApiKeyClient:
    with self._lock:
      wrapper = self.clients[self._round_robin_index % len(self.clients)]
      self._round_robin_index += 1
      return wrapper

  def _transcribe_with_client(
      self,
      client: genai.Client,
      audio_bytes: bytes,
      content_type: str,
      model_name: str
  ) -> str:
    prompt = (
        "Transcribe this customer call into English. "
        "If the speakers use another language, translate it into English. "
        "Preserve meaning, use speaker labels when multiple speakers are present, "
        "and return only the transcript with no preamble."
    )
    response = client.models.generate_content(
        model=model_name,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=content_type),
                    types.Part.from_text(text=prompt),
                ],
            )
        ],
    )
    text = getattr(response, "text", "") or ""
    if not text.strip():
      raise ValueError("Empty transcript returned from Gemini.")
    return text.strip()

  def _build_crm_summaries(self, client: genai.Client, transcript: str, model_name: str) -> CrmSummaryBundle:
    prompt = (
        "You are preparing CRM-ready post-call notes for a sales lead. "
        "Return valid JSON only with this exact shape: "
        "{\"remarksSummary\":\"...\",\"conversationSummary\":\"...\"}. "
        "The remarksSummary must be one concise paragraph describing customer intent, pain points, "
        "requirements, objections, budget or timeline if present, and the next follow-up action. "
        "The conversationSummary must be 4 to 8 short bullet-style lines separated by newline characters, "
        "focused on major talking points, buying signals, objections, decision makers, next steps, and commitments. "
        "Do not wrap the JSON in markdown fences.\n\n"
        f"Transcript:\n{transcript}"
    )
    response = client.models.generate_content(model=model_name, contents=prompt)
    text = getattr(response, "text", "") or ""
    parsed = self._parse_crm_summary_json(text, transcript)
    if parsed is not None:
      return parsed
    return CrmSummaryBundle(
        remarks_summary=self._fallback_summary(transcript),
        conversation_summary=self._fallback_highlights(transcript),
    )

  def _parse_crm_summary_json(self, raw_text: str, transcript: str) -> CrmSummaryBundle | None:
    cleaned = raw_text.strip()
    if not cleaned:
      return None

    if cleaned.startswith("```"):
      cleaned = cleaned.strip("`")
      if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].strip()

    try:
      payload = json.loads(cleaned)
    except json.JSONDecodeError:
      return None

    if not isinstance(payload, dict):
      return None

    remarks_summary = str(payload.get("remarksSummary", "")).strip()
    conversation_summary = str(payload.get("conversationSummary", "")).strip()

    if not remarks_summary:
      remarks_summary = self._fallback_summary(transcript)
    if not conversation_summary:
      conversation_summary = self._fallback_highlights(transcript)

    return CrmSummaryBundle(
      remarks_summary=remarks_summary,
      conversation_summary=conversation_summary,
    )

  def _fallback_summary(self, transcript: str) -> str:
    normalized = " ".join(transcript.split())
    if not normalized:
      return ""
    sentences = normalized.split(". ")
    return ". ".join(sentences[:3]).strip()

  def _fallback_highlights(self, transcript: str) -> str:
    normalized = " ".join(transcript.split())
    if not normalized:
      return ""
    snippets = normalized.split(". ")
    highlights = []
    for snippet in snippets[:5]:
      value = snippet.strip()
      if value:
        highlights.append(f"- {value.rstrip('.')}")
    return "\n".join(highlights)


speech_service = GeminiSpeechService(SETTINGS)
executor = ThreadPoolExecutor(max_workers=max((os.cpu_count() or 2), 4))

app = FastAPI(
    title="Fawnix Speech To Text Service",
    version="1.0.0",
    description="Audio transcription and CRM summary service for lead contact recordings.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
  speech_service.initialize()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
  return speech_service.health()


@app.get("/api/health", response_model=HealthResponse)
async def api_health() -> HealthResponse:
  return speech_service.health()


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    model: str | None = Form(default=None)
) -> TranscriptionResponse:
  if file.filename is None or not file.filename.strip():
    raise HTTPException(status_code=400, detail="Uploaded file name is missing.")

  extension = Path(file.filename).suffix.lower()
  if extension and extension not in SETTINGS.allowed_extensions:
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported file type '{extension}'.",
    )

  audio_bytes = await file.read()
  if not audio_bytes:
    raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

  max_bytes = SETTINGS.max_upload_mb * 1024 * 1024
  if len(audio_bytes) > max_bytes:
    raise HTTPException(
        status_code=413,
        detail=f"Uploaded file exceeds the {SETTINGS.max_upload_mb} MB limit.",
    )

  content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "audio/webm"
  selected_model = (model or SETTINGS.default_model).strip() or SETTINGS.default_model

  loop = __import__("asyncio").get_running_loop()
  return await loop.run_in_executor(
      executor,
      lambda: speech_service.transcribe(file.filename, content_type, audio_bytes, selected_model),
  )


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("voice_mom_updated:app", host=SETTINGS.host, port=SETTINGS.port, reload=False)
