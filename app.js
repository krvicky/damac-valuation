import {
  buildCustomScenario,
  calculateIrrScenario,
  compareCapexCases,
  compareScenarios,
  explainRiskDrivers,
  explainMetricBridge,
  generateInvestmentCommitteeSummary,
  getCashFlowBreakdown,
  rankValueDrivers,
  readUploadedModel,
  runSensitivityAnalysis,
  stressTestCase,
  updateAssumptions,
  validateFinanceModel
} from "./finance.js";
import { API_BASE } from "./config.js";

const SESSION_KEY = "openai_api_key";
const getSessionKey = () => sessionStorage.getItem(SESSION_KEY);
const setSessionKey = (k) => sessionStorage.setItem(SESSION_KEY, k);
const clearSessionKey = () => sessionStorage.removeItem(SESSION_KEY);

const state = {
  scenario: "base",
  baselineResult: calculateIrrScenario({ scenario: "base" }),
  currentResult: calculateIrrScenario({ scenario: "base" }),
  latestKpiResult: null,
  comparison: compareCapexCases(),
  sensitivity: runSensitivityAnalysis({ scenario: "base" }),
  risks: explainRiskDrivers({ scenario: "base" }),
  valueDrivers: null,
  bridge: null,
  committeeSummary: null,
  uploadedModel: null,
  uploadedFileText: "",
  dataConfidence: {
    source: "Seeded DAMAC demo model",
    status: "seeded",
    missingFields: [],
    warnings: [],
    rowsRead: 7,
    lastScenarioChangedBy: "Seeded fallback"
  },
  followUps: ["Rank the value drivers.", "Explain the IRR bridge.", "Generate an investment committee summary."],
  voice: {
    active: false,
    pc: null,
    dc: null,
    stream: null,
    audio: null,
    pendingCalls: new Map(),
    muted: false
  }
};

const elements = {
  apiStatus: document.querySelector("#apiStatus"),
  metricIrr: document.querySelector("#metricIrr"),
  metricIrrNew: document.querySelector("#metricIrrNew"),
  metricSpread: document.querySelector("#metricSpread"),
  metricNpv: document.querySelector("#metricNpv"),
  metricNpvNew: document.querySelector("#metricNpvNew"),
  metricCapex: document.querySelector("#metricCapex"),
  metricCapexNew: document.querySelector("#metricCapexNew"),
  metricRisk: document.querySelector("#metricRisk"),
  metricRiskNew: document.querySelector("#metricRiskNew"),
  metricRiskText: document.querySelector("#metricRiskText"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  scenarioNarrative: document.querySelector("#scenarioNarrative"),
  recommendation: document.querySelector("#recommendation"),
  assumptionList: document.querySelector("#assumptionList"),
  cashFlowChart: document.querySelector("#cashFlowChart"),
  scenarioBars: document.querySelector("#scenarioBars"),
  capexTable: document.querySelector("#capexTable"),
  sensitivityChart: document.querySelector("#sensitivityChart"),
  riskDrivers: document.querySelector("#riskDrivers"),
  valueDrivers: document.querySelector("#valueDrivers"),
  bridgePanel: document.querySelector("#bridgePanel"),
  committeePanel: document.querySelector("#committeePanel"),
  dataConfidence: document.querySelector("#dataConfidence"),
  followUps: document.querySelector("#followUps"),
  modelUpload: document.querySelector("#modelUpload"),
  validateModelButton: document.querySelector("#validateModelButton"),
  cashFlowTable: document.querySelector("#cashFlowTable"),
  scenarioSelect: document.querySelector("#scenarioSelect"),
  micButton: document.querySelector("#micButton"),
  muteButton: document.querySelector("#muteButton"),
  voiceState: document.querySelector("#voiceState"),
  latestTranscript: document.querySelector("#latestTranscript"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  apiKeyBtn: document.querySelector("#apiKeyBtn"),
  apiKeyModal: document.querySelector("#apiKeyModal"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  apiKeySave: document.querySelector("#apiKeySave"),
  apiKeyCancel: document.querySelector("#apiKeyCancel")
};

const financeHandlers = {
  calculate_irr_scenario: calculateIrrScenario,
  compare_capex_cases: compareCapexCases,
  run_sensitivity_analysis: runSensitivityAnalysis,
  explain_risk_drivers: explainRiskDrivers,
  get_cash_flow_breakdown: getCashFlowBreakdown,
  update_assumptions: updateAssumptions,
  build_custom_scenario: buildCustomScenario,
  compare_scenarios: compareScenarios,
  rank_value_drivers: rankValueDrivers,
  explain_metric_bridge: explainMetricBridge,
  stress_test_case: stressTestCase,
  generate_investment_committee_summary: generateInvestmentCommitteeSummary,
  read_uploaded_model: readUploadedModel,
  validate_finance_model: validateFinanceModel
};

function money(value) {
  return `${value.toLocaleString("en-US")} AEDm`;
}

function riskLabel(score) {
  if (score >= 70) return "High risk";
  if (score >= 48) return "Moderate risk";
  return "Controlled risk";
}

function setVoiceState(label, detail) {
  elements.voiceState.textContent = label;
  if (detail) elements.latestTranscript.textContent = detail;
}

function withActiveModel(args = {}) {
  return state.uploadedModel ? { ...args, modelData: state.uploadedModel } : args;
}

function setActiveTab(id) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === id);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === id);
  });
}

