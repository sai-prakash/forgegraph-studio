# ForgeGraph Studio

Interactive studio for the **ForgeGraph Swarm** — the 2026 coding-agent workflow as a living instrument.

Live: **https://sai-prakash.github.io/forgegraph-studio/**

## What you can do

- Load three presets: full ForgeGraph Swarm, OWA fast path, single-loop control case
- Drag roles onto the canvas and wire ports to design a custom graph
- Move nodes, delete, zoom, fit
- Twist knobs (workers, parallelism, harness, engine, model tier, adversary, HITL, prune, verify, greenfield vs existing)
- Watch **quality / cost / minutes / fail risk** recompute instantly
- Press **Simulate** to run a topological wavefront with tokens riding the edges
- Learn the six core lessons
- Ask **Forge Guide** (free, on-device). Optionally plug **OpenRouter** (free models) or **WebLLM** (in-browser weights)

## Why the numbers move

The forecast model is an educational synthesis of 2025–2026 published patterns, not a lab benchmark:

- Swarm size peaks around 3 specialized agents; 5–7 often regress
- Adversary / OWA opposing incentives add quality and cut silent failures
- Harness quality (sandbox, git state, gates) moves scores more than a single model bump
- GraphWorkflow is modeled as a faster static-DAG engine; LangGraph as the durable HITL engine
- Existing-product intake routes through Analyst + Gap Detector so the swarm works on deltas

Export JSON to save a custom workflow. Import to resume.

## Stack

Fully native static site. No bundler. GitHub Pages.

- `index.html` + `css/studio.css` + `js/*`
- OpenRouter calls happen in the browser with a key you paste (localStorage only)
- WebLLM is optional and downloads weights into the browser on first use

## Run locally

Open `index.html` or:

```bash
python3 -m http.server 4173
```

Then visit http://localhost:4173

## License

MIT
