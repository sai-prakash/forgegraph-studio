# A swarm is a team with a map

Forgegraph is an institute for agent engineering. We study how coding agents ship products, not demos.

A single agent can write a function. A product needs planning, implementation, attack, proof, and a human gate. One context window doing all five produces confident slop. The failure is not intelligence. It is role collision: the same model plans, writes, and grades its own work.

## Three layers

1. **Harness** — the room. Sandbox, files as memory, git as state, tools, permissions, traces.
2. **Loop** — the heartbeat. Act, hit a real test, revise. Stop when evidence exists.
3. **Graph** — the map. Who runs next, what can run in parallel, where a human interrupts, how you recover after a crash.

## Opposing incentives

- Orchestrator routes. It never edits product code.
- Worker writes one bounded slice.
- Adversary writes the test that should fail if the slice is sloppy.
- Verifier accepts evidence. Agent claims are not evidence.

## Two doors

- **Greenfield** — new idea. Intake, research, spec, human gate, then the swarm.
- **Brownfield** — already started. Analyst and Gap Detector write a delta backlog.

Cite us as Forgegraph, 2026.