function applyToolResult(result) {
  if (!result || typeof result !== "object") return;

  if (["scenario", "assumption_update", "custom_scenario", "stress_test", "cashflow", "comparison", "sensitivity", "risk", "value_drivers", "metric_bridge", "committee_summary", "uploaded_model", "model_validation"].includes(result.type)) {
    elements.voiceState.textContent = "Updating dashboard";
  }

  if (["scenario", "assumption_update", "custom_scenario", "stress_test"].includes(result.type)) {
    state.scenario = result.scenario;
    state.currentResult = result;
    state.latestKpiResult = result;
    elements.scenarioSelect.value = result.scenario === "custom" ? "base" : result.scenario;
    setActiveTab("overview");
  }

  if (result.type === "comparison") {
    state.comparison = result;
    setActiveTab("scenarios");
  }

  if (result.type === "sensitivity") {
    state.sensitivity = result;
    setActiveTab("risk");
  }

  if (result.type === "risk") {
    state.risks = result;
    setActiveTab("risk");
  }

  if (result.type === "value_drivers") {
    state.valueDrivers = result;
    setActiveTab("risk");
  }

  if (result.type === "metric_bridge") {
    state.bridge = result;
    setActiveTab("risk");
  }

  if (result.type === "committee_summary") {
    state.committeeSummary = result;
    setActiveTab("overview");
  }

  if (result.type === "uploaded_model") {
    state.uploadedModel = result;
    state.dataConfidence = result.confidence;
    const recalculated = calculateIrrScenario(withActiveModel({ scenario: state.scenario }));
    state.currentResult = recalculated;
    state.latestKpiResult = recalculated;
    setActiveTab("overview");
  }

  if (result.type === "model_validation") {
    state.dataConfidence = result.confidence;
  }

  if (result.type === "cashflow") {
    state.currentResult = calculateIrrScenario(withActiveModel({ scenario: result.scenario }));
    state.latestKpiResult = state.currentResult;
    setActiveTab("cashflow");
  }

  if (result.suggestedFollowUps) state.followUps = result.suggestedFollowUps;
  if (result.confidence) state.dataConfidence = result.confidence;

  render();
  if (result.narrative) {
    setVoiceState("Speaking", result.narrative.headline);
  }
}

function renderComputedKpi(element, label, value, delta, suffix = "") {
  if (!element) return;
  if (!label) {
    element.textContent = "";
    element.classList.remove("negative");
    return;
  }
  element.classList.toggle("negative", delta < 0);
  const deltaText = delta === null || delta === undefined ? "" : ` (${delta > 0 ? "+" : ""}${delta}${suffix})`;
  element.innerHTML = `<span>${label}</span>${value}${deltaText}`;
}

