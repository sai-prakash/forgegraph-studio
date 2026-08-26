function $(id) { return document.getElementById(id); }
const App = { view: "land", lesson: 0 };

function showView(name) {
  App.view = name;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("on"));
  $("view-" + name).classList.add("on");
  document.querySelectorAll("#nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  $("studio-actions").style.display = name === "studio" ? "flex" : "none";
  if (name === "studio") {
    requestAnimationFrame(() => {
      if (!Canvas.graph.nodes.length) Canvas.loadPreset("forge");
      else renderGraph();
      bumpMetrics("opened studio");
    });
  }
  if (name === "guide") $("q").focus();
}

function bumpMetrics(reason) {
  const prev = Sim.lastMetrics;
  const m = Sim.compute(Sim.config, Canvas.graph || { nodes: [] });
  const delta = Sim.explainDelta(prev, m, reason);
  Sim.lastMetrics = m;
  if ($("m-quality")) {
    $("m-quality").textContent = m.quality.toFixed(1);
    $("m-cost").textContent = "$" + m.cost;
    $("m-time").textContent = m.minutes;
    $("m-fail").textContent = m.fail + "%";
    $("m-quality-d").textContent = "solo baseline 50 · Δ " + (m.quality - 50).toFixed(1);
    $("m-cost-d").textContent = Sim.config.tier + " · " + Sim.config.engine;
    $("m-time-d").textContent = m.speedup + "× engine factor";
    $("m-fail-d").textContent = Sim.config.adversary ? "adversary armed" : "no red team";
  }
  if ($("why-bar")) $("why-bar").textContent = humanWhy(reason, prev, m);
  if ($("status-note")) $("status-note").textContent = delta;
  Sim.log(stamp(Sim.tick), "info", delta);
}

function humanWhy(reason, prev, next) {
  if (!prev) return "Forecast loaded from the current graph and knobs. Quality is a teaching model, not a certificate.";
  const bits = [];
  const dq = next.quality - prev.quality;
  const dc = next.cost - prev.cost;
  const dt = next.minutes - prev.minutes;
  if (Math.abs(dq) >= 0.3) bits.push("quality " + (dq > 0 ? "rose" : "fell") + " " + Math.abs(dq).toFixed(1));
  if (Math.abs(dc) >= 0.05) bits.push("cost " + (dc > 0 ? "up" : "down") + " $" + Math.abs(dc).toFixed(2));
  if (Math.abs(dt) >= 0.3) bits.push("time " + (dt > 0 ? "slower" : "faster") + " " + Math.abs(dt).toFixed(1) + "m");
  const hint = {
    workers: "Three specialists usually peak. Past five, coordination tax wins.",
    adversary: "Adversary on means nobody grades their own homework.",
    harness: "The room around the model often beats a model swap.",
    engine: "GraphWorkflow is cheap on static DAGs. LangGraph is the durable HITL engine.",
    "model tier": "Frontier buys quality. Mixed is the usual bargain.",
    "intake mode": "Existing mode prices in unknown debt.",
    prune: "Prune drops tokens that are not about this slice.",
    blockVerify: "Verify once per block, not per file.",
    hitl: "A human gate before workers spend expensive tokens."
  }[reason] || "The graph and the knobs moved together.";
  return (bits.join(" · ") || "No material change") + " — " + hint;
}

function renderLog() {
  if (!$("log")) return;
  $("log").innerHTML = Sim.events.map((e) =>
    "<div class=\"ev\"><span class=\"t\">" + e.t + "</span><span class=\"" + e.kind + "\">" + e.msg + "</span></div>"
  ).join("");
}
window.renderLog = renderLog;
window.renderGraph = renderGraph;
window.bumpMetrics = bumpMetrics;
window.narrate = narrate;

function narrate(kind, title, body) {
  if (!$("narrator")) return;
  $("nar-k").textContent = kind;
  $("nar-t").textContent = title;
  $("nar-p").textContent = body;
}

function bindPalette() {
  document.querySelectorAll(".chip[draggable]").forEach((chip) => {
    chip.addEventListener("dragstart", (ev) => ev.dataTransfer.setData("text/role", chip.dataset.type));
  });
}

