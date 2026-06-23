import assert from "node:assert/strict";
import test from "node:test";
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
  runSensitivityAnalysis
  , stressTestCase,
  updateAssumptions,
  validateFinanceModel
} from "../public/finance.js";

test("scenario calculations return deterministic valuation metrics", () => {
  const base = calculateIrrScenario({ scenario: "base" });
  const downside = calculateIrrScenario({ scenario: "downside" });

  assert.equal(base.type, "scenario");
  assert.equal(base.metrics.totalCapex, 1850);
  assert.ok(base.metrics.irr > 10);
  assert.ok(base.metrics.npv > 0);
  assert.ok(downside.metrics.irr < base.metrics.irr);
  assert.ok(downside.metrics.riskScore > base.metrics.riskScore);
});

test("capex increase lowers valuation output and raises capex", () => {
  const base = calculateIrrScenario({ scenario: "base" });
  const stressed = calculateIrrScenario({ scenario: "base", capexIncreasePct: 0.1 });

  assert.equal(stressed.metrics.totalCapex, 2035);
  assert.ok(stressed.metrics.irr < base.metrics.irr);
  assert.ok(stressed.metrics.npv < base.metrics.npv);
});

test("comparison includes base, upside, and downside cases", () => {
  const comparison = compareCapexCases();
  assert.equal(comparison.type, "comparison");
  assert.deepEqual(comparison.cases.map((item) => item.scenario), ["base", "upside", "downside"]);
});

test("sensitivity ranks downside levers", () => {
  const sensitivity = runSensitivityAnalysis({ scenario: "base" });
  assert.equal(sensitivity.type, "sensitivity");
  assert.equal(sensitivity.levers.length, 6);
  assert.ok(sensitivity.levers[0].irrDelta <= sensitivity.levers.at(-1).irrDelta);
});

test("risk and cash flow tools return CFO demo payloads", () => {
  const risks = explainRiskDrivers({ scenario: "downside" });
  const cashflow = getCashFlowBreakdown({ scenario: "base" });

  assert.equal(risks.type, "risk");
  assert.ok(risks.drivers.some((driver) => driver.name === "Occupancy ramp"));
  assert.equal(cashflow.type, "cashflow");
  assert.equal(cashflow.rows.length, 7);
  assert.ok(cashflow.rows.at(-1).terminalValue > 0);
});

test("v2 tools support assumptions, stress, bridge, value drivers, and committee output", () => {
  const updated = updateAssumptions({ scenario: "base", capexIncreasePct: 0.1, occupancyShiftPct: -0.05 });
  const custom = buildCustomScenario({ name: "CFO downside", capexIncreasePct: 0.1 });
  const comparison = compareScenarios({ scenarios: ["base", "downside"] });
  const drivers = rankValueDrivers({ scenario: "base" });
  const bridge = explainMetricBridge({ fromScenario: "base", toScenario: "downside" });
  const stress = stressTestCase({ scenario: "base", severity: "severe" });
  const summary = generateInvestmentCommitteeSummary({ scenario: "base" });

  assert.equal(updated.type, "assumption_update");
  assert.equal(custom.type, "custom_scenario");
  assert.equal(comparison.cases.length, 2);
  assert.equal(drivers.type, "value_drivers");
  assert.equal(bridge.type, "metric_bridge");
  assert.equal(stress.type, "stress_test");
  assert.equal(summary.type, "committee_summary");
  assert.ok(summary.sections.length >= 4);
});

test("uploaded CSV model is parsed, validated, and compared with seeded model", () => {
  const csv = [
    "year,capex,occupancy,revenue at full occupancy,opex base,power cost,working capital,financing cost",
    "2026,500,25,540,90,62,18,35",
    "2027,650,50,650,115,84,22,51",
    "2028,390,68,780,142,110,24,56",
    "2029,140,80,860,164,126,24,55",
    "2030,45,86,920,180,136,23,52",
    "2031,18,89,950,192,144,22,49",
    "2032,8,91,980,204,151,21,46"
  ].join("\n");

  const uploaded = readUploadedModel({ content: csv, fileName: "demo.csv" });
  const validation = validateFinanceModel({ modelData: uploaded });

  assert.equal(uploaded.type, "uploaded_model");
  assert.equal(uploaded.confidence.status, "complete");
  assert.equal(uploaded.confidence.missingFields.length, 0);
  assert.ok(uploaded.seededComparison);
  assert.equal(validation.type, "model_validation");
});
