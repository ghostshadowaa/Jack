import os
import uuid
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "jack-captures")
ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify(status="ok", storage_configured=bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY))


@app.post("/api/capture")
def save_capture():
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return jsonify(error="O armazenamento ainda não foi configurado pelo administrador."), 503

    if request.form.get("consent") != "yes":
        return jsonify(error="É necessário confirmar o consentimento."), 400

    photo = request.files.get("photo")
    if not photo or photo.mimetype not in ALLOWED_TYPES:
        return jsonify(error="Envie uma imagem JPEG, PNG ou WebP válida."), 400

    data = photo.read()
    if not data or len(data) > 7 * 1024 * 1024:
        return jsonify(error="A imagem está vazia ou excede 7 MB."), 413

    # Render forwards the visitor address in X-Forwarded-For.
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip_address = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "unknown")
    if len(ip_address) > 45:
        ip_address = "unknown"

    capture_id = str(uuid.uuid4())
    extension = ALLOWED_TYPES[photo.mimetype]
    object_path = f"{datetime.now(timezone.utc):%Y/%m}/{capture_id}.{extension}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": photo.mimetype,
        "x-upsert": "false",
    }

    try:
        upload = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{object_path}",
            headers=headers,
            data=data,
            timeout=30,
        )
        upload.raise_for_status()

        record = {
            "id": capture_id,
            "ip_address": ip_address,
            "object_path": object_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        saved = requests.post(
            f"{SUPABASE_URL}/rest/v1/captures",
            headers={**headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
            json=record,
            timeout=20,
        )
        saved.raise_for_status()
    except requests.RequestException:
        # Do not expose storage credentials or upstream error details.
        return jsonify(error="Não foi possível salvar. Tente novamente mais tarde."), 502

    return jsonify(message="Foto enviada com segurança.", capture_id=capture_id), 201


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error="Arquivo muito grande. O limite é 8 MB."), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