function renderMetrics() {
  const baseline = state.baselineResult.metrics;
  const latest = state.latestKpiResult?.metrics;
  const label = state.latestKpiResult ? state.latestKpiResult.label || "New case" : "";
  const m = baseline;
  elements.metricIrr.textContent = `${m.irr}%`;
  elements.metricSpread.textContent = `${m.hurdleSpread >= 0 ? "+" : ""}${m.hurdleSpread} pts vs hurdle`;
  elements.metricNpv.textContent = money(m.npv);
  elements.metricCapex.textContent = money(m.totalCapex);
  elements.metricRisk.textContent = `${m.riskScore}/100`;
  elements.metricRiskText.textContent = riskLabel(m.riskScore);

  renderComputedKpi(elements.metricIrrNew, label, latest ? `${latest.irr}%` : "", latest ? Math.round((latest.irr - baseline.irr) * 10) / 10 : null, " pts");
  renderComputedKpi(elements.metricNpvNew, label, latest ? money(latest.npv) : "", latest ? Math.round(latest.npv - baseline.npv) : null, " AEDm");
  renderComputedKpi(elements.metricCapexNew, label, latest ? money(latest.totalCapex) : "", latest ? Math.round(latest.totalCapex - baseline.totalCapex) : null, " AEDm");
  renderComputedKpi(elements.metricRiskNew, label, latest ? `${latest.riskScore}/100` : "", latest ? latest.riskScore - baseline.riskScore : null, " pts");
}

function renderOverview(result) {
  elements.scenarioTitle.textContent = result.label;
  elements.scenarioNarrative.textContent = `${result.narrative.headline} ${result.narrative.insight} ${result.narrative.dependency}`;
  elements.recommendation.textContent = result.narrative.recommendation;

  const assumptions = [
    ["CAPEX change", `${Math.round(result.adjustments.capexIncreasePct * 100)}%`],
    ["Occupancy shift", `${Math.round(result.adjustments.occupancyShiftPct * 100)} pts`],
    ["Power cost", `${Math.round(result.adjustments.powerCostIncreasePct * 100)}%`],
    ["Financing", `${result.adjustments.financingCostIncreaseBps} bps`],
    ["Construction delay", `${result.adjustments.constructionDelayMonths} months`],
    ["Exit yield", `${result.adjustments.exitYieldExpansionBps} bps`]
  ];

  elements.assumptionList.innerHTML = assumptions
    .map(([name, value]) => `<div class="assumption-row"><span>${name}</span><strong>${value}</strong></div>`)
    .join("");

  renderCashFlowChart(result.rows);
  renderCommitteeSummary();
}

