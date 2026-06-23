# DAMAC CFO Finance Co-Pilot — Project Brief

## Overview

A single-page web app that acts as an AI-powered CFO co-pilot for DAMAC Properties. It allows a CFO (or demo presenter) to interrogate a real estate investment model — a data-center valuation — through natural voice conversation or typed prompts. The AI orchestrates financial analysis on the fly, updates the dashboard in real time, and narrates its findings aloud.

**Stack:** Vanilla JS + HTML5 frontend, Node.js backend, OpenAI Realtime API (WebRTC), no build step required.

---

## Screens

The app is a single HTML page with a persistent **voice console** on the right and five **dashboard tabs** on the left.

### Tab 1 — Investment Overview *(default)*
The main deal summary. Shows headline KPIs (IRR, NPV, CAPEX, Risk Score) with color-coded deltas against the base-case baseline. Contains a cash flow bar chart, a scenario selector (Base / Upside / Downside), an assumption panel the AI can adjust, a committee summary block, and a data-upload + confidence panel.

### Tab 2 — IRR / CAPEX Scenarios
Side-by-side bars comparing the three scenarios (base, upside, downside) and a CAPEX allocation table. Refreshed whenever the AI runs a scenario comparison.

### Tab 3 — Risk Sensitivities
Tornado chart across six value levers (occupancy, CAPEX, power cost, financing, delay, exit yield). Includes a risk-driver panel with severity badges and mitigation notes, a ranked value-driver list, and a metric bridge table showing IRR/NPV/CAPEX/risk deltas between two scenarios.

### Tab 4 — Cash Flow Drilldown
Annual table: Occupancy %, Revenue, Opex, EBITDA, CAPEX, FCF, Terminal Value — one row per year. Rendered from the active scenario calculation.

### Tab 5 — Controls Risk
Alternate positioning of the tool as a governance/audit assistant. Hosts three AI-driven checks: Trial Balance Scrutiny (FIN-24), Governance AI (FIN-27), and IFRS Checklist (FIN-28).

### Voice Console *(always visible, right sidebar)*
- Mic button (start / stop session)
- Mute button (pause audio without ending session)
- Live state label + rolling transcript
- Text chat input (typed fallback)
- 6 preset quick-prompt buttons (demo shortcuts)
- Dynamic follow-up suggestion buttons (updated after each tool call)

---

## How the Voice Demo Works

The voice path uses **OpenAI Realtime API over WebRTC** — a peer-to-peer audio connection that streams audio both ways and returns structured function calls via a data channel.

### Step-by-step

1. **User taps the mic button.** The browser requests microphone access.

2. **Backend issues a short-lived token.** The browser calls `/api/realtime-token`. The Node.js server sends the OpenAI session config (model, voice, VAD threshold, 14 finance tool definitions, CFO persona instructions) to OpenAI and returns a one-time `client_secret` — the API key never reaches the browser.

3. **WebRTC session opens.** The browser creates an `RTCPeerConnection`, sends an SDP offer to OpenAI, and receives an SDP answer. A data channel named `oai-events` carries all structured events; the audio track carries the AI's voice response.

4. **User speaks.** Server-side VAD (650 ms silence threshold) detects the end of speech and sends the transcript back automatically.

5. **GPT decides what to do.** Based on the CFO question, it selects one of the 14 finance tools and streams back the function call arguments over the data channel.

6. **Browser executes the tool locally.** All financial math runs in the browser (`finance.js`). GPT only decides *which* tool to call and *what parameters* to pass — it never touches the numbers directly. This keeps calculations deterministic and auditable.

7. **Result is sent back to GPT.** The browser posts the tool output back through the data channel, and GPT speaks a narrative summary of the result (the voice you hear).

8. **Dashboard updates simultaneously.** While GPT is speaking, the UI reflects the new scenario, chart, or table without any page reload.

---

## How Voice Interacts with the UI

The entire UI state lives in a single `state` object in `app.js`. Every tool result has a `type` field that routes the update to the right part of the dashboard:

| Tool result type | What updates |
|---|---|
| `scenario` / `assumption_update` / `stress_test` | Overview tab — KPI strip, chart, narrative, assumption list |
| `comparison` | Scenarios tab — side-by-side bars |
| `sensitivity` / `risk` / `value_drivers` / `metric_bridge` | Risk Sensitivities tab |
| `committee_summary` | Overview tab — committee summary block |
| `cashflow` | Cash Flow Drilldown tab |
| `uploaded_model` | Overview tab — data confidence panel |

### Delta rendering
The baseline (base-case) metrics are pinned at session start. Any new scenario result shows colored delta badges — green for improvement, red for deterioration — so the CFO can instantly see the impact of every assumption change the AI makes.

### Follow-up suggestions
Every tool result includes a `suggestedFollowUps` array. After each AI response, the console replaces its quick-prompt buttons with contextually relevant next questions (e.g., after a stress test: "Show the cash flow impact" or "Generate committee summary"). These wire directly into `handleTypedPrompt()`, so clicking them triggers the same logic as a typed or spoken command.

### Typed fallback
If voice is unavailable, the text input and quick-prompt buttons follow the exact same path: keyword pattern-matching maps the text to a tool name, executes it locally, and renders the result identically. The only difference is the state label reads "Typed fallback" instead of an analyst-mode label.

---

## Finance Engine at a Glance

14 client-side functions in `finance.js`, covering:
- IRR & NPV calculation (bisection method, 10.5% discount rate)
- Scenario modeling (base / upside / downside / custom)
- Sensitivity tornado (6 levers)
- Risk scoring (0–100 composite)
- Cash flow drilldown (annual rows)
- Value driver ranking
- Metric bridge (scenario-to-scenario delta table)
- Stress testing (moderate / severe severity)
- Investment committee summary generation
- CSV model upload & validation

All numbers are computed in the browser. OpenAI is the conversation and orchestration layer only.

---

## Key Files

| File | Role |
|---|---|
| [public/index.html](public/index.html) | HTML shell, tab structure, voice console markup |
| [public/app.js](public/app.js) | State manager, WebRTC voice session, UI rendering, event routing |
| [public/finance.js](public/finance.js) | All financial calculation engines (14 tools) |
| [public/styles.css](public/styles.css) | Design system, layout, chart styles |
| [server.js](server.js) | Node.js HTTP server, `/api/realtime-token` endpoint |
| [README.md](README.md) | Quick-start guide and demo script |
| [HOSTING.md](HOSTING.md) | ngrok and Render.com deployment instructions |
