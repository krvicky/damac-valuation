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
  validateFinanceModel,
  // v02 Phase 1 functions:
  getDcValueDrivers,
  buildMultiMethodValuation,
  buildWaccStack,
  runEvScenarioSensitivity,
  // v02 Phase 2 functions:
  runBuildVsBuy,
  getPrecedentTransactionComps,
  runScenarioOnEv,
  // v02 Phase 3 functions:
  runQualityOfEarnings,
  buildSynergyModel,
  runDueDiligenceChecklist,
  // v02 Phase 4 functions:
  buildEvidenceChain,
  freezeApprovalGate,
  generateBoardMemo
} from "./finance.v02.js";
import { API_BASE } from "../config.js";

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
  },
  // v02 Phase 1 additions:
  footballField: null,
  latestEvResult: null,
  waccStack: null,
  evSensitivity: null,
  dcDrivers: null,
  // v02 Phase 2 additions:
  buildVsBuy: null,
  precedentComps: null,
  evScenarioComparison: null,
  // v02 Phase 3 additions:
  qoe: null,
  synergyModel: null,
  dueDiligence: null,
  // v02 Phase 4 additions:
  evidenceLog: [],
  evidenceChain: null,
  approvalGates: [],
  activeGateVersion: null,
  boardMemo: null
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
  apiKeyCancel: document.querySelector("#apiKeyCancel"),
  // v02 additions:
  metricEv: document.querySelector("#metricEv"),
  metricEvNew: document.querySelector("#metricEvNew"),
  metricEvSub: document.querySelector("#metricEvSub"),
  metricEvMw: document.querySelector("#metricEvMw"),
  metricEvMwNew: document.querySelector("#metricEvMwNew"),
  footballFieldChart: document.querySelector("#footballFieldChart"),
  footballFieldMethods: document.querySelector("#footballFieldMethods"),
  dcDriversPanel: document.querySelector("#dcDriversPanel"),
  evScenarioPanel: document.querySelector("#evScenarioPanel"),
  waccComponentsPanel: document.querySelector("#waccComponentsPanel"),
  waccSensitivityGrid: document.querySelector("#waccSensitivityGrid"),
  footballFieldButton: document.querySelector("#footballFieldButton"),
  dcDriversButton: document.querySelector("#dcDriversButton"),
  waccButton: document.querySelector("#waccButton"),
  // Phase 2 elements:
  buildVsBuyPanel: document.querySelector("#buildVsBuyPanel"),
  bvbDecisionMatrix: document.querySelector("#bvbDecisionMatrix"),
  compsTable: document.querySelector("#compsTable"),
  compsBenchmarkPanel: document.querySelector("#compsBenchmarkPanel"),
  buildVsBuyButton: document.querySelector("#buildVsBuyButton"),
  compsButton: document.querySelector("#compsButton"),
  evScenarioPanel: document.querySelector("#evScenarioPanel"),
  // Phase 3 elements:
  qoeWaterfall: document.querySelector("#qoeWaterfall"),
  qoeAdjustments: document.querySelector("#qoeAdjustments"),
  qoeDebtItems: document.querySelector("#qoeDebtItems"),
  ddPanel: document.querySelector("#ddPanel"),
  qoeButton: document.querySelector("#qoeButton"),
  ddButton: document.querySelector("#ddButton"),
  synergyBridge: document.querySelector("#synergyBridge"),
  synergyItems: document.querySelector("#synergyItems"),
  synergyButton: document.querySelector("#synergyButton"),
  // Phase 4 elements:
  evidenceChainPanel: document.querySelector("#evidenceChainPanel"),
  evidenceGaps: document.querySelector("#evidenceGaps"),
  evidenceButton: document.querySelector("#evidenceButton"),
  approvalGatePanel: document.querySelector("#approvalGatePanel"),
  freezeGateButton: document.querySelector("#freezeGateButton"),
  boardMemoPanel: document.querySelector("#boardMemoPanel"),
  boardMemoButton: document.querySelector("#boardMemoButton")
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
  validate_finance_model: validateFinanceModel,
  // v02 additions:
  get_dc_value_drivers: getDcValueDrivers,
  build_multi_method_valuation: buildMultiMethodValuation,
  build_wacc_stack: buildWaccStack,
  run_ev_scenario_sensitivity: runEvScenarioSensitivity,
  // Phase 2 handlers:
  run_build_vs_buy: runBuildVsBuy,
  get_precedent_transaction_comps: getPrecedentTransactionComps,
  run_scenario_on_ev: runScenarioOnEv,
  // Phase 3 handlers:
  run_quality_of_earnings: runQualityOfEarnings,
  build_synergy_model: buildSynergyModel,
  run_due_diligence_checklist: runDueDiligenceChecklist,
  // Phase 4 handlers:
  build_evidence_chain: (args) => buildEvidenceChain({ ...args, evidenceLog: state.evidenceLog }),
  freeze_approval_gate: (args) => freezeApprovalGate({ ...args, evidenceLog: state.evidenceLog, metrics: extractCurrentMetrics() }),
  generate_board_memo: (args) => generateBoardMemo({ ...args, gate: state.approvalGates[state.approvalGates.length - 1] || {} })
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

function captureEvidence(result, toolName) {
  if (!result?.type || result.type === "evidence_chain" || result.type === "approval_gate" || result.type === "board_memo") return;
  state.evidenceLog.push({
    id: `EV-${String(state.evidenceLog.length + 1).padStart(3, "0")}`,
    metric: result.type,
    toolCall: toolName,
    scenario: result.scenario || state.scenario,
    timestamp: new Date().toISOString(),
    traceable: true
  });
}