function renderCashFlowChart(rows) {
  const width = 980;
  const height = 310;
  const margin = { top: 20, right: 18, bottom: 38, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const values = rows.map((row) => row.freeCashFlowBeforeTerminal);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const scaleY = (value) => margin.top + (max - value) / Math.max(max - min, 1) * chartHeight;
  const zeroY = scaleY(0);
  const barWidth = chartWidth / rows.length * 0.58;

  const bars = rows
    .map((row, index) => {
      const x = margin.left + index * (chartWidth / rows.length) + (chartWidth / rows.length - barWidth) / 2;
      const y = Math.min(scaleY(row.freeCashFlowBeforeTerminal), zeroY);
      const h = Math.abs(scaleY(row.freeCashFlowBeforeTerminal) - zeroY);
      const color = row.freeCashFlowBeforeTerminal >= 0 ? "var(--teal)" : "var(--rose)";
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(h, 2)}" rx="4" fill="${color}"></rect>
        <text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" class="axis-label">${row.year}</text>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" class="axis-label">${row.freeCashFlowBeforeTerminal}</text>
      `;
    })
    .join("");

  elements.cashFlowChart.innerHTML = `
    <svg class="bar-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Annual free cash flow before terminal value">
      <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="#9aa8b6" stroke-width="1"></line>
      <text x="10" y="${margin.top + 10}" class="axis-label">FCF before terminal, AEDm</text>
      ${bars}
    </svg>
  `;
}

function renderComparison() {
  const cases = state.comparison.cases;
  const maxIrr = Math.max(...cases.map((item) => item.metrics.irr), 1);
  elements.scenarioBars.innerHTML = cases
    .map((item) => {
      const className = item.scenario === "downside" ? "rose" : item.scenario === "upside" ? "" : "gold";
      return `
        <article class="comparison-card">
          <div><strong>${item.label}</strong><br><span>${item.description}</span></div>
          <div class="bar-track"><div class="bar-fill ${className}" style="width:${Math.max(8, item.metrics.irr / maxIrr * 100)}%"></div></div>
          <strong>${item.metrics.irr}% IRR</strong>
        </article>
      `;
    })
    .join("");

  elements.capexTable.innerHTML = cases
    .map((item) => `<div class="table-row"><span>${item.label}</span><strong>${money(item.metrics.totalCapex)}</strong></div>`)
    .join("");
}

function renderSensitivity() {
  const levers = state.sensitivity.levers || [];
  const maxDrop = Math.max(...levers.map((item) => Math.abs(item.irrDelta)), 1);
  elements.sensitivityChart.innerHTML = levers
    .map((item) => {
      const width = Math.max(8, Math.abs(item.irrDelta) / maxDrop * 100);
      return `
        <div class="sensitivity-row">
          <strong>${item.lever}</strong>
          <div class="bar-track"><div class="bar-fill ${item.irrDelta < 0 ? "rose" : ""}" style="width:${width}%"></div></div>
          <span>${item.irrDelta > 0 ? "+" : ""}${item.irrDelta} pts IRR</span>
        </div>
      `;
    })
    .join("");
}

function renderRisks() {
  elements.riskDrivers.innerHTML = (state.risks.drivers || [])
    .map((driver) => `
      <div class="driver-row">
        <strong>${driver.name}<span class="badge ${driver.severity.toLowerCase()}">${driver.severity}</span></strong>
        <span>${driver.impact}</span>
        <small>${driver.mitigation}</small>
      </div>
    `)
    .join("");
  renderValueDrivers();
  renderBridge();
}

function renderValueDrivers() {
  if (!elements.valueDrivers) return;
  const drivers = state.valueDrivers?.drivers || [];
  elements.valueDrivers.innerHTML = drivers.length
    ? drivers
        .slice(0, 5)
        .map((driver) => `
          <div class="driver-row">
            <strong>#${driver.rank} ${driver.driver}<span class="badge">${driver.analystMode}</span></strong>
            <span>${driver.irrImpact > 0 ? "+" : ""}${driver.irrImpact} pts IRR, ${driver.npvImpact > 0 ? "+" : ""}${driver.npvImpact} AEDm NPV</span>
          </div>
        `)
        .join("")
    : `<p class="muted-copy">Ask the co-pilot to rank value drivers.</p>`;
}

function renderBridge() {
  if (!elements.bridgePanel) return;
  const bridge = state.bridge?.bridge || [];
  elements.bridgePanel.innerHTML = bridge.length
    ? bridge
        .map((item) => `
          <div class="table-row">
            <span>${item.metric}</span>
            <strong>${item.from} → ${item.to} (${item.delta > 0 ? "+" : ""}${item.delta} ${item.unit})</strong>
          </div>
        `)
        .join("")
    : `<p class="muted-copy">Ask for an IRR bridge from base to downside.</p>`;
}

function renderCommitteeSummary() {
  if (!elements.committeePanel) return;
  const sections = state.committeeSummary?.sections || [];
  elements.committeePanel.innerHTML = sections.length
    ? sections.map((section) => `<div class="summary-row"><strong>${section.title}</strong><span>${section.body}</span></div>`).join("")
    : `<p class="muted-copy">Ask for an investment committee summary.</p>`;
}

function renderDataConfidence() {
  if (!elements.dataConfidence) return;
  const c = state.dataConfidence;
  const warnings = c.warnings?.length ? c.warnings.join(" ") : "No validation warnings.";
  const missing = c.missingFields?.length ? c.missingFields.join(", ") : "None";
  elements.dataConfidence.innerHTML = `
    <div class="table-row"><span>Source</span><strong>${c.source}</strong></div>
    <div class="table-row"><span>Status</span><strong>${c.status}</strong></div>
    <div class="table-row"><span>Rows read</span><strong>${c.rowsRead ?? 0}</strong></div>
    <div class="table-row"><span>Missing fields</span><strong>${missing}</strong></div>
    <div class="confidence-note">${warnings}</div>
  `;
}

function renderFollowUps() {
  if (!elements.followUps) return;
  elements.followUps.innerHTML = state.followUps
    .map((prompt) => `<button data-prompt="${prompt.replaceAll('"', "&quot;")}">${prompt}</button>`)
    .join("");
  elements.followUps.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleTypedPrompt(button.dataset.prompt));
  });
}

