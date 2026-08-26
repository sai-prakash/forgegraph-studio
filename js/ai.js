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
      return "ForgeGraph is a product-building workflow for coding agents. Three layers: harness (the room), loop (act-check-revise), graph (who runs next). Orchestrator never edits code. Worker writes one slice. Adversary tries to break it. Verifier accepts evidence only. Greenfield: Intake → Spec → Human Gate → Plan → Swarm → Verify. Existing repo: Analyst → Gap Detector → delta backlog, then the same swarm on only those files. Open Academy, then Studio.";
    }
    if (/recipe|greenfield|new idea|how do i use|started|exist|brown|legacy|repo/.test(s)) {
      const rec = /exist|brown|started|legacy|repo/.test(s) ? RECIPES.existing : RECIPES.greenfield;
      const title = /exist|brown|started|legacy|repo/.test(s) ? "Existing-repo recipe: " : "Greenfield recipe: ";
      return title + rec.map((x, i) => (i + 1) + ". " + x).join(" ");
    }
    if (/adversary|owa|opponent|red team/.test(s)) {
      return GLOSSARY.owa + " " + GLOSSARY.adversary + " Load OWA Fast Path in Studio and press Simulate.";
    }
    if (/quality|why did|moved|drop|workers/.test(s)) {
      return "Live forecast: quality " + m.quality.toFixed(1) + "% · $" + m.cost + " · " + m.minutes + " min · fail " + m.fail + "%. Workers=" + Sim.config.workers + ", adversary=" + Sim.config.adversary + ", harness=" + Sim.config.harness + "%. Three specialists usually peak. Past five, coordination tax wins.";
    }
    if (/cost|cheap|token/.test(s)) {
      return "Forecast $" + m.cost + " and ~" + m.tokens.toLocaleString() + " tokens. Mixed tier + prune + block-level verify is the cheap high-quality combo.";
    }
    if (/harness|loop|langgraph|workflow/.test(s)) {
      return GLOSSARY.harness + " " + GLOSSARY.loop + " " + GLOSSARY.graph + " Engine knob is " + Sim.config.engine + ".";
    }
    if (/connect|drag|design|wire|edge/.test(s)) {
      return "Drag a role onto the canvas. Amber port is output. Wire output to another node. An edge is a contract: downstream starts when the upstream artifact exists.";
    }
    if (/webllm|openrouter|key|model/.test(s)) {
      return "Guide mode is free, local, and already sees your graph. OpenRouter: paste a key. WebLLM downloads weights into this browser.";
    }
    const hit = Object.keys(GLOSSARY).find((k) => s.includes(k));
    if (hit) return GLOSSARY[hit];
    return "Live graph: " + graph.nodes.length + " nodes. Quality " + m.quality.toFixed(1) + "% · $" + m.cost + " · " + m.minutes + " min. Ask what ForgeGraph is, request a recipe, or tap a chip.";
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
      if (!key) throw new Error("Add an OpenRouter key first. It stays in localStorage only.");
      const model = document.getElementById("or-model").value;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "HTTP-Referer": location.href, "X-Title": "ForgeGraph Studio" },
        body: JSON.stringify({ model, temperature: 0.4, messages: [{ role: "system", content: this.system() }, ...this.history.slice(-8)] })
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
      return { text, src: "WebLLM · in-browser" };
    }
  }
};
let webllmEngine = null;
async function webllmChat(q) {
  const box = document.getElementById("webllm-status");
  box.textContent = "Loading WebLLM…";
  const webllm = await import("https://esm.run/@mlc-ai/web-llm");
  if (!webllmEngine) {
    webllmEngine = await webllm.CreateMLCEngine("Qwen2.5-0.5B-Instruct-q4f16_1-MLC", {
      initProgressCallback: (p) => { box.textContent = p.text || "loading weights"; }
    });
  }
  box.textContent = "WebLLM ready · offline";
  const out = await webllmEngine.chat.completions.create({
    messages: [{ role: "system", content: AI.system() }, { role: "user", content: q }]
  });
  return out.choices[0].message.content;
}
