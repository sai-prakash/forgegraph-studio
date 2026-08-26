const CDNS = [
  "https://esm.run/@mlc-ai/web-llm@0.2.83",
  "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.83/+esm"
];
const PREFERRED = [
  "Qwen3-0.6B-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC"
];

const ForgeWebLLM = {
  lib: null, engine: null, ready: false, loading: false, modelId: "", lastError: "",
  gpuOk() { return typeof navigator !== "undefined" && !!navigator.gpu; },
  secureOk() { return window.isSecureContext; },
  setStatus(text, pct) {
    const box = document.getElementById("webllm-msg") || document.getElementById("webllm-status");
    const bar = document.getElementById("webllm-bar");
    if (box) box.textContent = text;
    if (bar && typeof pct === "number") bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    const note = document.getElementById("status-note");
    if (note) note.textContent = text;
  },
  async importLib() {
    if (this.lib) return this.lib;
    let last;
    for (const url of CDNS) {
      try {
        this.setStatus("Importing WebLLM from " + url.split("/")[2] + "\u2026", 2);
        this.lib = await import(url);
        return this.lib;
      } catch (err) { last = err; }
    }
    throw last || new Error("Could not import @mlc-ai/web-llm from CDN.");
  },
  listModels() { return (this.lib && this.lib.prebuiltAppConfig && this.lib.prebuiltAppConfig.model_list) || []; },
  pickModel(requested) {
    const ids = this.listModels().map((m) => m.model_id);
    if (requested && ids.includes(requested)) return requested;
    for (const id of PREFERRED) if (ids.includes(id)) return id;
    const low = this.listModels().find((m) => m.low_resource_required);
    return (low && low.model_id) || ids[0] || PREFERRED[1];
  },
  fillSelect() {
    const sel = document.getElementById("webllm-model");
    if (!sel) return;
    const list = this.listModels();
    const small = list.filter((m) => m.low_resource_required || (m.vram_required_MB && m.vram_required_MB < 2500)).slice(0, 8);
    const use = small.length ? small : list.slice(0, 6);
    if (!use.length) return;
    const current = sel.value;
    sel.innerHTML = use.map((m) => {
      const gb = m.vram_required_MB ? (m.vram_required_MB / 1024).toFixed(1) + " GB" : "small";
      return "<option value=\"" + m.model_id + "\">" + m.model_id.replace(/-MLC$/, "") + " \u00b7 " + gb + "</option>";
    }).join("");
    if ([...sel.options].some((o) => o.value === current)) sel.value = current;
  },
  async warmupSelect() {
    try {
      await this.importLib();
      this.fillSelect();
      if (!this.gpuOk()) this.setStatus("No WebGPU. Use Chrome or Edge 113+ on HTTPS.", 0);
      else if (!this.secureOk()) this.setStatus("WebGPU needs HTTPS or localhost.", 0);
      else this.setStatus("Library ready. Click Load weights (one-time download, then cached).", 0);
    } catch (err) {
      this.setStatus("Could not load WebLLM library: " + (err.message || err), 0);
    }
  },
  async load(requested) {
    if (this.loading) return;
    if (!this.secureOk()) throw new Error("WebLLM needs HTTPS or localhost.");
    if (!this.gpuOk()) throw new Error("No WebGPU. Use Chrome or Edge 113+.");
    this.loading = true; this.ready = false; this.lastError = "";
    try {
      const lib = await this.importLib();
      this.fillSelect();
      const id = this.pickModel(requested || (document.getElementById("webllm-model") || {}).value);
      this.modelId = id;
      this.setStatus("Downloading " + id + "\u2026", 3);
      if (this.engine && this.engine.unload) { try { await this.engine.unload(); } catch (_) {} }
      this.engine = await lib.CreateMLCEngine(id, {
        initProgressCallback: (p) => {
          const pct = Math.round((p.progress || 0) * 100);
          this.setStatus((p.text || "Loading") + " \u00b7 " + pct + "%", pct);
        }
      });
      this.ready = true;
      this.setStatus("Ready \u00b7 " + id + " \u00b7 offline in this tab", 100);
    } catch (err) {
      this.lastError = String(err && err.message ? err.message : err);
      this.setStatus("WebLLM failed: " + this.lastError, 0);
      throw err;
    } finally { this.loading = false; }
  },
  async chat(messages) {
    if (!this.engine) await this.load();
    const out = await this.engine.chat.completions.create({ messages, temperature: 0.4, max_tokens: 260 });
    const text = out && out.choices && out.choices[0] && out.choices[0].message ? out.choices[0].message.content : "";
    if (!text) throw new Error("WebLLM returned an empty completion.");
    return text;
  }
};

window.ForgeWebLLM = ForgeWebLLM;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => ForgeWebLLM.warmupSelect());
else ForgeWebLLM.warmupSelect();
