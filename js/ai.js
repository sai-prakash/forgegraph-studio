const AI = {
  provider: "guide",
  history: [],
  system() {
    const g = (typeof Canvas !== "undefined" && Canvas.graph) ? Canvas.graph : { nodes: [], edges: [] };
    const m = Sim.compute(Sim.config, g);
    return KNOWLEDGE + "\nLive: mode=" + Sim.config.mode + " workers=" + Sim.config.workers + " adversary=" + Sim.config.adversary + " harness=" + Sim.config.harness + " engine=" + Sim.config.engine + " quality=" + m.quality.toFixed(1) + " cost=" + m.cost + " nodes=" + g.nodes.length;
  },
  localAnswer(q) {
    const s = q.toLowerCase();
    const graph = (typeof Canvas !== "undefined" && Canvas.graph) ? Canvas.graph : { nodes: [], edges: [] };
    const m = Sim.compute(Sim.config, graph);
    if (/what is forge|forgegraph in one|explain forge|teach me this lesson/.test(s)) {
      return "ForgeGraph is a product-building workflow for coding agents. Three layers: harness (the room), loop (act-check-revise), graph (who runs next). Orchestrator never edits code. Worker writes one slice. Adversary tries to break it. Verifier accepts evidence only. Greenfield: Intake → Spec → Human Gate → Plan → Swarm → Verify. Existing repo: Analyst → Gap Detector → delta backlog, then the same swarm on only those files.";
    }
    if (/recipe|greenfield|new idea|how do i use|started|exist|brown|legacy|repo/.test(s)) {
      const rec = /exist|brown|started|legacy|repo/.test(s) ? RECIPES.existing : RECIPES.greenfield;
      const title = /exist|brown|started|legacy|repo/.test(s) ? "Existing-repo recipe: " : "Greenfield recipe: ";
      return title + rec.map((x, i) => (i + 1) + ". " + x).join(" ");
    }
    if (/adversary|owa|opponent|red team/.test(s)) return GLOSSARY.owa + " " + GLOSSARY.adversary;
    if (/quality|why did|moved|drop|workers/.test(s)) {
      return "Live forecast: quality " + m.quality.toFixed(1) + "% · $" + m.cost + " · " + m.minutes + " min. Workers=" + Sim.config.workers + ", adversary=" + Sim.config.adversary + ". Three specialists usually peak.";
    }
    if (/webllm/.test(s)) return "Pick WebLLM in Guide, click Load weights, wait for the bar to finish. Needs Chrome/Edge + WebGPU on HTTPS. First download is cached in this browser.";
    const hit = Object.keys(GLOSSARY).find((k) => s.includes(k));
    if (hit) return GLOSSARY[hit];
    return "Live graph: " + graph.nodes.length + " nodes. Quality " + m.quality.toFixed(1) + "% · $" + m.cost + ". Ask what ForgeGraph is or request a recipe.";
  },
  async reply(q) {
    this.history.push({ role: "user", content: q });
    if (this.provider === "guide") {
      const a = this.localAnswer(q);
      this.history.push({ role: "assistant", content: a });
      return { text: a, src: "Forge Guide · on-device" };
    }
    if (this.provider === "openrouter") {
      const key = localStorage.getItem("fg_or_key") || "";
      if (!key) throw new Error("Add an OpenRouter key first.");
      const model = document.getElementById("or-model").value;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "HTTP-Referer": location.href, "X-Title": "ForgeGraph Studio" },
        body: JSON.stringify({ model, temperature: 0.4, messages: [{ role: "system", content: this.system() }].concat(this.history.slice(-8)) })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "No response.";
      this.history.push({ role: "assistant", content: text });
      return { text, src: "OpenRouter · " + model };
    }
    if (this.provider === "webllm") {
      const text = await webllmChat(q);
      this.history.push({ role: "assistant", content: text });
      return { text, src: "WebLLM · " + ((window.ForgeWebLLM && window.ForgeWebLLM.modelId) || "in-browser") };
    }
  }
};

function webllmSystem() {
  const g = (typeof Canvas !== "undefined" && Canvas.graph) ? Canvas.graph : { nodes: [], edges: [] };
  const m = Sim.compute(Sim.config, g);
  return "You are Forge Guide running in the browser via WebLLM. ForgeGraph = harness + loop + graph. OWA: Orchestrator never edits; Worker writes one slice; Adversary attacks; Verifier wants evidence. Live: workers=" + Sim.config.workers + " adversary=" + Sim.config.adversary + " harness=" + Sim.config.harness + " engine=" + Sim.config.engine + " quality=" + m.quality.toFixed(1) + ". Under 120 words.";
}

async function webllmChat(q) {
  const api = window.ForgeWebLLM;
  if (!api) throw new Error("WebLLM module is still loading. Wait a second, or click Load weights.");
  const box = document.getElementById("webllm-status");
  if (box && !api.ready) box.textContent = "Preparing in-browser model\u2026";
  const messages = [{ role: "system", content: webllmSystem() }].concat(AI.history.filter((h) => h.role !== "system").slice(-6));
  return api.chat(messages);
}