function renderCashFlowTable(result) {
  elements.cashFlowTable.innerHTML = result.rows
    .map((row) => `
      <tr>
        <td>${row.year}</td>
        <td>${row.occupancy}%</td>
        <td>${row.revenue}</td>
        <td>${row.opex}</td>
        <td>${row.ebitda}</td>
        <td>${row.capex}</td>
        <td>${row.freeCashFlow}</td>
        <td>${row.terminalValue}</td>
      </tr>
    `)
    .join("");
}

function render() {
  renderMetrics();
  renderOverview(state.currentResult);
  renderComparison();
  renderSensitivity();
  renderRisks();
  renderCashFlowTable(state.currentResult);
  renderDataConfidence();
  renderFollowUps();
}

function inferToolFromPrompt(prompt) {
  const text = prompt.toLowerCase();
  if (text.includes("top risk") || text.includes("risk driver")) {
    return ["explain_risk_drivers", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("rank") || text.includes("value driver")) {
    return ["rank_value_drivers", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("bridge")) {
    return ["explain_metric_bridge", withActiveModel({ fromScenario: "base", toScenario: text.includes("upside") ? "upside" : "downside" })];
  }
  if (text.includes("committee") || text.includes("ic summary") || text.includes("investment committee")) {
    return ["generate_investment_committee_summary", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("stress") || text.includes("severe")) {
    return ["stress_test_case", withActiveModel({ scenario: state.scenario, severity: text.includes("severe") ? "severe" : "moderate" })];
  }
  if (text.includes("validate") || text.includes("data confidence")) {
    return ["validate_finance_model", withActiveModel({})];
  }
  if (text.includes("upload") || text.includes("uploaded model")) {
    return ["read_uploaded_model", { content: state.uploadedFileText, fileName: state.dataConfidence.source }];
  }
  if (text.includes("sensitivity") || text.includes("sensitivities")) {
    return ["run_sensitivity_analysis", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("cash flow") || text.includes("cashflow")) {
    return ["get_cash_flow_breakdown", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("compare") || text.includes("cases")) {
    return ["compare_scenarios", withActiveModel({})];
  }

  const args = { scenario: state.scenario };
  if (text.includes("downside")) args.scenario = "downside";
  if (text.includes("upside")) args.scenario = "upside";
  if (text.includes("base")) args.scenario = "base";
  if (text.includes("capex") && (text.includes("10") || text.includes("ten"))) args.capexIncreasePct = 0.1;
  if (text.includes("occupancy") && (text.includes("5") || text.includes("five")) && (text.includes("slip") || text.includes("lower") || text.includes("downside"))) args.occupancyShiftPct = -0.05;

  return ["update_assumptions", withActiveModel(args)];
}

function handleTypedPrompt(prompt) {
  if (!prompt.trim()) return;
  setVoiceState("Typed fallback", prompt);
  const [toolName, args] = inferToolFromPrompt(prompt);
  const result = financeHandlers[toolName](args);
  applyToolResult(result);
}

function updateApiKeyBtn() {
  const hasKey = Boolean(getSessionKey());
  elements.apiKeyBtn.textContent = hasKey ? "API Key ✓" : "API Key";
  elements.apiKeyBtn.classList.toggle("active", hasKey);
}

async function checkApiStatus() {
  try {
    const response = await fetch(API_BASE + "/api/health");
    const health = await response.json();
    const hasEnvKey = health.realtimeConfigured;
    const hasSessionKey = Boolean(getSessionKey());
    if (hasEnvKey) {
      elements.apiStatus.textContent = `GPT Realtime ready: ${health.realtimeModel}`;
      elements.apiStatus.classList.remove("warning");
    } else if (hasSessionKey) {
      elements.apiStatus.textContent = "GPT Realtime ready (session key)";
      elements.apiStatus.classList.remove("warning");
    } else {
      elements.apiStatus.textContent = "Voice unavailable";
      elements.apiStatus.classList.add("warning");
    }
    updateApiKeyBtn();
  } catch {
    elements.apiStatus.textContent = "Voice server unavailable";
    elements.apiStatus.classList.add("warning");
  }
}

function extractClientSecret(payload) {
  return payload?.value || payload?.client_secret?.value || payload?.client_secret || payload?.secret;
}

function readableError(payload, fallback = "Could not create Realtime session.") {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.error === "string") return payload.error;
  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  if (payload.detail?.message) return payload.detail.message;
  return fallback;
}

async function startVoice() {
  if (state.voice.active) return stopVoice();
  setVoiceState("Starting GPT Realtime voice", "Requesting microphone and secure session.");

  try {
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error("Microphone access needs HTTPS, or open the app on http://localhost.");
    }

    const tokenHeaders = {};
    const sk = getSessionKey();
    if (sk) tokenHeaders["X-OpenAI-Key"] = sk;
    const tokenResponse = await fetch(API_BASE + "/api/realtime-token", { headers: tokenHeaders });
    const tokenPayload = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok) throw new Error(readableError(tokenPayload));

    const clientSecret = extractClientSecret(tokenPayload);
    if (!clientSecret) throw new Error("Realtime client secret was missing from the server response.");

    const pc = new RTCPeerConnection();
    const audio = document.createElement("audio");
    audio.autoplay = true;
    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const dc = pc.createDataChannel("oai-events");
    dc.onopen = () => {
      setVoiceState("Listening with GPT Realtime", "Ask the CFO co-pilot a valuation question.");
    };
    dc.onmessage = (event) => handleRealtimeEvent(JSON.parse(event.data));
    dc.onerror = () => setVoiceState("Voice channel warning", "The typed fallback is still available.");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(errorText || "OpenAI rejected the WebRTC session answer.");
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });

    state.voice = { active: true, pc, dc, stream, audio, pendingCalls: new Map(), muted: false };
    elements.micButton.classList.add("active");
    elements.micButton.setAttribute("aria-label", "Stop voice");
    elements.muteButton.disabled = false;
    elements.muteButton.classList.remove("active");
    elements.muteButton.setAttribute("aria-label", "Mute microphone");
  } catch (error) {
    stopVoice();
    setVoiceState("Voice unavailable", error.message);
  }
}

