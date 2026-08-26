const CURRICULUM = [
  {
    id: "why",
    track: "Foundations",
    minutes: 6,
    level: "Start here",
    title: "Why one agent is not a team",
    outcome: "You can explain why a lone coder-bot stalls on real products.",
    thesis: "A single agent can write a function. A product needs planning, implementation, attack, proof, and a human gate. One context window trying to do all five produces confident slop.",
    beats: [
      "Solo agents score ~38–50% on hard software tasks. Pairing a critic jumps that. Three well-isolated roles peak near the mid-70s. Seven agents without isolation fall back toward 60%.",
      "The failure is not intelligence. It is role collision: the same model plans, writes, and grades its own work.",
      "ForgeGraph splits those jobs onto a graph so nobody grades their own homework."
    ],
    check: { q: "What is the main reason a 7-agent swarm often loses to a 3-agent one?", options: ["The models get dumber", "Coordination tax and context rot", "Git cannot handle more agents"], answer: 1 }
  },
  {
    id: "layers",
    track: "Foundations",
    minutes: 8,
    level: "Start here",
    title: "Harness, loop, graph — three layers",
    outcome: "You can name which layer is broken when a run feels chaotic.",
    thesis: "People mix these words. They are different altitudes. Mixing them is why most swarms feel expensive.",
    beats: [
      "Harness: the room. Sandbox, filesystem memory, git as state, tools, permissions, traces. Same weights, better harness — double-digit swings on Terminal-Bench / SWE-Bench Pro.",
      "Loop: the heartbeat. Act → check a real gate → revise. Outer Ralph-style loop resets context and keeps progress on disk.",
      "Graph: the map. Who runs next, what can run in parallel, where a human interrupts, how you recover after a crash.",
      "Rule: harness makes the model operate. Loops make work checkable. Graphs make control flow inspectable."
    ],
    check: { q: "Which layer owns durable checkpoints and human-in-the-loop?", options: ["Harness", "Loop", "Graph"], answer: 2 }
  },
  {
    id: "owa",
    track: "Core pattern",
    minutes: 7,
    level: "Core",
    title: "OWA: opposing incentives",
    outcome: "You can staff Orchestrator, Worker, Adversary, Verifier without role bleed.",
    thesis: "Quality is a side effect of incentives. The Orchestrator never edits code. The Worker writes one slice. The Adversary tries to break it. The Verifier trusts evidence, not vibes.",
    beats: [
      "Measured OWA builds cut token cost ~65% and wall-clock ~50% versus naive multi-agent chains — mostly by pruning work and verifying once per block.",
      "If the Orchestrator starts typing code, the pattern is dead. Judgment and generation must stay apart.",
      "Adversary is not a style reviewer. It writes the test that should fail if the slice is sloppy."
    ],
    check: { q: "Who is allowed to edit production code in OWA?", options: ["Orchestrator", "Worker only", "Adversary"], answer: 1 }
  },
  {
    id: "green",
    track: "Build recipes",
    minutes: 9,
    level: "Build",
    title: "Greenfield recipe — new idea to ship",
    outcome: "You can run a new product through Intake → Spec → Swarm → Verify.",
    thesis: "New work still needs a spec. Skipping Spec is how swarms invent architecture you did not ask for.",
    beats: [
      "Intake captures the outcome, constraints, and non-goals — not a solution.",
      "Researchers fan out. Spec Synthesizer writes a PRD with success metrics. Human Gate approves before Workers spend tokens.",
      "Planner cuts work (does not invent extra work). Architect names modules and risks. Orchestrator fans out slices.",
      "Workers implement. Adversary attacks. Integrator stitches. Tester + Security + Reviewer run in parallel. Verifier accepts only evidence."
    ],
    check: { q: "When does the human gate fire in the greenfield recipe?", options: ["After every file edit", "After the spec, before workers", "Only at deploy"], answer: 1 }
  },
  {
    id: "brown",
    track: "Build recipes",
    minutes: 8,
    level: "Build",
    title: "Brownfield recipe — review then add",
    outcome: "You can enhance an existing repo without a rewrite.",
    thesis: "Already-started products enter through Analyst + Gap Detector. The swarm only works on the delta backlog.",
    beats: [
      "Analyst maps architecture, tests, and known pain. Gap Detector diffs that map against the desired outcome.",
      "Spec becomes a change proposal, not a fantasy rewrite.",
      "Workers are forbidden from touching files outside the backlog. That is a harness rule, not a suggestion.",
      "Quality forecast dips slightly on Existing mode because unknown debt is honest."
    ],
    check: { q: "What stops a brownfield swarm from rewriting everything?", options: ["Using more workers", "A delta backlog plus file-scope rules", "Frontier models"], answer: 1 }
  },
  {
    id: "sim",
    track: "Studio",
    minutes: 6,
    level: "Practice",
    title: "How to read the simulator",
    outcome: "You know what Quality, Cost, Minutes, and Fail risk actually mean.",
    thesis: "The numbers are a teaching model synthesized from 2025–2026 published patterns, not a lab certificate.",
    beats: [
      "Quality rises with 2–3 specialists, adversary, harness, HITL, prune, block-verify. It falls after 5 workers and with high complexity.",
      "Cost rises with frontier models, extra workers, and no prune. Block-level verify is cheaper than per-file verify.",
      "Minutes fall with parallelism and GraphWorkflow. LangGraph is slower to orchestrate but safer for cycles and crash-resume.",
      "Fail risk is the chance a slice ships without evidence. Adversary is the cheapest way to cut it."
    ],
    check: { q: "Which knob usually hurts quality past 5?", options: ["Harness quality", "Worker count", "Context prune"], answer: 1 }
  },
  {
    id: "design",
    track: "Studio",
    minutes: 7,
    level: "Practice",
    title: "Design your own graph",
    outcome: "You can drag, wire, and explain every edge.",
    thesis: "An edge is a contract: the downstream agent only starts when the upstream artifact exists.",
    beats: [
      "Drag a role from the palette. Amber port is output. White port is input. Wire output → input.",
      "Keep fan-out after Orchestrator. Keep fan-in before Verifier. Do not let Reviewer edit code.",
      "Export JSON is your workflow source of truth.",
      "If you cannot say what artifact travels on an edge, delete the edge."
    ],
    check: { q: "What travels on an edge?", options: ["The model weights", "An artifact plus permission to start", "A Slack message"], answer: 1 }
  }
];

