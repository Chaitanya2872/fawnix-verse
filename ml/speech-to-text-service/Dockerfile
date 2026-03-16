FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY ml/speech-to-text-service/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY ml/speech-to-text-service /app

EXPOSE 8000

CMD ["uvicorn", "app.voice_mom_updated:app", "--host", "0.0.0.0", "--port", "8000"]
