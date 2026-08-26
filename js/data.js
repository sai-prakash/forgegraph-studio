const ROLES = {
  intake: { label: "Intake", color: "#f0b429", icon: "IN", blurb: "Greenfield idea or existing repo map." },
  analyst: { label: "Codebase Analyst", color: "#7dd3fc", icon: "CA", blurb: "Maps architecture, tests, pain points." },
  gap: { label: "Gap Detector", color: "#fb7185", icon: "GD", blurb: "Diffs current state vs desired outcome." },
  research: { label: "Researcher", color: "#8b7cff", icon: "RS", blurb: "Market, feasibility, constraints." },
  spec: { label: "Spec Synthesizer", color: "#f0b429", icon: "SP", blurb: "Writes PRD + success metrics." },
  planner: { label: "Planner", color: "#ffd37a", icon: "PL", blurb: "Cuts the plan. Does not invent extra work." },
  architect: { label: "Architect", color: "#8b7cff", icon: "AR", blurb: "Modules, interfaces, risk register." },
  orchestrator: { label: "Orchestrator", color: "#f0b429", icon: "OR", blurb: "Routes, merges, never edits code." },
  worker: { label: "Worker", color: "#5eead4", icon: "WK", blurb: "Implements one bounded slice." },
  adversary: { label: "Adversary", color: "#fb7185", icon: "AD", blurb: "Tries to break the worker output." },
  debugger: { label: "Debugger", color: "#fbbf24", icon: "DB", blurb: "Runs tests, writes minimal patches." },
  tester: { label: "Tester", color: "#b6f05a", icon: "QA", blurb: "Suites, coverage, failing cases." },
  security: { label: "Security", color: "#fb7185", icon: "SE", blurb: "Threat model + scan findings." },
  reviewer: { label: "Reviewer", color: "#7dd3fc", icon: "RV", blurb: "One perspective: perf, UX, or maintain." },
  integrator: { label: "Integrator", color: "#34d399", icon: "IG", blurb: "Stitches modules, resolves contracts." },
  verifier: { label: "Verifier", color: "#34d399", icon: "VF", blurb: "Block-level evidence, not agent claims." },
  hitl: { label: "Human Gate", color: "#fff", icon: "HU", blurb: "Approval before irreversible work." },
  meta: { label: "Meta-Evolution", color: "#8b7cff", icon: "ME", blurb: "Improves prompts and topology after a run." }
};

const PRESETS = {
  forge: {
    name: "ForgeGraph Swarm",
    hint: "Full 2026 production graph — greenfield + brownfield intake.",
    nodes: [
      { id: "intake", type: "intake", x: 80, y: 220 },
      { id: "analyst", type: "analyst", x: 80, y: 60 },
      { id: "gap", type: "gap", x: 80, y: 380 },
      { id: "research", type: "research", x: 320, y: 80 },
      { id: "spec", type: "spec", x: 320, y: 220 },
      { id: "hitl1", type: "hitl", x: 320, y: 360 },
      { id: "planner", type: "planner", x: 560, y: 140 },
      { id: "architect", type: "architect", x: 560, y: 280 },
      { id: "orch", type: "orchestrator", x: 800, y: 210 },
      { id: "w1", type: "worker", x: 1040, y: 40 },
      { id: "w2", type: "worker", x: 1040, y: 170 },
      { id: "w3", type: "worker", x: 1040, y: 300 },
      { id: "adv", type: "adversary", x: 1280, y: 170 },
      { id: "integ", type: "integrator", x: 1520, y: 120 },
      { id: "dbg", type: "debugger", x: 1520, y: 250 },
      { id: "qa", type: "tester", x: 1760, y: 80 },
      { id: "sec", type: "security", x: 1760, y: 200 },
      { id: "rv", type: "reviewer", x: 1760, y: 320 },
      { id: "ver", type: "verifier", x: 2000, y: 200 },
      { id: "meta", type: "meta", x: 2240, y: 200 }
    ],
    edges: [
      ["analyst", "spec"], ["gap", "spec"], ["intake", "spec"], ["intake", "research"],
      ["research", "spec"], ["spec", "hitl1"], ["hitl1", "planner"], ["hitl1", "architect"],
      ["planner", "orch"], ["architect", "orch"],
      ["orch", "w1"], ["orch", "w2"], ["orch", "w3"],
      ["w1", "adv"], ["w2", "adv"], ["w3", "adv"],
      ["adv", "integ"], ["adv", "dbg"],
      ["integ", "qa"], ["dbg", "qa"], ["integ", "sec"], ["dbg", "rv"],
      ["qa", "ver"], ["sec", "ver"], ["rv", "ver"], ["ver", "meta"]
    ]
  },
  owa: {
    name: "OWA Fast Path",
    hint: "Orchestrator · Worker · Adversary. Cheapest high-quality coding loop.",
    nodes: [
      { id: "pl", type: "planner", x: 120, y: 200 },
      { id: "or", type: "orchestrator", x: 380, y: 200 },
      { id: "wk", type: "worker", x: 640, y: 120 },
      { id: "ad", type: "adversary", x: 640, y: 280 },
      { id: "vf", type: "verifier", x: 900, y: 200 }
    ],
    edges: [["pl", "or"], ["or", "wk"], ["wk", "ad"], ["ad", "or"], ["ad", "vf"]]
  },
  solo: {
    name: "Single Loop",
    hint: "One agent, Ralph-style outer loop. Fine for tiny tasks — watch quality drop.",
    nodes: [
      { id: "or", type: "orchestrator", x: 200, y: 200 },
      { id: "wk", type: "worker", x: 500, y: 200 },
      { id: "vf", type: "verifier", x: 800, y: 200 }
    ],
    edges: [["or", "wk"], ["wk", "vf"], ["vf", "or"]]
  }
};

