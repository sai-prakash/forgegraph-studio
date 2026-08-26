const Sim = {
  running: false,
  speed: 1,
  tick: 0,
  timer: null,
  events: [],
  nodeState: {},
  tokens: [],
  lastMetrics: null,

  config: {
    workers: 3,
    adversary: true,
    parallelism: 3,
    harness: 78,
    engine: "langgraph",
    tier: "mixed",
    hitl: true,
    prune: true,
    blockVerify: true,
    mode: "greenfield",
    complexity: 6
  },

  compute(cfg, graph) {
    const w = cfg.workers;
    const sizeBonus = w === 1 ? 0 : w === 2 ? 18 : w === 3 ? 26 : w === 4 ? 24 : w === 5 ? 21 : 12;
    let quality = 48 + sizeBonus;
    quality += cfg.adversary ? 12 : 0;
    quality += cfg.harness * 0.16;
    quality += cfg.engine === "langgraph" ? 6 : cfg.engine === "graphworkflow" ? 5 : 0;
    quality += cfg.tier === "frontier" ? 8 : cfg.tier === "mixed" ? 4 : 0;
    quality += cfg.hitl ? 5 : 0;
    quality += cfg.prune ? 3 : 0;
    quality += cfg.blockVerify ? 4 : 0;
    quality -= cfg.mode === "existing" ? 3 : 0;
    quality -= Math.max(0, w - 5) * 6;
    quality -= cfg.complexity * 0.6;
    if (!cfg.adversary && w >= 4) quality -= 4;
    quality = Math.max(28, Math.min(96, quality));

    const tierMul = cfg.tier === "frontier" ? 1.8 : cfg.tier === "mixed" ? 1.05 : 0.62;
    const engineMul = cfg.engine === "graphworkflow" ? 0.55 : cfg.engine === "langgraph" ? 1 : 0.82;
    const advMul = cfg.adversary ? 1.28 : 1;
    const pruneMul = cfg.prune ? 0.62 : 1.35;
    const verifyMul = cfg.blockVerify ? 0.72 : 1.2;
    const nodes = Math.max(3, graph.nodes.length);
    const cost = +(w * 4.2 * tierMul * advMul * pruneMul * verifyMul * (cfg.complexity / 5) * (nodes / 12)).toFixed(2);

    const par = Math.max(1, Math.min(cfg.parallelism, w));
    const seqTax = nodes / Math.max(2, par);
    const engineSpeed = cfg.engine === "graphworkflow" ? 0.48 : cfg.engine === "langgraph" ? 0.78 : 1;
    const minutes = +((18 + seqTax * 7 + cfg.complexity * 3.4) * engineSpeed * (cfg.harness > 70 ? 0.86 : 1.08)).toFixed(1);

    const fail = Math.max(3, +(28 - (quality - 50) * 0.55 - (cfg.adversary ? 6 : 0)).toFixed(1));
    const tokens = Math.round(8200 * w * advMul * pruneMul * (cfg.complexity / 5));
    const speedup = cfg.engine === "graphworkflow" ? 7.0 : cfg.engine === "langgraph" ? 1.6 : 1;

    return { quality, cost, minutes, fail, tokens, speedup, par };
  },

  explainDelta(prev, next, changed) {
    if (!prev) return "Baseline forecast from the current graph and knobs.";
    const dq = (next.quality - prev.quality).toFixed(1);
    const dc = (next.cost - prev.cost).toFixed(2);
    const dt = (next.minutes - prev.minutes).toFixed(1);
    const sign = (n) => (n > 0 ? "+" + n : n);
    return `${changed}: quality ${sign(dq)} · cost ${sign(dc)} · time ${sign(dt)} min.`;
  },

  reset(graph) {
    this.tick = 0;
    this.nodeState = {};
    graph.nodes.forEach((n) => { this.nodeState[n.id] = "idle"; });
    this.tokens = [];
    this.log("00:00", "info", "Harness ready. Graph compiled. Waiting to run.");
  },

  log(t, kind, msg) {
    this.events.unshift({ t, kind, msg });
    if (this.events.length > 80) this.events.pop();
    if (window.renderLog) window.renderLog();
  },

  start(graph) {
    if (this.running) return;
    this.running = true;
    this.reset(graph);
    const order = topo(graph);
    let i = 0;
    const wave = () => {
      if (!this.running) return;
      const batch = [];
      const cap = this.config.parallelism;
      while (i < order.length && batch.length < cap) {
        const id = order[i++];
        batch.push(id);
      }
      if (!batch.length) {
        this.running = false;
        this.log(stamp(this.tick), "ok", "Wavefront complete. Verifier holds evidence. Ready to ship or evolve.");
        graph.nodes.forEach((n) => {
          if (this.nodeState[n.id] !== "fail") this.nodeState[n.id] = "done";
        });
        if (window.renderGraph) window.renderGraph();
        return;
      }
      batch.forEach((id) => {
        this.nodeState[id] = "running";
        const node = graph.nodes.find((n) => n.id === id);
        const role = ROLES[node.type] || ROLES.worker;
        const failRoll = Math.random() * 100 < (this.config.adversary && node.type === "worker" ? 8 : this.compute(this.config, graph).fail / 6);
        this.log(stamp(this.tick), failRoll ? "warn" : "ok", `${role.label} · ${role.blurb}${failRoll ? " · gate flagged, looping back" : ""}`);
        if (failRoll && this.config.adversary) {
          this.nodeState[id] = "fail";
        }
      });
      if (window.renderGraph) window.renderGraph();
      this.tick += 1;
      this.timer = setTimeout(() => {
        batch.forEach((id) => {
          if (this.nodeState[id] === "running") this.nodeState[id] = "done";
        });
        if (window.renderGraph) window.renderGraph();
        wave();
      }, 900 / this.speed);
    };
    wave();
  },

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }
};

function topo(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const incoming = Object.fromEntries(ids.map((id) => [id, 0]));
  graph.edges.forEach(([a, b]) => { if (incoming[b] != null) incoming[b]++; });
  const q = ids.filter((id) => incoming[id] === 0);
  const out = [];
  const adj = Object.fromEntries(ids.map((id) => [id, []]));
  graph.edges.forEach(([a, b]) => adj[a] && adj[a].push(b));
  while (q.length) {
    const n = q.shift();
    out.push(n);
    (adj[n] || []).forEach((m) => {
      incoming[m]--;
      if (incoming[m] === 0) q.push(m);
    });
  }
  ids.forEach((id) => { if (!out.includes(id)) out.push(id); });
  return out;
}

function stamp(t) {
  const s = t * 7;
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}
