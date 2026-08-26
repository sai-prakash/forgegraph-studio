const AI = {
  provider: "guide",
  history: [],

  system() {
    const m = Sim.compute(Sim.config, Canvas.graph);
    return `${KNOWLEDGE}

Current studio state:
mode=${Sim.config.mode}
workers=${Sim.config.workers}
adversary=${Sim.config.adversary}
parallelism=${Sim.config.parallelism}
harness=${Sim.config.harness}
engine=${Sim.config.engine}
tier=${Sim.config.tier}
hitl=${Sim.config.hitl}
prune=${Sim.config.prune}
blockVerify=${Sim.config.blockVerify}
complexity=${Sim.config.complexity}
nodes=${Canvas.graph.nodes.length}
edges=${Canvas.graph.edges.length}
forecast quality=${m.quality.toFixed(1)} cost=$${m.cost} minutes=${m.minutes} fail=${m.fail}% tokens=${m.tokens} engineSpeedup=${m.speedup}x

You are Forge Guide inside an interactive studio. Be concrete. When the user changes knobs, explain causal effects. Suggest graph edits they can drag. Keep answers under 180 words unless asked for a deep dive.`;
  },

  localAnswer(q) {
    const s = q.toLowerCase();
    const m = Sim.compute(Sim.config, Canvas.graph);
    if (/quality|better|best/.test(s)) {
      return `Quality is currently ${m.quality.toFixed(1)}%. The biggest levers from here: turn Adversary ${Sim.config.adversary ? "is already on — good" : "ON — expect ~+12 points"}, keep workers at 3 (you have ${Sim.config.workers}), and raise harness toward 80+. Adding a 6th or 7th worker usually hurts because coordination tax beats specialization.`;
    }
    if (/cost|cheap|token/.test(s)) {
      return `Forecast $${m.cost} and ~${m.tokens.toLocaleString()} tokens. Mixed tier + context prune + block-level verify is the cheap high-quality combo. GraphWorkflow cuts orchestration time (shown as ${m.speedup}× vs a naive loop) more than it cuts model tokens. Frontier models buy quality, not speed of the graph engine.`;
    }
    if (/exist|brown|review|legacy|started/.test(s)) {
      return `For an already-started product, keep Analyst + Gap Detector on the left of Intake. They emit a delta backlog. Do not let Workers touch files outside that backlog. Load the ForgeGraph preset, set Mode → Existing, then simulate — quality dips slightly because of unknown debt, which is honest.`;
    }
    if (/owa|adversary|opponent/.test(s)) {
      return `OWA: Orchestrator never edits. Worker writes one slice. Adversary writes the test that should fail if the slice is sloppy. Verifier runs once per block, not per file. Load the OWA Fast Path preset and press Simulate to watch the loop.`;
    }
    if (/graph|langgraph|workflow|loop/.test(s)) {
      return `Use a single loop for a one-context task. Use LangGraph when you need cycles, HITL, and crash-resume. Use GraphWorkflow when the DAG is static and you will run it many times — compile once, execute cheap. Your engine is set to ${Sim.config.engine}.`;
    }
    if (/connect|drag|custom|design/.test(s)) {
      return `Drag a role from the left palette onto the canvas. Click the amber output port, then drop on another node to wire an edge. Move nodes freely. Delete removes the selected node. Export JSON saves your custom graph. The simulator walks a topological wavefront using your parallelism knob.`;
    }
    if (/webllm|openrouter|key|model/.test(s)) {
      return `Guide mode is free and local. For a live LLM: pick OpenRouter, paste a key (stored only in this browser), and choose a free model such as Llama 3.1 8B Instruct free. WebLLM downloads a small model into the browser — first load is heavy, then it runs offline.`;
    }
    return `Forecast on this graph: quality ${m.quality.toFixed(1)}% · $${m.cost} · ${m.minutes} min · fail ${m.fail}%. Try: toggle Adversary, slide workers from 1→3→7 and watch the metric cards, or load OWA vs ForgeGraph and Simulate both. Ask me why a number moved.`;
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
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "HTTP-Referer": location.href,
          "X-Title": "ForgeGraph Studio"
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            { role: "system", content: this.system() },
            ...this.history.slice(-8)
          ]
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "No response.";
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
    messages: [
      { role: "system", content: AI.system() },
      { role: "user", content: q }
    ]
  });
  return out.choices[0].message.content;
}
