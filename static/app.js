(() => {
  const $ = (id) => document.getElementById(id);
  const consent = $("consent"), startBtn = $("startBtn"), captureBtn = $("captureBtn");
  const retakeBtn = $("retakeBtn"), sendBtn = $("sendBtn"), stopBtn = $("stopBtn");
  const video = $("video"), canvas = $("canvas"), preview = $("preview");
  const placeholder = $("placeholder"), liveTag = $("liveTag"), status = $("status");
  let stream = null, photoBlob = null;

  const show = (el, visible) => { el.hidden = !visible; };
  const say = (message) => { status.textContent = message; };

  consent.addEventListener("change", () => {
    startBtn.disabled = !consent.checked;
    say(consent.checked ? "Consentimento registrado nesta página. A câmera ainda não foi iniciada." : "Marque a caixa para habilitar a câmera.");
  });

  startBtn.addEventListener("click", async () => {
    if (!consent.checked) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      say("A câmera exige HTTPS e um navegador compatível."); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 1600 } }
      });
      video.srcObject = stream;
      await video.play();
      show(placeholder, false); show(video, true); show(liveTag, true);
      show(startBtn, false); show(captureBtn, true); show(stopBtn, true);
      say("Prévia ativa. Nenhuma foto foi enviada.");
    } catch (_error) {
      say("Acesso à câmera negado ou indisponível. Você pode liberar a permissão nas configurações do navegador.");
    }
  });

  captureBtn.addEventListener("click", () => {
    if (!stream || !video.videoWidth) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { say("Não foi possível gerar a foto."); return; }
      photoBlob = blob;
      preview.src = URL.createObjectURL(blob);
      show(video, false); show(liveTag, false); show(preview, true);
      show(captureBtn, false); show(retakeBtn, true); show(sendBtn, true);
      say("Confira sua foto. Ela só será enviada se você tocar em “Confirmar e enviar”.");
    }, "image/jpeg", 0.88);
  });

  retakeBtn.addEventListener("click", () => {
    photoBlob = null;
    show(preview, false); show(video, true); show(liveTag, true);
    show(retakeBtn, false); show(sendBtn, false); show(captureBtn, true);
    say("Prévia ativa. Nenhuma foto foi enviada.");
  });

  sendBtn.addEventListener("click", async () => {
    if (!photoBlob || !consent.checked) return;
    sendBtn.disabled = true; say("Enviando a foto de forma segura…");
    const form = new FormData();
    form.append("photo", photoBlob, "jack-capture.jpg");
    form.append("consent", "yes");
    try {
      const response = await fetch("/api/capture", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha no envio.");
      say("Foto enviada. Registro: " + result.capture_id);
      photoBlob = null;
      stopCamera();
      show(preview, false); show(placeholder, true);
      show(retakeBtn, false); show(sendBtn, false); show(startBtn, true);
      consent.checked = false; startBtn.disabled = true;
    } catch (error) {
      say(error.message || "Não foi possível enviar. Tente novamente.");
    } finally { sendBtn.disabled = false; }
  });

  function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; video.srcObject = null;
    show(video, false); show(liveTag, false); show(stopBtn, false);
  }
  stopBtn.addEventListener("click", () => {
    stopCamera(); photoBlob = null;
    show(preview, false); show(placeholder, true);
    show(captureBtn, false); show(retakeBtn, false); show(sendBtn, false); show(startBtn, true);
    say("Câmera fechada. Nenhuma foto foi enviada.");
  });
  window.addEventListener("pagehide", stopCamera);
})();