function bindControls() {
  ["workers", "parallelism", "harness", "complexity"].forEach((id) => {
    $(id).addEventListener("input", () => {
      Sim.config[id] = +$(id).value;
      $(id + "-v").textContent = $(id).value + (id === "harness" ? "%" : "");
      bumpMetrics(id);
    });
  });
  $("engine").addEventListener("change", () => { Sim.config.engine = $("engine").value; bumpMetrics("engine"); });
  $("tier").addEventListener("change", () => { Sim.config.tier = $("tier").value; bumpMetrics("model tier"); });
  $("mode").addEventListener("change", () => { Sim.config.mode = $("mode").value; bumpMetrics("intake mode"); });
  [["adv", "adversary"], ["hitl", "hitl"], ["prune", "prune"], ["bver", "blockVerify"]].forEach(([id, key]) => {
    $(id).addEventListener("click", () => {
      Sim.config[key] = !Sim.config[key];
      $(id).classList.toggle("on", Sim.config[key]);
      bumpMetrics(key);
      if (key === "adversary" && $("ms3")) $("ms3").checked = true;
    });
  });
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      Canvas.loadPreset(btn.dataset.preset);
      if (btn.dataset.preset === "forge" && $("ms1")) $("ms1").checked = true;
    });
  });
  $("play").addEventListener("click", () => { Sim.start(Canvas.graph); if ($("ms2")) $("ms2").checked = true; });
  $("stop").addEventListener("click", () => Sim.stop());
  $("reset").addEventListener("click", () => { Sim.stop(); Sim.reset(Canvas.graph); renderGraph(); narrate("Idle", "Rewound", "Graph compiled again. Press Simulate."); });
  $("faster").addEventListener("click", () => { Sim.speed = Math.min(4, Sim.speed + 0.5); $("speed").textContent = Sim.speed.toFixed(1) + "×"; });
  $("slower").addEventListener("click", () => { Sim.speed = Math.max(0.5, Sim.speed - 0.5); $("speed").textContent = Sim.speed.toFixed(1) + "×"; });
  $("del").addEventListener("click", () => Canvas.removeSelected());
  $("fit").addEventListener("click", () => { Canvas.fit(); renderGraph(); });
  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ config: Sim.config, graph: Canvas.graph }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "forgegraph-workflow.json"; a.click();
  });
  $("import").addEventListener("change", async (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const data = JSON.parse(await file.text());
    if (data.config) Object.assign(Sim.config, data.config);
    if (data.graph) Canvas.graph = data.graph;
    syncControls(); renderGraph(); bumpMetrics("imported graph");
  });
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.remove("on"));
      document.querySelectorAll("#view-studio .panel").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      const id = b.dataset.panel === "chat" ? "chat-side" : b.dataset.panel;
      $(id).classList.add("on");
    });
  });
  $("ask").addEventListener("click", () => sendChat());
  $("q").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); sendChat(); }
  });
  $("provider").addEventListener("change", () => {
    AI.provider = $("provider").value;
    $("or-wrap").style.display = AI.provider === "openrouter" ? "flex" : "none";
    $("webllm-status").style.display = AI.provider === "webllm" ? "block" : "none";
  });
  $("save-key").addEventListener("click", () => {
    localStorage.setItem("fg_or_key", $("or-key").value.trim());
    addBubble("bot", "Key saved in this browser only.", "Forge Guide");
  });
}

function syncControls() {
  $("workers").value = Sim.config.workers; $("workers-v").textContent = Sim.config.workers;
  $("parallelism").value = Sim.config.parallelism; $("parallelism-v").textContent = Sim.config.parallelism;
  $("harness").value = Sim.config.harness; $("harness-v").textContent = Sim.config.harness + "%";
  $("complexity").value = Sim.config.complexity; $("complexity-v").textContent = Sim.config.complexity;
  $("engine").value = Sim.config.engine; $("tier").value = Sim.config.tier; $("mode").value = Sim.config.mode;
  $("adv").classList.toggle("on", Sim.config.adversary);
  $("hitl").classList.toggle("on", Sim.config.hitl);
  $("prune").classList.toggle("on", Sim.config.prune);
  $("bver").classList.toggle("on", Sim.config.blockVerify);
}

function msgBoxes() { return [$("msgs"), $("msgs-side")].filter(Boolean); }