function stopVoice() {
  if (state.voice.stream) {
    state.voice.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.voice.dc) state.voice.dc.close();
  if (state.voice.pc) state.voice.pc.close();
  state.voice = { active: false, pc: null, dc: null, stream: null, audio: null, pendingCalls: new Map(), muted: false };
  elements.micButton.classList.remove("active");
  elements.micButton.setAttribute("aria-label", "Start voice");
  elements.muteButton.disabled = true;
  elements.muteButton.classList.remove("active");
  elements.muteButton.setAttribute("aria-label", "Mute microphone");
  setVoiceState("Voice idle", "Ask about IRR, CAPEX, downside occupancy, or top risks.");
}

function toggleMute() {
  if (!state.voice.active || !state.voice.stream) return;
  state.voice.muted = !state.voice.muted;
  state.voice.stream.getAudioTracks().forEach((track) => {
    track.enabled = !state.voice.muted;
  });
  elements.muteButton.classList.toggle("active", state.voice.muted);
  elements.muteButton.setAttribute("aria-label", state.voice.muted ? "Unmute microphone" : "Mute microphone");
  setVoiceState(state.voice.muted ? "Microphone muted" : "Listening with GPT Realtime", state.voice.muted ? "Your nearby conversation is not being sent." : "Ask the CFO co-pilot a valuation question.");
}

function sendRealtimeEvent(payload) {
  const dc = state.voice.dc;
  if (!dc || dc.readyState !== "open") return;
  dc.send(JSON.stringify(payload));
}

function handleRealtimeEvent(event) {
  if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
    setVoiceState("CFO asked", event.transcript);
    elements.voiceState.textContent = "Thinking";
  }

  if ((event.type === "response.audio_transcript.delta" || event.type === "response.text.delta") && event.delta) {
    elements.latestTranscript.textContent = `${elements.latestTranscript.textContent} ${event.delta}`.slice(-220);
  }

  if (event.type === "response.function_call_arguments.delta") {
    const existing = state.voice.pendingCalls.get(event.call_id) || { name: event.name, arguments: "" };
    existing.name = existing.name || event.name;
    existing.arguments += event.delta || "";
    state.voice.pendingCalls.set(event.call_id, existing);
  }

  if (event.type === "response.function_call_arguments.done") {
    const existing = state.voice.pendingCalls.get(event.call_id) || {};
    const name = event.name || existing.name;
    const argsText = event.arguments || existing.arguments || "{}";
    executeRealtimeTool(event.call_id, name, argsText);
  }

  if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
    executeRealtimeTool(event.item.call_id, event.item.name, event.item.arguments || "{}");
  }

  if (event.type === "error") {
    setVoiceState("Realtime error", event.error?.message || "The voice session reported an error.");
  }
}

