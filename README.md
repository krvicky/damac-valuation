# DAMAC CFO Finance Co-Pilot Prototype

A scripted-live CFO demo for DAMAC Properties focused on Data Center IRR, CAPEX valuation, scenario risk, and a mandatory GPT Realtime voice experience.

## Run

```powershell
$env:OPENAI_API_KEY="your_api_key"
npm.cmd start
```

Open [http://localhost:3000](http://localhost:3000).

If `OPENAI_API_KEY` is not set, the dashboard and typed fallback still work, but the microphone will show that GPT Realtime voice is not configured.

## Fast boss demo

For the fastest public HTTPS demo link, use the ngrok helper:

```powershell
$env:OPENAI_API_KEY="your_api_key"
npm.cmd run demo
```

If ngrok is installed, the terminal prints a public `https://...ngrok.app` URL you can send to your boss. Keep the terminal open during the demo.

For a persistent hosted URL, deploy to Render using the included `render.yaml`. See [HOSTING.md](HOSTING.md).

## Voice

The browser requests a short-lived Realtime client secret from `/api/realtime-token`, then connects to OpenAI through WebRTC. The voice agent has finance tools for:

- `calculate_irr_scenario`
- `compare_capex_cases`
- `run_sensitivity_analysis`
- `explain_risk_drivers`
- `get_cash_flow_breakdown`
- `update_assumptions`
- `build_custom_scenario`
- `compare_scenarios`
- `rank_value_drivers`
- `explain_metric_bridge`
- `stress_test_case`
- `generate_investment_committee_summary`
- `read_uploaded_model`
- `validate_finance_model`

The model explains results, but deterministic JavaScript finance tools calculate valuation outputs.

## V2 demo flow

Try these CFO prompts by voice or typed fallback:

- `Increase CAPEX by 10%, lower occupancy by 5 points, and tell me whether we still clear hurdle.`
- `Explain the IRR bridge from base to downside.`
- `Rank the value drivers.`
- `Generate an investment committee summary.`
- `Validate the finance model.`

## Uploaded model data

Use the upload control in the Data confidence panel for `.csv`, `.tsv`, or `.txt` exports. For Excel workbooks, save the relevant sheet as CSV first.

Sample file: `sample-data/data-center-model.csv`

Expected columns:

- `year`
- `capex`
- `occupancy`
- `revenue at full occupancy`
- `opex base`
- `power cost`
- `working capital`
- `financing cost`

Missing columns fall back to the seeded DAMAC demo model and appear in the Data confidence panel.

## Voice troubleshooting

- Use `http://localhost:3000` for the live demo. Chrome may label local HTTP as "Not secure", but microphone access is allowed on `localhost`. If you open the app through a LAN IP or shared hostname, use HTTPS.
- If the microphone says voice is unavailable, check the top-right status pill. It should say `GPT Realtime ready`.
- Restart the server after code changes so `/api/realtime-token` uses the latest Realtime session payload.
- The browser asks for microphone permission only after the Realtime session token is created successfully.
- Use the smaller mute button beside the mic to temporarily stop sending your microphone audio without ending the Realtime session.
- The top KPI tiles stay anchored to the seeded base case. Newly computed scenario KPIs appear as colored comparison values inside each tile.

## Test

```powershell
npm.cmd test
```