const GLOSSARY = {
  harness: "Everything around the model: sandbox, files as memory, git state, tools, permissions, traces.",
  loop: "Repeated act → verify → revise with a hard stop. Not keep talking until it feels done.",
  graph: "Explicit map of who runs, in what order, with which branches, gates, and recovery paths.",
  orchestrator: "Routes and merges. Never edits product code.",
  worker: "Implements one bounded slice in an isolated worktree.",
  adversary: "Tries to break the slice with failing tests and edge cases.",
  verifier: "Accepts evidence at block end. Agent claims are not evidence.",
  hitl: "Human gate before irreversible or expensive work.",
  prune: "Drop tools, history, and files the current slice does not need.",
  owa: "Orchestrator-Worker-Adversary pattern with opposing incentives."
};

const RECIPES = {
  greenfield: [
    "Write the outcome in one sentence. Add non-goals.",
    "Run Research in parallel, then one Spec.",
    "Stop at Human Gate. Approve or rewrite the spec.",
    "Planner cuts. Architect names modules.",
    "Orchestrator fans out Workers. Adversary attacks each slice.",
    "Integrator + Tester + Security + Reviewer. Verifier last."
  ],
  existing: [
    "Point Analyst at the repo. Do not skip this.",
    "Gap Detector writes a ranked delta backlog.",
    "Spec is a change proposal scoped to that backlog.",
    "Harness rule: Workers may only touch listed paths.",
    "Same OWA loop on each delta.",
    "Verifier checks the product still boots and the gap is closed."
  ]
};

const NOW_COPY = {
  intake: "Capturing the outcome and constraints. No solution yet — that is the point.",
  analyst: "Reading the existing system: modules, tests, known pain. This is the brownfield on-ramp.",
  gap: "Diffing current state against the desired outcome. Only the delta becomes work.",
  research: "Gathering feasibility, constraints, and prior art in parallel.",
  spec: "Compressing research into a PRD with success metrics. This is the contract.",
  planner: "Cutting the plan. Expensive models decide what NOT to build.",
  architect: "Naming modules, interfaces, and risks. Still no product code.",
  orchestrator: "Dispatching slices and merging results. Does not type into source files.",
  worker: "Implementing one bounded slice in isolation.",
  adversary: "Writing the test that should fail if the slice is sloppy.",
  debugger: "Turning a real failure into a minimal patch.",
  tester: "Running suites. Coverage is evidence, not a vibe.",
  security: "Looking for the exploit the Worker did not imagine.",
  reviewer: "One perspective only — perf, UX, or maintainability.",
  integrator: "Stitching contracts so modules actually meet.",
  verifier: "Checking artifacts and tests. Closing the block only if evidence holds.",
  hitl: "A human must approve before the expensive part of the graph starts.",
  meta: "Recording what the graph should do differently next run."
};
