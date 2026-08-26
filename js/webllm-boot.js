(function () {
  function boot() {
    const box = document.getElementById("webllm-status");
    if (box && !box.dataset.booted) {
      box.dataset.booted = "1";
      box.innerHTML = "<div class=\"ai-row\"><select id=\"webllm-model\"><option value=\"Qwen3-0.6B-q4f16_1-MLC\">Qwen3 0.6B</option><option value=\"Qwen2.5-0.5B-Instruct-q4f16_1-MLC\">Qwen2.5 0.5B</option><option value=\"Llama-3.2-1B-Instruct-q4f16_1-MLC\">Llama 3.2 1B</option></select><button class=\"ghost\" type=\"button\" id=\"webllm-load\">Load weights</button></div><div class=\"wllm-bar\"><i id=\"webllm-bar\"></i></div><div id=\"webllm-msg\">Needs Chrome/Edge + WebGPU on HTTPS. First load caches the model.</div>";
    }
    if (!document.querySelector("script[data-fg-webllm]")) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "js/webllm.js";
      s.dataset.fgWebllm = "1";
      document.body.appendChild(s);
    }
    const btn = document.getElementById("webllm-load");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", async function () {
        if (!window.ForgeWebLLM) {
          alert("WebLLM is still importing. Wait a moment.");
          return;
        }
        try {
          await window.ForgeWebLLM.load((document.getElementById("webllm-model") || {}).value);
        } catch (err) {
          console.error(err);
        }
      });
    }
    const provider = document.getElementById("provider");
    if (provider && !provider.dataset.wllm) {
      provider.dataset.wllm = "1";
      provider.addEventListener("change", function () {
        if (provider.value === "webllm" && window.ForgeWebLLM) window.ForgeWebLLM.warmupSelect();
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