const LESSONS = [
  {
    id: "layers",
    title: "Three layers, one system",
    body: "Harness makes the model operate. Loops make work iterative and checkable. Graphs decide who runs next, what can run in parallel, and how you recover. Mixing them up is why most swarms feel expensive and chaotic."
  },
  {
    id: "owa",
    title: "Opposing incentives",
    body: "The Orchestrator never edits code. The Worker writes. The Adversary tries to break it. Quality jumps because nobody is grading their own homework. Measured OWA builds cut token cost ~65% and wall-clock ~50% versus naive multi-agent chains."
  },
  {
    id: "size",
    title: "Three is the peak",
    body: "Across SWE-Bench-style evals, solo ~50%, pair ~68%, three-agent ~76%, five ~71%, seven ~60%. Extra agents without isolation and pruning add coordination tax and context rot."
  },
  {
    id: "harness",
    title: "Scaffold beats model swaps",
    body: "Same weights, different harness: double-digit swings on Terminal-Bench and SWE-Bench Pro. Filesystem memory, sandboxes, git as state, and hard test gates matter more than one model bump."
  },
  {
    id: "graph",
    title: "Compile the graph",
    body: "Static DAGs can be compiled once. GraphWorkflow published 7× geometric mean vs LangGraph and up to 62.5× on deep chains. Use LangGraph when you need cycles, HITL, and durable checkpoints."
  },
  {
    id: "brownfield",
    title: "Review then add",
    body: "Existing products enter through Analyst + Gap Detector. The rest of the graph only works on deltas. That stops the rewrite-everything failure mode."
  }
];

const KNOWLEDGE = `
ForgeGraph Swarm is a 2026 agentic product-building workflow.
Layers: Harness (sandbox, filesystem memory, git state, tools, permissions, observability), Loop (bounded act-check-revise; Ralph-style stateless outer loop), Graph (nodes, edges, fan-out, HITL, checkpoints).
Roles: Orchestrator plans and merges but does not edit code. Workers implement one slice. Adversary generates failing tests. Verifier checks evidence at block end. Analyst + Gap Detector handle existing repos.
Research notes: 3-agent swarms peak ~76% vs solo ~50%. 5-7 agents often regress. OWA reduced cost ~65% and time ~50% on a containerized backend. GraphWorkflow is much faster on static DAGs. LangGraph is best for durable HITL production graphs. Deep Agents is a batteries-included harness on LangGraph.
Tuneables: worker count, adversary, parallelism, harness quality, engine (loop/langgraph/graphworkflow), model tier, HITL, context prune, block-level verify, greenfield vs existing.
`;
