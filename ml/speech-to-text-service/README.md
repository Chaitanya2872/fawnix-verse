# Speech-To-Text Service

This is the Python speech-to-text service that powers lead contact recording
transcription for CRM.

Suggested structure:

```text
ml/speech-to-text-service/
  app/
    main.py
    api/
    services/
  models/
    README.md
    <your local model weights or mount points>
  requirements.txt
  Dockerfile
```

Recommended usage:

- Put the Python API code under `ml/speech-to-text-service/app/`
- Put local model files or model mount targets under `ml/speech-to-text-service/models/`
- Expose the transcription endpoint from this service and point CRM to it with:
  - `CRM_SPEECH_TO_TEXT_URL`
  - `CRM_SPEECH_TO_TEXT_MODEL`
- The current service entrypoint is `app/voice_mom_updated.py`
- Copy `.env.example` to `.env` for standalone local runs

If you later containerize this service in Compose, a clean internal URL would be:

`http://speech-to-text-service:8000/transcribe`

For local development outside Docker, a typical URL would be:

`http://host.docker.internal:8000/transcribe`

Current API contract:

- `GET /health`
- `GET /api/health`
- `POST /transcribe`

`POST /transcribe` expects multipart form data:

- `file`: audio file
- `model`: optional model override

Response shape:

```json
{
  "transcript": "Speaker 1: ...",
  "summary": "Short CRM summary...",
  "remarksSummary": "Short CRM summary...",
  "conversationSummary": "- Point 1\n- Point 2",
  "model": "gemini-2.5-flash",
  "provider": "google-genai",
  "cached": false
}
```
