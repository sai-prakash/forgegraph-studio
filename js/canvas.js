const Canvas = {
  graph: { nodes: [], edges: [] },
  selected: null,
  drag: null,
  link: null,
  pan: { x: 40, y: 40 },
  scale: 0.72,
  hovering: null,

  loadPreset(key) {
    const p = PRESETS[key];
    this.graph = {
      nodes: p.nodes.map((n) => ({ ...n })),
      edges: p.edges.map((e) => [...e])
    };
    this.selected = null;
    this.fit();
    renderGraph();
    bumpMetrics("preset " + p.name);
  },

  addNode(type, x, y) {
    const id = type + "_" + Math.random().toString(36).slice(2, 6);
    this.graph.nodes.push({ id, type, x, y });
    this.selected = id;
    renderGraph();
    bumpMetrics("added " + type);
  },

  removeSelected() {
    if (!this.selected) return;
    this.graph.edges = this.graph.edges.filter(([a, b]) => a !== this.selected && b !== this.selected);
    this.graph.nodes = this.graph.nodes.filter((n) => n.id !== this.selected);
    this.selected = null;
    renderGraph();
    bumpMetrics("removed node");
  },

  connect(a, b) {
    if (a === b) return;
    if (this.graph.edges.some(([x, y]) => x === a && y === b)) return;
    this.graph.edges.push([a, b]);
    renderGraph();
    bumpMetrics("wired edge");
  },

  fit() {
    if (!this.graph.nodes.length) return;
    const xs = this.graph.nodes.map((n) => n.x);
    const ys = this.graph.nodes.map((n) => n.y);
    this.pan.x = 60 - Math.min(...xs) * this.scale;
    this.pan.y = 80 - Math.min(...ys) * this.scale;
  },

  world(ev, el) {
    const r = el.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left - this.pan.x) / this.scale,
      y: (ev.clientY - r.top - this.pan.y) / this.scale
    };
  }
};

function bezier(a, b) {
  const x1 = a.x + 188, y1 = a.y + 36;
  const x2 = b.x, y2 = b.y + 36;
  const c = Math.max(40, (x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

function renderGraph() {
  const stage = document.getElementById("stage");
  const svg = document.getElementById("graph");
  const w = stage.clientWidth, h = stage.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = "";

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${Canvas.pan.x},${Canvas.pan.y}) scale(${Canvas.scale})`);
  svg.appendChild(g);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="flow" x1="0" x2="1">
      <stop offset="0" stop-color="#f0b429"/>
      <stop offset="1" stop-color="#5eead4"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  `;
  g.appendChild(defs);

  Canvas.graph.edges.forEach(([a, b], i) => {
    const na = Canvas.graph.nodes.find((n) => n.id === a);
    const nb = Canvas.graph.nodes.find((n) => n.id === b);
    if (!na || !nb) return;
    const d = bezier(na, nb);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#flow)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("opacity", "0.55");
    path.setAttribute("filter", "url(#glow)");
    g.appendChild(path);

    const running = Sim.nodeState[a] === "running" || Sim.nodeState[a] === "done";
    if (running || Sim.running) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "#fff7d6");
      const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
      anim.setAttribute("dur", `${1.6 / Sim.speed}s`);
      anim.setAttribute("repeatCount", "indefinite");
      anim.setAttribute("path", d);
      dot.appendChild(anim);
      g.appendChild(dot);
    }
  });

  if (Canvas.link) {
    const n = Canvas.graph.nodes.find((x) => x.id === Canvas.link);
    const ghost = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ghost.setAttribute("d", `M ${n.x + 188} ${n.y + 36} L ${Canvas.linkPt.x} ${Canvas.linkPt.y}`);
    ghost.setAttribute("stroke", "#f0b429");
    ghost.setAttribute("stroke-dasharray", "6 6");
    ghost.setAttribute("fill", "none");
    g.appendChild(ghost);
  }

  document.querySelectorAll(".node-card").forEach((el) => el.remove());
  Canvas.graph.nodes.forEach((node) => {
    const role = ROLES[node.type] || ROLES.worker;
    const el = document.createElement("div");
    el.className = "node-card";
    const st = Sim.nodeState[node.id] || "idle";
    if (st === "running") el.classList.add("running");
    if (st === "done") el.classList.add("done");
    if (st === "fail") el.classList.add("fail");
    if (Canvas.selected === node.id) el.classList.add("active");
    el.style.left = Canvas.pan.x + node.x * Canvas.scale + "px";
    el.style.top = Canvas.pan.y + node.y * Canvas.scale + "px";
    el.style.transform = `scale(${Canvas.scale})`;
    el.style.transformOrigin = "top left";
    el.innerHTML = `
      <header>
        <div class="ico" style="background:${role.color}22;color:${role.color}">${role.icon}</div>
        <h4>${role.label}</h4>
        <span class="status-pill">${st}</span>
      </header>
      <p>${role.blurb}</p>
      <div class="ports">
        <i class="port in" data-id="${node.id}" data-kind="in"></i>
        <i class="port out" data-id="${node.id}" data-kind="out"></i>
      </div>`;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.target.classList.contains("port")) return;
      Canvas.selected = node.id;
      Canvas.drag = { id: node.id, dx: ev.clientX, dy: ev.clientY, ox: node.x, oy: node.y };
      renderGraph();
    });
    el.querySelectorAll(".port").forEach((p) => {
      p.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        Canvas.link = node.id;
        const w = Canvas.world(ev, stage);
        Canvas.linkPt = w;
      });
    });
    stage.appendChild(el);
  });
}

function bindCanvas() {
  const stage = document.getElementById("stage");
  stage.addEventListener("pointermove", (ev) => {
    if (Canvas.drag) {
      const n = Canvas.graph.nodes.find((x) => x.id === Canvas.drag.id);
      n.x = Canvas.drag.ox + (ev.clientX - Canvas.drag.dx) / Canvas.scale;
      n.y = Canvas.drag.oy + (ev.clientY - Canvas.drag.dy) / Canvas.scale;
      renderGraph();
    } else if (Canvas.link) {
      Canvas.linkPt = Canvas.world(ev, stage);
      renderGraph();
    }
  });
  window.addEventListener("pointerup", (ev) => {
    if (Canvas.link) {
      const target = ev.target.closest?.(".node-card");
      if (target) {
        const id = target.querySelector(".port").dataset.id;
        Canvas.connect(Canvas.link, id);
      }
    }
    Canvas.drag = null;
    Canvas.link = null;
    renderGraph();
  });
  stage.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const next = Math.min(1.4, Math.max(0.4, Canvas.scale + (ev.deltaY > 0 ? -0.06 : 0.06)));
    Canvas.scale = next;
    renderGraph();
  }, { passive: false });

  stage.addEventListener("dragover", (ev) => ev.preventDefault());
  stage.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const type = ev.dataTransfer.getData("text/role");
    if (!type) return;
    const w = Canvas.world(ev, stage);
    Canvas.addNode(type, w.x - 90, w.y - 20);
  });
}
