function $(id) { return document.getElementById(id); }

function bumpMetrics(reason) {
  const prev = Sim.lastMetrics;
  const m = Sim.compute(Sim.config, Canvas.graph);
  const delta = Sim.explainDelta(prev, m, reason);
  Sim.lastMetrics = m;
  $("m-quality").textContent = m.quality.toFixed(1);
  $("m-cost").textContent = "$" + m.cost;
  $("m-time").textContent = m.minutes;
  $("m-fail").textContent = m.fail + "%";
  $("m-quality-d").textContent = "vs solo baseline " + (m.quality - 50 > 0 ? "+" : "") + (m.quality - 50).toFixed(1);
  $("m-cost-d").textContent = Sim.config.tier + " · " + Sim.config.engine;
  $("m-time-d").textContent = m.speedup + "× engine factor";
  $("m-fail-d").textContent = Sim.config.adversary ? "adversary armed" : "no red team";
  $("status-note").textContent = delta;
  Sim.log(stamp(Sim.tick), "info", delta);
}

function renderLog() {
  $("log").innerHTML = Sim.events.map((e) =>
    `<div class="ev"><span class="t">${e.t}</span><span class="${e.kind}">${e.msg}</span></div>`
  ).join("");
}
window.renderLog = renderLog;
window.renderGraph = renderGraph;
window.bumpMetrics = bumpMetrics;

function bindPalette() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/role", chip.dataset.type);
    });
  });
}

function bindControls() {
  const map = {
    workers: ["workers", (v) => +v],
    parallelism: ["parallelism", (v) => +v],
    harness: ["harness", (v) => +v],
    complexity: ["complexity", (v) => +v]
  };
  Object.entries(map).forEach(([id, [key, cast]]) => {
    $(id).addEventListener("input", () => {
      Sim.config[key] = cast($(id).value);
      $(id + "-v").textContent = $(id).value + (id === "harness" ? "%" : "");
      bumpMetrics(key);
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
    });
  });

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => Canvas.loadPreset(btn.dataset.preset));
  });

  $("play").addEventListener("click", () => Sim.start(Canvas.graph));
  $("stop").addEventListener("click", () => Sim.stop());
  $("reset").addEventListener("click", () => { Sim.stop(); Sim.reset(Canvas.graph); renderGraph(); });
  $("faster").addEventListener("click", () => { Sim.speed = Math.min(4, Sim.speed + 0.5); $("speed").textContent = Sim.speed.toFixed(1) + "×"; });
  $("slower").addEventListener("click", () => { Sim.speed = Math.max(0.5, Sim.speed - 0.5); $("speed").textContent = Sim.speed.toFixed(1) + "×"; });
  $("del").addEventListener("click", () => Canvas.removeSelected());
  $("fit").addEventListener("click", () => { Canvas.fit(); renderGraph(); });

  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ config: Sim.config, graph: Canvas.graph }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forgegraph-workflow.json";
    a.click();
  });
  $("import").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (data.config) Object.assign(Sim.config, data.config);
    if (data.graph) Canvas.graph = data.graph;
    syncControls();
    renderGraph();
    bumpMetrics("imported graph");
  });

  document.querySelectorAll(".tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.remove("on"));
      document.querySelectorAll(".panel").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      $(b.dataset.panel).classList.add("on");
    });
  });

  $("ask").addEventListener("click", sendChat);
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
    toast("OpenRouter key saved in this browser only.");
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Delete" || ev.key === "Backspace") {
      if (document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "INPUT") return;
      Canvas.removeSelected();
    }
    if (ev.key === " ") {
      if (document.activeElement.tagName === "TEXTAREA") return;
      ev.preventDefault();
      Sim.running ? Sim.stop() : Sim.start(Canvas.graph);
    }
  });
}

function syncControls() {
  $("workers").value = Sim.config.workers;
  $("workers-v").textContent = Sim.config.workers;
  $("parallelism").value = Sim.config.parallelism;
  $("parallelism-v").textContent = Sim.config.parallelism;
  $("harness").value = Sim.config.harness;
  $("harness-v").textContent = Sim.config.harness + "%";
  $("complexity").value = Sim.config.complexity;
  $("complexity-v").textContent = Sim.config.complexity;
  $("engine").value = Sim.config.engine;
  $("tier").value = Sim.config.tier;
  $("mode").value = Sim.config.mode;
  $("adv").classList.toggle("on", Sim.config.adversary);
  $("hitl").classList.toggle("on", Sim.config.hitl);
  $("prune").classList.toggle("on", Sim.config.prune);
  $("bver").classList.toggle("on", Sim.config.blockVerify);
}

async function sendChat() {
  const q = $("q").value.trim();
  if (!q) return;
  $("q").value = "";
  addBubble("me", q, "You");
  const thinking = addBubble("bot", "Thinking through the current graph…", "Guide");
  try {
    const { text, src } = await AI.reply(q);
    thinking.querySelector(".src").textContent = src;
    thinking.lastChild.textContent = text;
  } catch (err) {
    thinking.querySelector(".src").textContent = "error";
    thinking.lastChild.textContent = String(err.message || err);
  }
}

function addBubble(who, text, src) {
  const el = document.createElement("div");
  el.className = "bubble " + who;
  el.innerHTML = `<span class="src">${src}</span>`;
  el.append(document.createTextNode(text));
  $("msgs").appendChild(el);
  $("msgs").scrollTop = $("msgs").scrollHeight;
  return el;
}

function renderLessons() {
  $("lessons").innerHTML = LESSONS.map((l, i) =>
    `<div class="step ${i === 0 ? "on" : ""}" data-i="${i}"><b>${l.title}</b><span>${l.body.slice(0, 90)}…</span></div>`
  ).join("");
  showLesson(0);
  $("lessons").addEventListener("click", (ev) => {
    const s = ev.target.closest(".step");
    if (!s) return;
    document.querySelectorAll(".step").forEach((x) => x.classList.remove("on"));
    s.classList.add("on");
    showLesson(+s.dataset.i);
  });
}

function showLesson(i) {
  const l = LESSONS[i];
  $("lesson-title").textContent = l.title;
  $("lesson-body").textContent = l.body;
}

function toast(msg) {
  Sim.log(stamp(Sim.tick), "ai", msg);
}

function enterStudio() {
  $("splash").classList.add("hide");
  Canvas.loadPreset("forge");
  Sim.reset(Canvas.graph);
  bumpMetrics("studio open");
  addBubble("bot", "I am Forge Guide. Drag roles, wire ports, twist the knobs, then hit Simulate. Ask why a metric moved — or paste an OpenRouter key for a live model.", "Forge Guide · on-device");
}

window.addEventListener("load", () => {
  bindCanvas();
  bindPalette();
  bindControls();
  renderLessons();
  syncControls();
  $("or-key").value = localStorage.getItem("fg_or_key") || "";
  $("enter").addEventListener("click", enterStudio);
  window.addEventListener("resize", renderGraph);
});