function extractCurrentMetrics() {
  const r = state.latestKpiResult;
  return {
    irr: r ? `${r.metrics?.irr}%` : "--",
    npv: r ? `AEDm ${r.metrics?.npv}` : "--",
    capex: r ? `AEDm ${r.metrics?.totalCapex}` : "--",
    riskScore: r ? `${r.metrics?.riskScore}/100` : "--",
    enterpriseValue: state.footballField ? `AEDm ${state.footballField.enterpriseValue?.mid}` : "--",
    evPerMW: state.footballField ? `AEDm ${state.footballField.impliedEVPerMW?.mid}/MW` : "--",
    normalizedEbitda: state.qoe ? `AEDm ${state.qoe.normalizedEbitda}` : "--",
    maxBid: state.synergyModel ? `AEDm ${state.synergyModel.adjustedMaxBid}` : "--"
  };
}

function applyToolResult(result, toolName = "") {
  if (!result || typeof result !== "object") return;
  captureEvidence(result, toolName);

  if ([
    "scenario", "assumption_update", "custom_scenario", "stress_test",
    "cashflow", "comparison", "sensitivity", "risk", "value_drivers",
    "metric_bridge", "committee_summary", "uploaded_model", "model_validation",
    // v02 additions:
    "football_field", "wacc_stack", "ev_sensitivity", "dc_drivers",
    // Phase 2 additions:
    "build_vs_buy", "precedent_comps", "ev_scenario_comparison",
    // Phase 3:
    "quality_of_earnings", "synergy_model", "due_diligence",
    // Phase 4:
    "evidence_chain", "approval_gate", "board_memo"
  ].includes(result.type)) {
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

  // v02 additions:
  if (result.type === "football_field") {
    state.footballField = result;
    state.latestEvResult = result;
    setActiveTab("valuation");
  }

  if (result.type === "wacc_stack") {
    state.waccStack = result;
    setActiveTab("wacc");
  }

  if (result.type === "ev_sensitivity") {
    state.evSensitivity = result;
    setActiveTab("risk");
  }

  if (result.type === "dc_drivers") {
    state.dcDrivers = result;
    setActiveTab("valuation");
  }

  // Phase 2 branches:
  if (result.type === "build_vs_buy") {
    state.buildVsBuy = result;
    setActiveTab("buildvbuy");
  }

  if (result.type === "precedent_comps") {
    state.precedentComps = result;
    setActiveTab("comps");
  }

  if (result.type === "ev_scenario_comparison") {
    state.evScenarioComparison = result;
    setActiveTab("valuation");
  }

  // Phase 3 branches:
  if (result.type === "quality_of_earnings") {
    state.qoe = result;
    setActiveTab("qoe");
  }

  if (result.type === "synergy_model") {
    state.synergyModel = result;
    setActiveTab("synergies");
  }

  if (result.type === "due_diligence") {
    state.dueDiligence = result;
    setActiveTab("qoe");
  }

  // Phase 4 branches:
  if (result.type === "evidence_chain") {
    state.evidenceChain = result;
    setActiveTab("evidence");
  }

  if (result.type === "approval_gate") {
    state.approvalGates.push(result.gate);
    state.activeGateVersion = result.gate.version;
    // Replace hash with WebCrypto digest asynchronously
    const snapshotStr = JSON.stringify(result.gate);
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshotStr)).then((buf) => {
      const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      result.gate.hashDigest = `sha256-${hex}`;
      if (elements.approvalGatePanel) renderApprovalGate();
    });
    setActiveTab("approvalgate");
  }

  if (result.type === "board_memo") {
    state.boardMemo = result;
    setActiveTab("approvalgate");
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

  // v02 EV KPIs:
  const ff = state.footballField;
  if (elements.metricEv) {
    elements.metricEv.textContent = ff ? `${ff.enterpriseValue.mid.toLocaleString("en-US")} AEDm` : "--";
    if (elements.metricEvSub && ff) {
      elements.metricEvSub.textContent = `Range ${ff.enterpriseValue.low.toLocaleString()}–${ff.enterpriseValue.high.toLocaleString()} AEDm`;
    }
  }
  if (elements.metricEvMw) {
    elements.metricEvMw.textContent = ff ? `${ff.impliedEVPerMW.mid} AEDm/MW` : "--";
  }
  // No delta for EV/EV/MW since there's no separate "baseline" football field — clear computed-kpi
  if (elements.metricEvNew) renderComputedKpi(elements.metricEvNew, ff ? "Football field mid" : "", ff ? `${ff.enterpriseValue.mid} AEDm` : "", null);
  if (elements.metricEvMwNew) renderComputedKpi(elements.metricEvMwNew, ff ? "Implied" : "", ff ? `${ff.impliedEVPerMW.mid}` : "", null);
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

// v02 render functions:

function renderFootballField() {
  const ff = state.footballField;
  if (!elements.footballFieldChart || !elements.footballFieldMethods) return;
  if (!ff) {
    elements.footballFieldChart.innerHTML = `<p class="muted-copy">Ask: "Show me the football field valuation across all four methods."</p>`;
    elements.footballFieldMethods.innerHTML = "";
    return;
  }

  // SVG horizontal football field chart
  const svgWidth = 900, svgHeight = 280;
  const margin = { top: 30, right: 100, bottom: 30, left: 220 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;
  const methods = ff.methods;
  const rowH = chartHeight / methods.length;
  const allValues = methods.flatMap((m) => [m.low, m.high]);
  const dataMin = Math.min(...allValues) * 0.88;
  const dataMax = Math.max(...allValues) * 1.08;
  const scaleX = (v) => margin.left + (v - dataMin) / (dataMax - dataMin) * chartWidth;
  const rowColors = ["var(--navy)", "var(--teal)", "var(--gold)", "var(--rose)"];

  const methodRows = methods.map((m, i) => {
    const y = margin.top + i * rowH + rowH * 0.2;
    const barH = rowH * 0.5;
    const x1 = scaleX(m.low), x2 = scaleX(m.high), xMid = scaleX(m.mid);
    return `
      <text x="${margin.left - 10}" y="${y + barH / 2 + 4}" text-anchor="end" class="ff-method-label" fill="${rowColors[i]}">${m.name}</text>
      <rect x="${x1}" y="${y}" width="${x2 - x1}" height="${barH}" rx="4" fill="${rowColors[i]}" opacity="0.18"></rect>
      <circle cx="${xMid}" cy="${y + barH / 2}" r="6" fill="${rowColors[i]}"></circle>
      <text x="${x1 - 6}" y="${y + barH / 2 + 4}" text-anchor="end" class="ff-axis-label">${m.low.toLocaleString()}</text>
      <text x="${x2 + 6}" y="${y + barH / 2 + 4}" text-anchor="start" class="ff-axis-label">${m.high.toLocaleString()}</text>
      <text x="${xMid}" y="${y - 4}" text-anchor="middle" class="ff-value-label">${m.mid.toLocaleString()}</text>
    `;
  }).join("");

  // Consensus band
  const cx1 = scaleX(ff.enterpriseValue.low), cx2 = scaleX(ff.enterpriseValue.high);
  const consensusBand = `<rect x="${cx1}" y="${margin.top}" width="${cx2 - cx1}" height="${chartHeight}" rx="4" fill="rgba(15,118,110,0.07)" stroke="var(--teal)" stroke-width="1.5" stroke-dasharray="5 3"></rect>
    <text x="${scaleX(ff.enterpriseValue.mid)}" y="${margin.top - 8}" text-anchor="middle" class="ff-value-label" fill="var(--teal)">Consensus ${ff.enterpriseValue.mid.toLocaleString()} AEDm</text>`;

  elements.footballFieldChart.innerHTML = `<svg class="football-field-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Football field enterprise value">
    ${consensusBand}${methodRows}
    <line x1="${scaleX(ff.enterpriseValue.mid)}" y1="${margin.top}" x2="${scaleX(ff.enterpriseValue.mid)}" y2="${svgHeight - margin.bottom}" stroke="var(--teal)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"></line>
  </svg>`;

  // Methods detail table
  elements.footballFieldMethods.innerHTML = `
    <div class="ff-method-row header">
      <span>Method</span><span style="text-align:right">Low</span><span style="text-align:right">Mid</span><span style="text-align:right">High</span><span>Note</span>
    </div>
    ${methods.map((m) => `<div class="ff-method-row">
      <strong>${m.name}</strong>
      <span>${m.low.toLocaleString()}</span>
      <span class="ff-mid-value">${m.mid.toLocaleString()}</span>
      <span>${m.high.toLocaleString()}</span>
      <span style="color:var(--muted);font-size:0.82rem">${m.note || ""}</span>
    </div>`).join("")}
    <div class="ff-method-row" style="border-top:2px solid var(--navy);font-weight:900">
      <strong style="color:var(--navy)">Consensus EV</strong>
      <span>${ff.enterpriseValue.low.toLocaleString()}</span>
      <span class="ff-mid-value">${ff.enterpriseValue.mid.toLocaleString()}</span>
      <span>${ff.enterpriseValue.high.toLocaleString()}</span>
      <span style="color:var(--muted);font-size:0.82rem">EV/MW: ${ff.impliedEVPerMW.mid} · EV/EBITDA: ${ff.impliedEVEBITDA.mid}×</span>
    </div>
  `;
}

function renderDcDrivers() {
  if (!elements.dcDriversPanel) return;
  const dc = state.dcDrivers;
  if (!dc) return;
  const rows = [
    ["Total MW", `${dc.dcEconomics.totalMW} MW`],
    ["Hyperscale / Colo", `${Math.round(dc.dcEconomics.hyperscalePct * 100)}% / ${Math.round(dc.dcEconomics.coloPct * 100)}%`],
    ["ARPU", `AED ${dc.dcEconomics.arpuPerKwPerMonth}/kW/mo`],
    ["PUE", `${dc.dcEconomics.pue}×`],
    ["Stabilization", `${dc.stabilizationYear}`],
    ["Hyperscale MW", `${dc.hyperscaleMW} MW`],
    ["Colo MW", `${dc.coloMW} MW`]
  ];
  const rampCells = dc.dcEconomics.mwOnlineByYear.map((mw, i) =>
    `<div class="dc-ramp-cell"><strong>${mw}</strong>MW<br><span style="font-size:0.68rem;color:var(--muted)">${2026 + i}</span></div>`).join("");
  elements.dcDriversPanel.innerHTML = rows.map(([k, v]) =>
    `<div class="dc-driver-row"><span>${k}</span><strong>${v}</strong></div>`).join("") +
    `<div style="margin-top:12px"><p style="margin:0 0 6px;color:var(--muted);font-size:0.75rem;font-weight:800;text-transform:uppercase">MW Online by Year</p><div class="dc-ramp-row">${rampCells}</div></div>`;
}

function renderWaccStack() {
  if (!elements.waccComponentsPanel || !elements.waccSensitivityGrid) return;
  const ws = state.waccStack;
  if (!ws) return;
  const c = ws.components;
  const componentRows = [
    ["Risk-free rate", `${c.rfRate}%`, ""],
    ["Equity risk premium", `${c.erp}%`, ""],
    ["Beta", `${c.beta}×`, ""],
    ["Cost of equity", `${c.costOfEquity}%`, "= rf + β × ERP"],
    ["Pre-tax debt cost", `${c.debtCost}%`, ""],
    ["After-tax debt cost", `${c.afterTaxDebtCost}%`, `${c.taxRate}% tax shield`],
    ["Leverage", `${c.leverage}%`, "D / (D+E)"]
  ];
  elements.waccComponentsPanel.innerHTML = componentRows.map(([k, v, note]) =>
    `<div class="wacc-component-row"><span>${k}</span><strong>${v}</strong><span style="color:var(--muted);font-size:0.8rem">${note}</span></div>`).join("") +
    `<div class="wacc-component-row total"><span>Blended WACC</span><strong>${c.wacc}%</strong><span></span></div>`;

  const gridRows = ws.sensitivityGrid.map((row) => {
    const isBase = row.bpsDelta === 0;
    const deltaClass = row.evDeltaVsBase > 0 ? "ev-positive" : row.evDeltaVsBase < 0 ? "ev-negative" : "";
    return `<tr class="${isBase ? "base-row" : ""}">
      <td>${row.waccPct}%${isBase ? " (base)" : ""}</td>
      <td>${row.bpsDelta > 0 ? "+" : ""}${row.bpsDelta} bps</td>
      <td>${row.ev.toLocaleString()} AEDm</td>
      <td class="${deltaClass}">${row.evDeltaVsBase > 0 ? "+" : ""}${row.evDeltaVsBase === 0 ? "—" : row.evDeltaVsBase.toLocaleString() + " AEDm"}</td>
    </tr>`;
  }).join("");
  elements.waccSensitivityGrid.innerHTML = `<table class="wacc-grid-table">
    <thead><tr><th>WACC</th><th>vs Base</th><th>EV (DCF terminal)</th><th>EV Delta</th></tr></thead>
    <tbody>${gridRows}</tbody>
  </table>`;
}

function renderEvSensitivity() {
  // EV sensitivity goes in the risk tab's sensitivity chart area (adds EV column)
  // Render as separate sensitivity rows with EV delta alongside IRR delta
  // renderSensitivity() runs first in render(); this overrides it when EV sensitivity has been run
  const evs = state.evSensitivity;
  if (!evs || !elements.sensitivityChart) return;
  const levers = evs.levers || [];
  const maxEvDrop = Math.max(...levers.map((l) => Math.abs(l.evDelta)), 1);
  elements.sensitivityChart.innerHTML = levers.map((item) => {
    const width = Math.max(8, Math.abs(item.evDelta) / maxEvDrop * 100);
    return `<div class="ev-sensitivity-row">
      <strong>${item.lever}</strong>
      <div class="bar-track"><div class="bar-fill ${item.evDelta < 0 ? "rose" : ""}" style="width:${width}%"></div></div>
      <span style="text-align:right">${item.irrDelta > 0 ? "+" : ""}${item.irrDelta} pts IRR</span>
      <span style="text-align:right;color:${item.evDelta < 0 ? "var(--rose)" : "var(--teal)"}; font-weight:800">${item.evDelta > 0 ? "+" : ""}${item.evDelta} AEDm EV</span>
    </div>`;
  }).join("");
}

// Phase 3 render functions:

function renderQoE() {
  const qoe = state.qoe;
  if (!qoe || !elements.qoeWaterfall) return;

  const maxVal = Math.max(qoe.reportedEbitda, qoe.normalizedEbitda);
  const scale = (v) => Math.max(8, Math.round((Math.abs(v) / maxVal) * 200));

  const bars = [
    { label: "Reported EBITDA", value: qoe.reportedEbitda, cls: "reported" },
    ...qoe.adjustments.map((a) => ({ label: a.item.split("(")[0].trim(), value: a.amount, cls: a.amount > 0 ? "addback" : "deduct" })),
    { label: "Normalised EBITDA", value: qoe.normalizedEbitda, cls: "normalised" }
  ];

  elements.qoeWaterfall.innerHTML = bars.map((b, i) => {
    const isLast = i === bars.length - 1;
    const h = scale(b.value);
    return `<div class="qoe-bar-col">
      <strong>AEDm ${b.value > 0 ? "" : ""}${b.value}</strong>
      <div class="qoe-bar ${b.cls}" style="height:${h}px"></div>
      <span>${b.label}</span>
    </div>${!isLast ? '<div class="qoe-connector"></div>' : ""}`;
  }).join("") +
  `<div style="margin-left:20px;align-self:center" class="qoe-quality-badge">
    <span>Quality Score</span>
    <strong>${qoe.qualityScore}/100</strong>
  </div>`;

  if (elements.qoeAdjustments) {
    const adjRows = qoe.adjustments.map((a) => `
      <div class="qoe-adj-row">
        <span>${a.item}</span>
        <span class="qoe-adj-category">${a.category.replace("_", " ")}</span>
        <span class="qoe-adj-amount ${a.amount > 0 ? "positive" : "negative"}">${a.amount > 0 ? "+" : ""}${a.amount} AEDm</span>
      </div>`).join("");
    elements.qoeAdjustments.innerHTML = adjRows +
      `<div style="margin-top:12px;padding:10px;background:#f8f9fa;border-radius:6px;font-size:0.84rem">
        <strong>EV impact at 9.5×:</strong>
        <span style="color:${qoe.effectOnEV < 0 ? "var(--rose)" : "var(--teal)"}; font-weight:900; margin-left:8px">
          ${qoe.effectOnEV > 0 ? "+" : ""}${qoe.effectOnEV} AEDm
        </span>
        <span style="color:var(--muted); margin-left:8px">(Reported EV: ${qoe.reportedEV} → Normalised: ${qoe.normalisedEV})</span>
      </div>
      <p style="margin-top:8px;font-size:0.82rem;color:var(--muted)">${qoe.narrative?.recommendation || ""}</p>`;
  }

  if (elements.qoeDebtItems && qoe.debtLikeItems) {
    elements.qoeDebtItems.innerHTML = `
      <strong style="font-size:0.78rem;text-transform:uppercase;color:var(--muted)">Debt-like items — deduct from bid price</strong>
      ${qoe.debtLikeItems.map((d) => `
        <div class="bvb-metric-row">
          <span>${d.item}</span>
          <strong style="color:var(--rose)">AEDm ${d.amount}</strong>
        </div>`).join("")}
      <div class="bvb-metric-row" style="border-top:2px solid var(--line);font-weight:800">
        <span>Total debt-like deductions</span>
        <strong style="color:var(--rose)">AEDm ${qoe.totalDebtLike}</strong>
      </div>`;
  }
}

function renderDueDiligence() {
  const dd = state.dueDiligence;
  if (!dd || !elements.ddPanel) return;

  const statusColor = { clear: "var(--teal)", conditional: "#b45309", blocked: "var(--rose)" };
  const statusLabel = dd.overallStatus.toUpperCase();

  elements.ddPanel.innerHTML =
    `<div style="margin-bottom:10px;padding:8px 12px;border-radius:6px;background:${statusColor[dd.overallStatus]}1a;border:1px solid ${statusColor[dd.overallStatus]}40;font-size:0.82rem;font-weight:800;color:${statusColor[dd.overallStatus]}">
      DD Status: ${statusLabel} — ${dd.completedChecks}/${dd.totalChecks} checks complete
      ${dd.blockingItems.length > 0 ? ` · ${dd.blockingItems.length} blocker(s)` : ""}
    </div>` +
    dd.categories.map((cat) => `
      <div class="dd-category">
        <div class="dd-category-label">${cat.category}</div>
        ${cat.items.map((item) => `
          <div class="dd-item">
            <div class="dd-item-status ${item.status}"></div>
            <div class="dd-item-text">
              <strong>${item.check}</strong>
              <p>${item.finding}</p>
            </div>
            <span class="dd-risk-badge ${item.riskRating}">${item.riskRating}</span>
          </div>`).join("")}
      </div>`).join("");
}

function renderSynergyModel() {
  const syn = state.synergyModel;
  if (!syn || !elements.synergyBridge) return;

  const maxVal = Math.max(syn.standaloneValue, syn.totalAcquisitionValue);
  const scale = (v) => Math.max(8, Math.round((Math.abs(v) / maxVal) * 220));

  const cols = [
    { label: "Standalone Value", value: syn.standaloneValue, cls: "standalone" },
    { label: "Synergy NPV", value: syn.synergyNPV, cls: "synergies" },
    { label: "Total Acq. Value", value: syn.totalAcquisitionValue, cls: "total" },
    { label: "QoE + Debt-like", value: -(syn.qoeDeduction + syn.debtLikeDeduction), cls: "deduction" },
    { label: "Max Bid (adj.)", value: syn.adjustedMaxBid, cls: "maxbid" }
  ];

  elements.synergyBridge.innerHTML = cols.map((c, i) => {
    const isLast = i === cols.length - 1;
    return `<div class="synergy-col">
      <strong style="color:${c.cls === "deduction" ? "var(--rose)" : c.cls === "maxbid" ? "#7c3aed" : "var(--navy)"}">
        ${c.value < 0 ? "-" : ""}AEDm ${Math.abs(c.value).toLocaleString()}
      </strong>
      <div class="synergy-bar ${c.cls}" style="height:${scale(c.value)}px"></div>
      <span>${c.label}</span>
    </div>${!isLast ? '<div class="synergy-connector"></div>' : ""}`;
  }).join("") +
  `<div style="margin-left:20px;align-self:center;padding:12px 16px;border:1px solid #7c3aed40;border-radius:8px;background:#f5f3ff">
    <span style="font-size:0.75rem;color:var(--muted)">Recommended opening bid</span>
    <div style="font-size:1.2rem;font-weight:900;color:#7c3aed">AEDm ${Math.round(syn.adjustedMaxBid * 0.88).toLocaleString()}</div>
    <span style="font-size:0.73rem;color:var(--muted)">(12% headroom to max AEDm ${syn.adjustedMaxBid.toLocaleString()})</span>
  </div>`;

  if (elements.synergyItems && syn.synergyItems) {
    const header = `<div class="synergy-items-row header"><span>Item</span><span>Type</span><span>Annual (AEDm)</span><span>PV (AEDm)</span></div>`;
    const rows = syn.synergyItems.map((s) => `
      <div class="synergy-items-row">
        <span>${s.item}</span>
        <span class="synergy-type-badge ${s.type}">${s.type.replace("_", " ")}</span>
        <span style="text-align:right;font-weight:800;color:${s.annualAmount < 0 ? "var(--rose)" : "var(--teal)"}">${s.annualAmount > 0 ? "+" : ""}${s.annualAmount}</span>
        <span style="text-align:right;font-weight:800;color:${s.pv < 0 ? "var(--rose)" : "var(--teal)"}">${s.pv > 0 ? "+" : ""}${s.pv}</span>
      </div>`).join("");
    const total = `<div class="synergy-items-row" style="border-top:2px solid var(--line);font-weight:900">
      <span>Total Synergy NPV</span><span></span><span></span>
      <span style="text-align:right;color:var(--teal)">AEDm ${syn.synergyNPV}</span>
    </div>`;
    elements.synergyItems.innerHTML = header + rows + total;
  }
}

// Phase 4 render functions:

function renderEvidenceChain() {
  const ec = state.evidenceChain;
  if (!ec || !elements.evidenceChainPanel) return;

  const traceColor = ec.traceabilityScore >= 85 ? "var(--teal)" : ec.traceabilityScore >= 60 ? "#b45309" : "var(--rose)";
  const readyBadge = ec.readyToFreeze
    ? `<span style="padding:3px 10px;background:var(--teal);color:white;border-radius:999px;font-size:0.72rem;font-weight:800">Ready to Freeze</span>`
    : `<span style="padding:3px 10px;background:#e8edf1;color:var(--muted);border-radius:999px;font-size:0.72rem;font-weight:800">Gaps Remain</span>`;

  elements.evidenceChainPanel.innerHTML =
    `<div class="evidence-score-banner">
      <strong style="color:${traceColor}">${ec.traceabilityScore}%</strong>
      <div>
        <div style="font-size:0.85rem;font-weight:800;color:var(--navy)">Traceability score  ${readyBadge}</div>
        <span>${ec.entries.length} metrics traced · ${ec.gapFlags.length} gap(s)</span>
      </div>
    </div>` +
    ec.entries.map((e) => `
      <div class="evidence-entry">
        <span class="evidence-id">${e.id}</span>
        <div>
          <div class="evidence-metric">${e.label || e.metric}</div>
          <div class="evidence-tool">${e.toolCall} · ${new Date(e.timestamp).toLocaleTimeString()}</div>
        </div>
        <span style="color:var(--muted);font-size:0.78rem">${e.scenario || ""}</span>
        <span class="evidence-traceable-badge ${e.traceable ? "yes" : "no"}">${e.traceable ? "✓ Traced" : "Missing"}</span>
      </div>`).join("") +
    `<p style="margin-top:10px;font-size:0.82rem;color:var(--muted)">${ec.narrative?.recommendation || ""}</p>`;

  if (elements.evidenceGaps) {
    elements.evidenceGaps.innerHTML = ec.gapFlags.length === 0
      ? `<div style="padding:12px;text-align:center;color:var(--teal);font-weight:800;font-size:0.85rem">✓ No gaps — all required metrics are traced.</div>`
      : ec.gapFlags.map((g) => `
          <div class="evidence-gap-row">
            <div>
              <strong>${g.label}</strong>
              <p>${g.resolution}</p>
            </div>
            <span class="dd-risk-badge high">Missing</span>
          </div>`).join("");
  }
}

function renderApprovalGate() {
  const gates = state.approvalGates;
  if (!gates.length || !elements.approvalGatePanel) return;

  const gate = gates[gates.length - 1];
  const metricRows = Object.entries(gate.metrics).map(([k, v]) => `
    <div class="gate-metric-row">
      <span>${k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
      <strong>${v}</strong>
    </div>`).join("");

  elements.approvalGatePanel.innerHTML = `
    <div class="gate-frozen-banner">
      <span class="gate-frozen-badge">FROZEN</span>
      <div>
        <div style="font-size:0.9rem;font-weight:800;color:var(--navy)">${gate.version}</div>
        <div class="gate-hash">${gate.hashDigest}</div>
        <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">${new Date(gate.timestamp).toLocaleString("en-GB")}</div>
      </div>
    </div>
    ${metricRows}
    <p style="margin-top:12px;font-size:0.78rem;color:var(--muted)">${gate.evidenceCount} evidence entries · ${gate.frozenBy}</p>
  `;
}

function renderBoardMemo() {
  const memo = state.boardMemo;
  if (!memo || !elements.boardMemoPanel) return;

  elements.boardMemoPanel.innerHTML =
    `<div class="memo-header-block">
      <h2>Investment Committee Memo</h2>
      <span>Gate: ${memo.version} · Hash: ${memo.hashDigest} · ${memo.timestamp}</span>
    </div>` +
    memo.sections.map((s) => `
      <div class="memo-section">
        <div class="memo-section-header">
          <span class="memo-section-num">${s.id}</span>
          <h3>${s.title}</h3>
        </div>
        <p>${s.content}</p>
      </div>`).join("") +
    `<p style="margin-top:16px;font-size:0.78rem;color:var(--muted)">${memo.narrative?.recommendation || ""}</p>`;
}

// Phase 2 render functions:

function renderBuildVsBuy() {
  const bvb = state.buildVsBuy;
  if (!bvb || !elements.buildVsBuyPanel) return;

  const isRec = (side) => bvb.recommendation === side;

  const card = (side, data, label) => {
    const metrics = [
      ["NPV (AEDm)", data.npv?.toLocaleString()],
      ["IRR (%)", `${data.irr}%`],
      ["Total CAPEX / Acquisition (AEDm)", data.totalCapex?.toLocaleString() || data.acquisitionPriceAEDm?.toLocaleString()],
      ["Time to Revenue", `${data.timeToRevenueMonths} months`],
      ["Execution Risk", `${data.executionRiskScore}/100`],
      ...(side === "buy" ? [["Stabilised EBITDA (AEDm)", data.stabilizedEbitda?.toLocaleString()], ["Implied EV/EBITDA", `${data.impliedEVEBITDA}×`]] : [])
    ];
    return `<div class="bvb-card${isRec(side) ? " recommended" : ""}">
      <h3>${label} ${isRec(side) ? '<span class="bvb-badge">✓ Recommended</span>' : ""}</h3>
      ${metrics.map(([k, v]) => `<div class="bvb-metric-row"><span>${k}</span><strong>${v}</strong></div>`).join("")}
      <ul class="bvb-list"><li><strong>Advantages</strong></li>${data.advantages?.map((a) => `<li>${a}</li>`).join("") || ""}</ul>
      <ul class="bvb-list risks"><li><strong>Risks</strong></li>${data.risks?.map((r) => `<li>${r}</li>`).join("") || ""}</ul>
    </div>`;
  };

  elements.buildVsBuyPanel.innerHTML = `
    <div class="bvb-grid">
      ${card("build", bvb.build, "Build (Greenfield)")}
      ${card("buy", bvb.buy, "Buy (Acquisition)")}
    </div>
    <div class="bvb-recommendation">${bvb.narrative?.recommendation || ""}</div>
    <p style="margin-top:12px;font-size:0.85rem;color:var(--muted)">${bvb.narrative?.insight || ""}</p>
  `;

  if (elements.bvbDecisionMatrix && bvb.decisionMatrix) {
    const header = `<div class="bvb-decision-row header"><span>Criterion</span><span>Build</span><span>Buy</span><span>Weight</span><span>Δ (Wt.)</span></div>`;
    const rows = bvb.decisionMatrix.map((r) => `
      <div class="bvb-decision-row">
        <span>${r.criterion}</span>
        <span>${r.buildScore}</span>
        <span>${r.buyScore}</span>
        <span>${(r.weight * 100).toFixed(0)}%</span>
        <span style="color:${r.weightedDiff > 0 ? "var(--teal)" : "var(--rose)"};font-weight:800">${r.weightedDiff > 0 ? "+" : ""}${r.weightedDiff.toFixed(1)}</span>
      </div>`).join("");
    elements.bvbDecisionMatrix.innerHTML = header + rows;
  }
}

function renderPrecedentComps() {
  const comps = state.precedentComps;
  if (!comps || !elements.compsTable) return;

  const regionLabel = { mena: "MENA", europe: "Europe", north_america: "N. America" };

  const rows = comps.transactions.map((deal) => {
    const isMena = deal.region === "mena";
    return `<tr class="${isMena ? "mena-row" : ""}">
      <td>${deal.deal}</td>
      <td>${regionLabel[deal.region] || deal.region}</td>
      <td>${deal.year}</td>
      <td>${deal.mw}</td>
      <td>${deal.evAEDm?.toLocaleString()}</td>
      <td>${deal.evebitda}×</td>
      <td>${deal.evPerMW}</td>
      <td style="font-size:0.78rem;color:var(--muted)">${deal.note}</td>
    </tr>`;
  }).join("");

  elements.compsTable.innerHTML = `
    <table class="comps-table">
      <thead><tr>
        <th>Deal</th><th>Region</th><th>Year</th><th>MW</th>
        <th>EV (AEDm)</th><th>EV/EBITDA</th><th>EV/MW (AEDm)</th><th>Note</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="damac-row">
          <td>DAMAC DC (implied)</td><td>MENA</td><td>2026–32</td><td>120</td>
          <td>~${comps.damacImplied?.evEBITDA ? (comps.damacImplied.evEBITDA * 510).toLocaleString() : "—"}</td>
          <td>${comps.damacImplied?.evEBITDA}×</td>
          <td>${comps.damacImplied?.evPerMW}</td>
          <td style="font-size:0.78rem;color:var(--teal);font-weight:800">DAMAC (this deal)</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:10px;font-size:0.84rem;color:var(--muted)">${comps.narrative?.headline || ""}</p>
    <p style="margin-top:6px;font-size:0.82rem;color:var(--muted)">${comps.narrative?.insight || ""}</p>
  `;

  if (elements.compsBenchmarkPanel && comps.benchmarkRanges) {
    const { evEBITDA, evPerMW } = comps.benchmarkRanges;
    const { damacImplied, premiumOrDiscount } = comps;
    const pOrD = (v) => v > 0
      ? `<span style="color:var(--teal);font-weight:800">+${v} above median</span>`
      : `<span style="color:var(--rose);font-weight:800">${v} below median</span>`;

    elements.compsBenchmarkPanel.innerHTML = `
      <div class="comps-benchmark-row"><span>EV / EBITDA range</span>
        <strong>${evEBITDA.low}× — ${evEBITDA.high}×  (median ${evEBITDA.median}×)</strong>
        <small>DAMAC implied: ${damacImplied.evEBITDA}×  ${pOrD(premiumOrDiscount.evEBITDA)}</small>
      </div>
      <div class="comps-benchmark-row"><span>EV / MW range (AEDm)</span>
        <strong>${evPerMW.low} — ${evPerMW.high}  (median ${evPerMW.median})</strong>
        <small>DAMAC implied: ${damacImplied.evPerMW} AEDm/MW  ${pOrD(premiumOrDiscount.evPerMW)}</small>
      </div>
      <p style="margin-top:12px;font-size:0.82rem;color:var(--muted)">${comps.narrative?.recommendation || ""}</p>
    `;
  }
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
  // v02 Phase 1:
  renderFootballField();
  renderDcDrivers();
  renderWaccStack();
  renderEvSensitivity();
  // v02 Phase 2:
  renderBuildVsBuy();
  renderPrecedentComps();
  // v02 Phase 3:
  renderQoE();
  renderDueDiligence();
  renderSynergyModel();
  // v02 Phase 4:
  renderEvidenceChain();
  renderApprovalGate();
  renderBoardMemo();
}

function inferToolFromPrompt(prompt) {
  const text = prompt.toLowerCase();

  // v02 additions — checked before v01 patterns:
  if (text.includes("football field") || text.includes("multi method") || text.includes("valuation method") || text.includes("four method")) {
    return ["build_multi_method_valuation", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("wacc") || text.includes("capital structure") || text.includes("cost of capital") || text.includes("discount rate")) {
    return ["build_wacc_stack", {}];
  }
  if (text.includes("ev sensitivity") || text.includes("enterprise value sensitivity") || text.includes("ev tornado")) {
    return ["run_ev_scenario_sensitivity", withActiveModel({ scenario: state.scenario })];
  }
  if (text.includes("dc driver") || text.includes("mw") || text.includes("pue") || text.includes("arpu") || text.includes("hyperscale") || text.includes("contracted mw")) {
    return ["get_dc_value_drivers", withActiveModel({ scenario: state.scenario })];
  }
  // Phase 4 patterns:
  if (text.includes("evidence chain") || text.includes("trace every") || text.includes("traceability") || text.includes("evidence log")) {
    return ["build_evidence_chain", { evidenceLog: state.evidenceLog }];
  }
  if (text.includes("freeze") || text.includes("freeze the gate") || text.includes("freeze approval") || text.includes("ic-v")) {
    const versionMatch = text.match(/ic[-\s]?v?(\d+\.?\d*)/i);
    const version = versionMatch ? `IC-v${versionMatch[1]}` : "IC-v1.0";
    return ["freeze_approval_gate", { version, evidenceLog: state.evidenceLog, metrics: extractCurrentMetrics() }];
  }
  if (text.includes("board memo") || text.includes("ic memo") || text.includes("investment committee memo") || text.includes("generate memo")) {
    return ["generate_board_memo", { gate: state.approvalGates[state.approvalGates.length - 1] || {} }];
  }

  // Phase 3 patterns:
  if (text.includes("quality of earnings") || text.includes("qoe") || text.includes("normalise ebitda") || text.includes("one-time") || text.includes("ebitda inflation")) {
    return ["run_quality_of_earnings", { scenario: state.scenario }];
  }
  if (text.includes("synergy") || text.includes("max bid") || text.includes("maximum bid") || text.includes("acquisition value")) {
    return ["build_synergy_model", {}];
  }
  if (text.includes("due diligence") || text.includes("dd check") || text.includes("diligence checklist") || text.includes("blocking item")) {
    return ["run_due_diligence_checklist", {}];
  }

  // Phase 2 patterns:
  if (text.includes("build vs buy") || text.includes("build versus buy") || text.includes("acquire") || text.includes("acquisition") || text.includes("build or buy")) {
    const buyCapexMatch = text.match(/(?:aed|aedm)[\s,]*?(\d[\d,]+)/i);
    const buyCapex = buyCapexMatch ? parseFloat(buyCapexMatch[1].replace(/,/g, "")) : 2200;
    return ["run_build_vs_buy", { scenario: state.scenario, buyCapex }];
  }
  if (text.includes("precedent comp") || text.includes("m&a comp") || text.includes("transaction comp") || text.includes("ev per mw") || text.includes("precedent deal")) {
    const region = text.includes("mena") ? "mena" : text.includes("europe") ? "europe" : "global";
    return ["get_precedent_transaction_comps", { filterRegion: region }];
  }
  if (text.includes("ev scenario") || text.includes("enterprise value scenario") || text.includes("scenario on ev") || text.includes("ev under")) {
    return ["run_scenario_on_ev", { scenarios: ["base", "upside", "downside"] }];
  }

  // v01 patterns:
  if (text.includes("hurdle") || text.includes("beat the")) {
    return ["calculate_irr_scenario", withActiveModel({ scenario: state.scenario })];
  }
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
  applyToolResult(result, toolName);
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
    const tokenResponse = await fetch(API_BASE + "/api/v02/realtime-token", { headers: tokenHeaders });
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
  setVoiceState(
    state.voice.muted ? "Microphone muted" : "Listening with GPT Realtime",
    state.voice.muted ? "Your nearby conversation is not being sent." : "Ask the CFO co-pilot a valuation question."
  );
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
  applyToolResult(result, name);

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

// Event listeners — all v01 listeners preserved:

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

// v02 Phase 1 button event listeners:
elements.footballFieldButton?.addEventListener("click", () =>
  applyToolResult(buildMultiMethodValuation(withActiveModel({ scenario: state.scenario }))));
elements.dcDriversButton?.addEventListener("click", () =>
  applyToolResult(getDcValueDrivers(withActiveModel({ scenario: state.scenario }))));
elements.waccButton?.addEventListener("click", () =>
  applyToolResult(buildWaccStack({})));

// v02 Phase 2 button event listeners:
elements.buildVsBuyButton?.addEventListener("click", () =>
  applyToolResult(runBuildVsBuy({ scenario: state.scenario })));
elements.compsButton?.addEventListener("click", () =>
  applyToolResult(getPrecedentTransactionComps({})));

// v02 Phase 3 button event listeners:
elements.qoeButton?.addEventListener("click", () =>
  applyToolResult(runQualityOfEarnings({ scenario: state.scenario }), "run_quality_of_earnings"));
elements.ddButton?.addEventListener("click", () =>
  applyToolResult(runDueDiligenceChecklist({}), "run_due_diligence_checklist"));
elements.synergyButton?.addEventListener("click", () =>
  applyToolResult(buildSynergyModel({}), "build_synergy_model"));

// v02 Phase 4 button event listeners:
elements.evidenceButton?.addEventListener("click", () =>
  applyToolResult(buildEvidenceChain({ evidenceLog: state.evidenceLog }), "build_evidence_chain"));
elements.freezeGateButton?.addEventListener("click", () =>
  applyToolResult(freezeApprovalGate({ version: "IC-v1.0", evidenceLog: state.evidenceLog, metrics: extractCurrentMetrics() }), "freeze_approval_gate"));
elements.boardMemoButton?.addEventListener("click", () =>
  applyToolResult(generateBoardMemo({ gate: state.approvalGates[state.approvalGates.length - 1] || {} }), "generate_board_memo"));

checkApiStatus();
render();