function executeRealtimeTool(callId, name, argsText) {
  if (!callId || !financeHandlers[name]) return;
  const toolLabel = name.replaceAll("_", " ");
  const analyst =
    name.includes("risk") || name.includes("stress") || name.includes("driver")
      ? "Risk Analyst"
      : name.includes("cash") || name.includes("model")
        ? "FP&A Analyst"
        : name.includes("committee") || name.includes("control")
          ? "Controls Analyst"
          : "Valuation Analyst";
  setVoiceState(`Running ${analyst}`, `${toolLabel}: updating the CFO dashboard from deterministic tools.`);
  state.voice.pendingCalls.delete(callId);

  let args = {};
  try {
    args = JSON.parse(argsText || "{}");
  } catch {
    args = {};
  }

  if (name === "read_uploaded_model" && !args.content) {
    args.content = state.uploadedFileText;
    args.fileName = args.fileName || state.dataConfidence.source;
  }
  if (name !== "read_uploaded_model" && name !== "validate_finance_model") {
    args = withActiveModel(args);
  }
  if (name === "validate_finance_model") {
    args = withActiveModel(args);
  }

  const result = financeHandlers[name](args);
  applyToolResult(result);

  sendRealtimeEvent({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: callId,
      output: JSON.stringify(result)
    }
  });

  sendRealtimeEvent({
    type: "response.create",
    response: {
      modalities: ["audio", "text"],
      instructions: "Use the tool output to answer the CFO crisply. Mention the dashboard was updated, whether the case clears hurdle, the top dependency, and one suggested drill-down."
    }
  });
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

elements.scenarioSelect.addEventListener("change", () => {
  applyToolResult(calculateIrrScenario(withActiveModel({ scenario: elements.scenarioSelect.value })));
});

document.querySelector("#compareButton").addEventListener("click", () => applyToolResult(compareScenarios(withActiveModel({}))));
document.querySelector("#sensitivityButton").addEventListener("click", () => applyToolResult(runSensitivityAnalysis(withActiveModel({ scenario: state.scenario }))));
document.querySelector("#cashFlowButton").addEventListener("click", () => applyToolResult(getCashFlowBreakdown(withActiveModel({ scenario: state.scenario }))));

elements.validateModelButton?.addEventListener("click", () => applyToolResult(validateFinanceModel(withActiveModel({}))));

elements.modelUpload?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
    setVoiceState("Upload needs CSV/TSV", "Save Excel as CSV or TSV for this browser prototype.");
    return;
  }
  state.uploadedFileText = await file.text();
  applyToolResult(readUploadedModel({ content: state.uploadedFileText, fileName: file.name }));
});

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = elements.chatInput.value;
  elements.chatInput.value = "";
  handleTypedPrompt(prompt);
});

document.querySelectorAll(".quick-prompts button").forEach((button) => {
  button.addEventListener("click", () => handleTypedPrompt(button.dataset.prompt));
});

elements.micButton.addEventListener("click", startVoice);
elements.muteButton.addEventListener("click", toggleMute);

elements.apiKeyBtn.addEventListener("click", () => {
  elements.apiKeyInput.value = "";
  elements.apiKeyModal.hidden = false;
  elements.apiKeyInput.focus();
});

elements.apiKeySave.addEventListener("click", () => {
  const key = elements.apiKeyInput.value.trim();
  if (key) setSessionKey(key);
  else clearSessionKey();
  elements.apiKeyModal.hidden = true;
  elements.apiKeyInput.value = "";
  checkApiStatus();
});

elements.apiKeyCancel.addEventListener("click", () => {
  elements.apiKeyModal.hidden = true;
  elements.apiKeyInput.value = "";
});

elements.apiKeyModal.addEventListener("click", (e) => {
  if (e.target === elements.apiKeyModal) {
    elements.apiKeyModal.hidden = true;
    elements.apiKeyInput.value = "";
  }
});

checkApiStatus();
render();