async function sendChat(preset) {
  const q = (typeof preset === "string" ? preset : $("q").value.trim());
  if (!q) return;
  $("q").value = "";
  addBubble("me", q, "You");
  if ($("ms4")) $("ms4").checked = true;
  const thinking = addBubble("bot", "Reading the live graph…", "Guide");
  try {
    const { text, src } = await AI.reply(q);
    thinking.forEach((el) => { el.querySelector(".src").textContent = src; el.lastChild.textContent = text; });
  } catch (err) {
    thinking.forEach((el) => { el.querySelector(".src").textContent = "error"; el.lastChild.textContent = String(err.message || err); });
  }
}

function addBubble(who, text, src) {
  const made = [];
  msgBoxes().forEach((box) => {
    const el = document.createElement("div");
    el.className = "bubble " + who;
    el.innerHTML = "<span class=\"src\"></span>";
    el.querySelector(".src").textContent = src;
    el.append(document.createTextNode(text));
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    made.push(el);
  });
  return made;
}

function renderAcademy() {
  $("home-mods").innerHTML = CURRICULUM.map((c, i) =>
    "<div class=\"card\" data-lesson=\"" + i + "\" style=\"cursor:pointer\"><div class=\"tag\">" + c.track + " · " + c.minutes + "m</div><h3>" + c.title + "</h3><p>" + c.outcome + "</p></div>"
  ).join("");
  $("learn-nav").innerHTML = CURRICULUM.map((c, i) =>
    "<button data-lesson=\"" + i + "\"><b>" + c.title + "</b><span>" + c.track + " · " + c.minutes + " min · " + c.level + "</span></button>"
  ).join("");
  $("home-mods").addEventListener("click", (ev) => {
    const card = ev.target.closest("[data-lesson]");
    if (!card) return;
    openLesson(+card.dataset.lesson); showView("learn");
  });
  $("learn-nav").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-lesson]");
    if (b) openLesson(+b.dataset.lesson);
  });
  openLesson(0);
}

function openLesson(i) {
  App.lesson = i;
  const c = CURRICULUM[i];
  document.querySelectorAll("#learn-nav button").forEach((b, idx) => b.classList.toggle("on", idx === i));
  $("learn-meta").innerHTML = "<span class=\"pill\">" + c.track + "</span><span class=\"pill\">" + c.minutes + " min</span><span class=\"pill\">" + c.level + "</span>";
  $("learn-title").textContent = c.title;
  $("learn-thesis").textContent = c.thesis;
  $("learn-beats").innerHTML = c.beats.map((b) => "<p class=\"beat\">" + b + "</p>").join("");
  $("learn-quiz").innerHTML = "<b>" + c.check.q + "</b>" + c.check.options.map((o, n) =>
    "<button class=\"ghost\" data-ans=\"" + n + "\">" + o + "</button>"
  ).join("");
  $("learn-quiz").onclick = (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    b.classList.add(+b.dataset.ans === c.check.answer ? "good" : "bad");
  };
}

function suggest() {
  const qs = ["What is ForgeGraph in one paragraph?", "How do I use this on a repo I already started?", "Why did quality drop when I added workers?", "What does the Adversary actually do?", "Give me the greenfield recipe."];
  $("suggest").innerHTML = qs.map((q) => "<button class=\"chip-btn\">" + q + "</button>").join("");
  $("suggest").addEventListener("click", (ev) => {
    const b = ev.target.closest(".chip-btn"); if (b) sendChat(b.textContent);
  });
}

window.addEventListener("load", () => {
  document.querySelectorAll("#nav button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.go)));
  $("try-studio").addEventListener("click", () => {
    const id = CURRICULUM[App.lesson].id;
    showView("studio");
    Canvas.loadPreset(id === "owa" || id === "sim" ? "owa" : id === "why" ? "solo" : "forge");
    if (id === "brown") Sim.config.mode = "existing";
    syncControls();
  });
  $("ask-lesson").addEventListener("click", () => {
    showView("guide");
    sendChat("Teach me this lesson: " + CURRICULUM[App.lesson].title);
  });
  bindCanvas(); bindPalette(); bindControls(); renderAcademy(); suggest(); syncControls();
  $("or-key").value = localStorage.getItem("fg_or_key") || "";
  addBubble("bot", "I am Forge Guide. I can see your graph and knobs. Ask what ForgeGraph is, how to run it on an existing repo, or why a metric moved.", "Forge Guide · on-device");
});
