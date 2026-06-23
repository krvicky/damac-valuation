export const baseCase = {
  project: "DAMAC Data Center Campus",
  currency: "AED",
  units: "AEDm",
  discountRate: 0.105,
  hurdleRate: 0.12,
  exitMultiple: 9.5,
  assumptions: {
    capex: 1850,
    capexIncreasePct: 0,
    occupancyShiftPct: 0,
    powerCostIncreasePct: 0,
    financingCostIncreaseBps: 0,
    constructionDelayMonths: 0,
    exitYieldExpansionBps: 0
  },
  years: [2026, 2027, 2028, 2029, 2030, 2031, 2032],
  capexPhasing: [520, 690, 410, 150, 50, 20, 10],
  occupancy: [0.22, 0.48, 0.66, 0.78, 0.84, 0.88, 0.9],
  revenueAtFullOccupancy: [520, 640, 760, 850, 900, 935, 965],
  opexBase: [92, 118, 144, 166, 181, 194, 206],
  powerCost: [64, 88, 112, 128, 138, 146, 153],
  workingCapital: [18, 22, 24, 24, 23, 22, 21],
  financingCost: [36, 52, 58, 57, 54, 50, 47],
  terminalYear: 2032
};

export const scenarioPresets = {
  base: {
    label: "Base Case",
    description: "Approved underwriting case with current capex and occupancy ramp.",
    adjustments: {}
  },
  upside: {
    label: "Upside Case",
    description: "Faster lease-up, lower power cost pressure, and stronger terminal valuation.",
    adjustments: {
      occupancyShiftPct: 0.06,
      powerCostIncreasePct: -0.04,
      capexIncreasePct: -0.02,
      exitYieldExpansionBps: -25
    }
  },
  downside: {
    label: "Downside Case",
    description: "Delayed lease-up, higher construction cost, power inflation, and softer exit.",
    adjustments: {
      occupancyShiftPct: -0.05,
      capexIncreasePct: 0.1,
      powerCostIncreasePct: 0.08,
      financingCostIncreaseBps: 75,
      constructionDelayMonths: 6,
      exitYieldExpansionBps: 50
    }
  }
};

export const sessionInstructions = `
You are DAMAC Properties' CFO finance co-pilot for a board-level Data Center capital investment demo.
Operate like a senior valuation, FP&A, and risk partner speaking to the CFO.

Operating contract:
- First infer the CFO intent: valuation, scenario change, risk, cash flow, model validation, controls, or investment committee output.
- Never invent numbers. For IRR, CAPEX, Opex, revenue, EBITDA, cash flow, NPV, payback, risk, bridge, model upload, or sensitivity questions, call the relevant finance tool.
- Maintain the active scenario in the conversation: selected case, changed assumptions, latest metrics, open risk drivers, and data source.
- Answer in boardroom language: concise, commercial, valuation-focused, and decisive.
- After every tool result, explain what changed, whether the hurdle is cleared, the top dependency, and the next useful drill-down.
- Use AED millions unless the CFO asks otherwise.

Internal analyst modes:
- Valuation Analyst: IRR, NPV, payback, terminal value, hurdle spread.
- FP&A Analyst: revenue, Opex, EBITDA, free cash flow, capex phasing.
- Risk Analyst: sensitivities, stress tests, value drivers, mitigation.
- Controls Analyst: trial balance scrutiny, governance AI, audit readiness.

Demo focus: FIN-01 CFO AI Agent, FIN-05 Data Center FP&A, FIN-06 Data Center CAPEX Budgeting, with FIN-24/27/28 as the alternate risk lens.
`;

export const realtimeFinanceTools = [
  {
    type: "function",
    name: "calculate_irr_scenario",
    description: "Calculate IRR, NPV, payback, EBITDA, free cash flow, and risk score for a Data Center investment scenario.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"], description: "Scenario preset to use." },
        capexIncreasePct: { type: "number", description: "Optional incremental capex change, for example 0.10 for 10%." },
        occupancyShiftPct: { type: "number", description: "Optional occupancy ramp shift, for example -0.05 for 5 percentage points lower." },
        powerCostIncreasePct: { type: "number", description: "Optional power cost change." },
        financingCostIncreaseBps: { type: "number", description: "Optional financing cost increase in basis points." },
        constructionDelayMonths: { type: "number", description: "Optional construction delay in months." },
        exitYieldExpansionBps: { type: "number", description: "Optional terminal yield expansion in basis points." }
      },
      required: ["scenario"]
    }
  },
  {
    type: "function",
    name: "compare_capex_cases",
    description: "Compare base, upside, and downside CAPEX and IRR cases side by side.",
    parameters: {
      type: "object",
      properties: {
        capexIncreasePct: { type: "number", description: "Optional capex increase to apply to comparison cases." }
      }
    }
  },
  {
    type: "function",
    name: "run_sensitivity_analysis",
    description: "Run sensitivities for occupancy, capex, power cost, financing cost, construction delay, and exit yield.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"], description: "Scenario preset to sensitize." }
      }
    }
  },
  {
    type: "function",
    name: "explain_risk_drivers",
    description: "Explain the top risk drivers and mitigation actions for the Data Center investment case.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"], description: "Scenario preset to explain." }
      }
    }
  },
  {
    type: "function",
    name: "get_cash_flow_breakdown",
    description: "Return annual revenue, opex, EBITDA, capex, free cash flow, and terminal value.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"], description: "Scenario preset to inspect." }
      },
      required: ["scenario"]
    }
  },
  {
    type: "function",
    name: "update_assumptions",
    description: "Update the active valuation assumptions and recalculate the current scenario.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside", "custom"] },
        capexIncreasePct: { type: "number" },
        occupancyShiftPct: { type: "number" },
        powerCostIncreasePct: { type: "number" },
        financingCostIncreaseBps: { type: "number" },
        constructionDelayMonths: { type: "number" },
        exitYieldExpansionBps: { type: "number" }
      }
    }
  },
  {
    type: "function",
    name: "build_custom_scenario",
    description: "Build a named custom scenario from a collection of explicit CFO assumption changes.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        capexIncreasePct: { type: "number" },
        occupancyShiftPct: { type: "number" },
        powerCostIncreasePct: { type: "number" },
        financingCostIncreaseBps: { type: "number" },
        constructionDelayMonths: { type: "number" },
        exitYieldExpansionBps: { type: "number" }
      }
    }
  },
  {
    type: "function",
    name: "compare_scenarios",
    description: "Compare multiple scenario names or assumption cases side by side.",
    parameters: {
      type: "object",
      properties: {
        scenarios: { type: "array", items: { type: "string", enum: ["base", "upside", "downside", "custom"] } }
      }
    }
  },
  {
    type: "function",
    name: "rank_value_drivers",
    description: "Rank the biggest value drivers by IRR and NPV impact.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside", "custom"] }
      }
    }
  },
  {
    type: "function",
    name: "explain_metric_bridge",
    description: "Explain the bridge in IRR, NPV, CAPEX, EBITDA, and risk between two scenarios.",
    parameters: {
      type: "object",
      properties: {
        fromScenario: { type: "string", enum: ["base", "upside", "downside", "custom"] },
        toScenario: { type: "string", enum: ["base", "upside", "downside", "custom"] }
      }
    }
  },
  {
    type: "function",
    name: "stress_test_case",
    description: "Run a CFO stress case across CAPEX, occupancy, power, financing, delay, and exit yield.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside", "custom"] },
        severity: { type: "string", enum: ["moderate", "severe"] }
      }
    }
  },
  {
    type: "function",
    name: "generate_investment_committee_summary",
    description: "Generate a structured investment committee summary from the active scenario.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside", "custom"] }
      }
    }
  },
  {
    type: "function",
    name: "read_uploaded_model",
    description: "Read the uploaded CSV or TSV finance model and extract assumptions, CAPEX, revenue, Opex, occupancy, and financing data.",
    parameters: {
      type: "object",
      properties: {
        fileName: { type: "string" }
      }
    }
  },
  {
    type: "function",
    name: "validate_finance_model",
    description: "Validate uploaded or seeded finance model fields and return missing fields, warnings, and data confidence.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

function pct(value) {
  return Math.round(value * 1000) / 10;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalScenario(scenario = "base") {
  return scenario === "custom" ? "base" : scenario;
}

function modelSource(args = {}) {
  return args.modelData && args.modelData.case ? args.modelData.case : baseCase;
}

function mergeAdjustments(scenario = "base", overrides = {}) {
  const preset = scenarioPresets[scenario] || scenarioPresets.base;
  return {
    ...baseCase.assumptions,
    ...preset.adjustments,
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined && value !== null && value !== ""))
  };
}

function irr(cashFlows) {
  let low = -0.95;
  let high = 1.5;
  const npvAt = (rate) => cashFlows.reduce((sum, cf, index) => sum + cf / (1 + rate) ** index, 0);

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const value = npvAt(mid);
    if (value > 0) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

function npv(cashFlows, discountRate) {
  return cashFlows.reduce((sum, cf, index) => sum + cf / (1 + discountRate) ** index, 0);
}

function paybackYear(cashFlows) {
  let cumulative = 0;
  for (let i = 0; i < cashFlows.length; i += 1) {
    const previous = cumulative;
    cumulative += cashFlows[i];
    if (cumulative >= 0 && i > 0) {
      const fraction = Math.abs(previous) / Math.max(cashFlows[i], 1);
      return round(i + fraction, 1);
    }
  }
  return null;
}

function modelScenario(scenario = "base", overrides = {}) {
  const activeCase = modelSource(overrides);
  const adjustments = mergeAdjustments(scenario, overrides);
  const delayFactor = adjustments.constructionDelayMonths > 0 ? Math.min(0.12, adjustments.constructionDelayMonths / 120) : 0;
  const terminalMultiple = Math.max(7.5, activeCase.exitMultiple - adjustments.exitYieldExpansionBps / 100);

  const rows = activeCase.years.map((year, index) => {
    const occupancy = clamp(activeCase.occupancy[index] + adjustments.occupancyShiftPct - delayFactor, 0.05, 0.96);
    const revenue = activeCase.revenueAtFullOccupancy[index] * occupancy;
    const power = activeCase.powerCost[index] * (1 + adjustments.powerCostIncreasePct);
    const opex = activeCase.opexBase[index] + power;
    const ebitda = revenue - opex;
    const financing = activeCase.financingCost[index] * (1 + adjustments.financingCostIncreaseBps / 10000);
    const capex = activeCase.capexPhasing[index] * (1 + adjustments.capexIncreasePct);
    const freeCashFlowBeforeTerminal = ebitda - capex - activeCase.workingCapital[index] - financing;
    return {
      year,
      occupancy: round(occupancy * 100, 1),
      revenue: round(revenue),
      opex: round(opex),
      ebitda: round(ebitda),
      capex: round(capex),
      financing: round(financing),
      workingCapital: activeCase.workingCapital[index],
      freeCashFlowBeforeTerminal: round(freeCashFlowBeforeTerminal),
      terminalValue: 0,
      freeCashFlow: round(freeCashFlowBeforeTerminal)
    };
  });

  const last = rows[rows.length - 1];
  last.terminalValue = round(Math.max(last.ebitda, 0) * terminalMultiple);
  last.freeCashFlow = round(last.freeCashFlowBeforeTerminal + last.terminalValue);

  const cashFlows = rows.map((row) => row.freeCashFlow);
  const computedIrr = irr(cashFlows);
  const computedNpv = npv(cashFlows, activeCase.discountRate);
  const payback = paybackYear(cashFlows);
  const riskScore = clamp(
    38 +
      Math.max(0, adjustments.capexIncreasePct) * 95 +
      Math.max(0, -adjustments.occupancyShiftPct) * 360 +
      Math.max(0, adjustments.powerCostIncreasePct) * 70 +
      adjustments.financingCostIncreaseBps / 12 +
      adjustments.constructionDelayMonths * 1.8 +
      Math.max(0, adjustments.exitYieldExpansionBps) / 3,
    12,
    94
  );

  return {
    scenario,
    label: scenarioPresets[scenario]?.label || scenarioPresets.base.label,
    description: scenarioPresets[scenario]?.description || scenarioPresets.base.description,
    dataSource: overrides.modelData?.confidence?.source || "Seeded DAMAC demo model",
    analystMode: overrides.analystMode || "Valuation Analyst",
    adjustments,
    rows,
    metrics: {
      irr: round(computedIrr * 100, 1),
      npv: round(computedNpv),
      paybackYears: payback,
      totalCapex: round(rows.reduce((sum, row) => sum + row.capex, 0)),
      terminalValue: last.terminalValue,
      finalYearEbitda: last.ebitda,
      avgOccupancy: round(rows.reduce((sum, row) => sum + row.occupancy, 0) / rows.length, 1),
      riskScore: Math.round(riskScore),
      hurdleSpread: round(computedIrr * 100 - activeCase.hurdleRate * 100, 1)
    },
    cashFlows
  };
}

function riskLevel(score) {
  if (score >= 70) return "High";
  if (score >= 48) return "Moderate";
  return "Controlled";
}

function buildNarrative(result) {
  const m = result.metrics;
  const level = riskLevel(m.riskScore);
  const recommendation =
    m.irr >= 13 && m.riskScore < 60
      ? "Proceed to investment committee with focused monitoring on lease-up and power cost."
      : m.irr >= 11
        ? "Proceed only with revised risk mitigants and staged capital release."
        : "Hold approval until occupancy or capex protections improve.";

  return {
    headline: `${result.label}: IRR ${m.irr}%, NPV ${m.npv} AEDm, risk ${level}.`,
    insight: `The project is ${m.hurdleSpread >= 0 ? `${m.hurdleSpread} pts above` : `${Math.abs(m.hurdleSpread)} pts below`} the 12.0% hurdle rate with total CAPEX of ${m.totalCapex} AEDm.`,
    dependency: m.riskScore >= 60 ? "The main dependency is the occupancy ramp combined with construction cost pressure." : "The main dependency is sustaining the lease-up ramp while protecting power margins.",
    recommendation
  };
}

export function calculateIrrScenario(args = {}) {
  const scenario = normalScenario(args.scenario || "base");
  const result = modelScenario(scenario, args);
  return {
    type: "scenario",
    ...result,
    narrative: buildNarrative(result)
  };
}

export function compareCapexCases(args = {}) {
  const cases = ["base", "upside", "downside"].map((scenario) => calculateIrrScenario({ scenario, ...args }));
  return {
    type: "comparison",
    cases,
    narrative: {
      headline: `Base IRR is ${cases[0].metrics.irr}%, upside reaches ${cases[1].metrics.irr}%, downside falls to ${cases[2].metrics.irr}%.`,
      insight: `CAPEX ranges from ${Math.min(...cases.map((item) => item.metrics.totalCapex))} AEDm to ${Math.max(...cases.map((item) => item.metrics.totalCapex))} AEDm.`,
      dependency: "The comparison is most sensitive to lease-up timing and exit yield.",
      recommendation: "Use staged capital gates tied to signed occupancy and power procurement."
    }
  };
}

export function runSensitivityAnalysis(args = {}) {
  const scenario = normalScenario(args.scenario || "base");
  const base = calculateIrrScenario({ scenario });
  const levers = [
    { key: "Occupancy -5 pts", args: { occupancyShiftPct: -0.05 } },
    { key: "CAPEX +10%", args: { capexIncreasePct: 0.1 } },
    { key: "Power cost +8%", args: { powerCostIncreasePct: 0.08 } },
    { key: "Financing +75 bps", args: { financingCostIncreaseBps: 75 } },
    { key: "Delay +6 months", args: { constructionDelayMonths: 6 } },
    { key: "Exit yield +50 bps", args: { exitYieldExpansionBps: 50 } }
  ].map((lever) => {
    const stressed = calculateIrrScenario({ scenario, ...lever.args });
    return {
      lever: lever.key,
      irr: stressed.metrics.irr,
      npv: stressed.metrics.npv,
      riskScore: stressed.metrics.riskScore,
      irrDelta: round(stressed.metrics.irr - base.metrics.irr, 1),
      npvDelta: round(stressed.metrics.npv - base.metrics.npv)
    };
  });

  levers.sort((a, b) => a.irrDelta - b.irrDelta);

  return {
    type: "sensitivity",
    scenario,
    base: base.metrics,
    levers,
    narrative: {
      headline: `${levers[0].lever} is the largest downside sensitivity, moving IRR by ${levers[0].irrDelta} pts.`,
      insight: `The base ${base.label} starts at ${base.metrics.irr}% IRR and ${base.metrics.npv} AEDm NPV.`,
      dependency: "Occupancy, capex control, and exit valuation should be tracked as executive dependencies.",
      recommendation: "Set approval gates around pre-leasing, procurement locks, and debt pricing."
    }
  };
}

export function explainRiskDrivers(args = {}) {
  const result = calculateIrrScenario({ scenario: normalScenario(args.scenario || "base"), ...args });
  const drivers = [
    {
      name: "Occupancy ramp",
      severity: result.adjustments.occupancyShiftPct < 0 ? "High" : "Moderate",
      impact: "Lower signed occupancy delays revenue conversion and reduces early cash flow.",
      mitigation: "Tie capital release to signed tenant commitments and pre-leasing milestones."
    },
    {
      name: "Construction CAPEX",
      severity: result.adjustments.capexIncreasePct > 0.05 ? "High" : "Moderate",
      impact: "Cost escalation compresses IRR and extends payback.",
      mitigation: "Lock procurement packages and isolate contingency drawdowns."
    },
    {
      name: "Power cost",
      severity: result.adjustments.powerCostIncreasePct > 0.05 ? "High" : "Moderate",
      impact: "Energy inflation pressures EBITDA margin as utilization rises.",
      mitigation: "Secure power purchase agreements and pass-through clauses."
    },
    {
      name: "Financing cost",
      severity: result.adjustments.financingCostIncreaseBps > 50 ? "Moderate" : "Low",
      impact: "Higher debt cost lowers free cash flow during ramp-up years.",
      mitigation: "Stage drawdowns and hedge rate exposure before peak spend."
    },
    {
      name: "Exit yield",
      severity: result.adjustments.exitYieldExpansionBps > 25 ? "High" : "Moderate",
      impact: "A softer terminal valuation has a direct effect on project NPV.",
      mitigation: "Maintain optionality on hold period and anchor tenant mix."
    }
  ];

  return {
    type: "risk",
    scenario: result.scenario,
    metrics: result.metrics,
    drivers,
    narrative: {
      headline: `Top risks are occupancy ramp, CAPEX control, and exit yield.`,
      insight: `${result.label} risk score is ${result.metrics.riskScore}/100, classified as ${riskLevel(result.metrics.riskScore)}.`,
      dependency: "Occupancy is the risk that most quickly cascades into revenue, EBITDA, cash flow, and covenant pressure.",
      recommendation: "Use a staged investment approval with explicit gates for leasing, procurement, and financing."
    }
  };
}

export function getCashFlowBreakdown(args = {}) {
  const result = calculateIrrScenario({ scenario: normalScenario(args.scenario || "base"), ...args });
  return {
    type: "cashflow",
    scenario: result.scenario,
    label: result.label,
    metrics: result.metrics,
    rows: result.rows,
    narrative: {
      headline: `${result.label} cumulative free cash flow turns positive in ${result.metrics.paybackYears ?? "the terminal period"} years.`,
      insight: `Final-year EBITDA is ${result.metrics.finalYearEbitda} AEDm and terminal value is ${result.metrics.terminalValue} AEDm.`,
      dependency: "The cash flow bridge is front-loaded with CAPEX and back-loaded with occupancy and terminal value.",
      recommendation: "Use cash flow gates to protect liquidity during the first three years."
    }
  };
}

export function formatPct(value) {
  return `${pct(value / 100)}%`;
}

function assumptionDeltas(args = {}) {
  return {
    capexIncreasePct: args.capexIncreasePct ?? 0,
    occupancyShiftPct: args.occupancyShiftPct ?? 0,
    powerCostIncreasePct: args.powerCostIncreasePct ?? 0,
    financingCostIncreaseBps: args.financingCostIncreaseBps ?? 0,
    constructionDelayMonths: args.constructionDelayMonths ?? 0,
    exitYieldExpansionBps: args.exitYieldExpansionBps ?? 0
  };
}

export function updateAssumptions(args = {}) {
  const result = calculateIrrScenario({ ...args, scenario: normalScenario(args.scenario || "base"), analystMode: "Valuation Analyst" });
  return {
    ...result,
    type: "assumption_update",
    changedAssumptions: assumptionDeltas(args),
    suggestedFollowUps: [
      "Show the IRR bridge versus base.",
      "Rank the value drivers.",
      "Generate an investment committee summary."
    ],
    narrative: {
      headline: `Updated assumptions: IRR ${result.metrics.irr}%, NPV ${result.metrics.npv} AEDm, risk ${riskLevel(result.metrics.riskScore)}.`,
      insight: `The active case now has CAPEX ${Math.round(result.adjustments.capexIncreasePct * 100)}%, occupancy ${Math.round(result.adjustments.occupancyShiftPct * 100)} pts, and ${result.adjustments.constructionDelayMonths} months delay.`,
      dependency: result.narrative.dependency,
      recommendation: result.narrative.recommendation
    }
  };
}

export function buildCustomScenario(args = {}) {
  const result = calculateIrrScenario({ ...args, scenario: "base", analystMode: "Valuation Analyst" });
  return {
    ...result,
    type: "custom_scenario",
    scenario: "custom",
    label: args.name || "Custom CFO Case",
    narrative: {
      headline: `${args.name || "Custom CFO Case"} built at ${result.metrics.irr}% IRR and ${result.metrics.npv} AEDm NPV.`,
      insight: `The custom case ${result.metrics.hurdleSpread >= 0 ? "clears" : "misses"} the 12.0% hurdle by ${Math.abs(result.metrics.hurdleSpread)} pts.`,
      dependency: result.narrative.dependency,
      recommendation: result.narrative.recommendation
    },
    suggestedFollowUps: ["Stress test this case.", "Explain the metric bridge.", "Show the cash flow drilldown."]
  };
}

export function compareScenarios(args = {}) {
  const scenarioList = args.scenarios?.length ? args.scenarios : ["base", "upside", "downside"];
  const cases = scenarioList.map((scenario) => calculateIrrScenario({ ...args, scenario: normalScenario(scenario) }));
  return {
    type: "comparison",
    cases,
    narrative: {
      headline: `Compared ${cases.length} cases: IRR ranges from ${Math.min(...cases.map((item) => item.metrics.irr))}% to ${Math.max(...cases.map((item) => item.metrics.irr))}%.`,
      insight: `NPV range is ${Math.min(...cases.map((item) => item.metrics.npv))} AEDm to ${Math.max(...cases.map((item) => item.metrics.npv))} AEDm.`,
      dependency: "The spread is driven by lease-up, CAPEX discipline, and terminal valuation.",
      recommendation: "Use the low case as the risk gate and the base case as the committee case."
    },
    suggestedFollowUps: ["Rank value drivers.", "Explain base to downside bridge.", "Generate committee summary."]
  };
}

export function rankValueDrivers(args = {}) {
  const sensitivity = runSensitivityAnalysis({ ...args, scenario: normalScenario(args.scenario || "base") });
  const drivers = sensitivity.levers.map((item, index) => ({
    rank: index + 1,
    driver: item.lever,
    irrImpact: item.irrDelta,
    npvImpact: item.npvDelta,
    analystMode: index < 3 ? "Risk Analyst" : "FP&A Analyst"
  }));
  return {
    type: "value_drivers",
    scenario: sensitivity.scenario,
    drivers,
    narrative: {
      headline: `${drivers[0].driver} is the top value driver with ${drivers[0].irrImpact} pts IRR impact.`,
      insight: `The first three drivers explain the most visible downside pressure on the committee case.`,
      dependency: "These drivers should become explicit investment approval gates.",
      recommendation: "Convert the top three drivers into tracked CFO dashboard dependencies."
    },
    suggestedFollowUps: ["Stress test the case.", "Show mitigations.", "Prepare committee wording."]
  };
}

export function explainMetricBridge(args = {}) {
  const from = calculateIrrScenario({ ...args, scenario: normalScenario(args.fromScenario || "base") });
  const to = calculateIrrScenario({ ...args, scenario: normalScenario(args.toScenario || "downside") });
  const bridge = [
    { metric: "IRR", from: from.metrics.irr, to: to.metrics.irr, delta: round(to.metrics.irr - from.metrics.irr, 1), unit: "pts" },
    { metric: "NPV", from: from.metrics.npv, to: to.metrics.npv, delta: round(to.metrics.npv - from.metrics.npv), unit: "AEDm" },
    { metric: "CAPEX", from: from.metrics.totalCapex, to: to.metrics.totalCapex, delta: round(to.metrics.totalCapex - from.metrics.totalCapex), unit: "AEDm" },
    { metric: "Final-year EBITDA", from: from.metrics.finalYearEbitda, to: to.metrics.finalYearEbitda, delta: round(to.metrics.finalYearEbitda - from.metrics.finalYearEbitda), unit: "AEDm" },
    { metric: "Risk score", from: from.metrics.riskScore, to: to.metrics.riskScore, delta: to.metrics.riskScore - from.metrics.riskScore, unit: "pts" }
  ];
  return {
    type: "metric_bridge",
    fromScenario: from.scenario,
    toScenario: to.scenario,
    bridge,
    narrative: {
      headline: `IRR moves from ${from.metrics.irr}% to ${to.metrics.irr}%, a ${round(to.metrics.irr - from.metrics.irr, 1)} pt bridge.`,
      insight: `NPV changes by ${round(to.metrics.npv - from.metrics.npv)} AEDm and risk score moves by ${to.metrics.riskScore - from.metrics.riskScore} pts.`,
      dependency: "The bridge is explained by CAPEX, occupancy, power cost, financing, and terminal valuation.",
      recommendation: "Use this bridge as the CFO-ready explanation for investment committee."
    },
    suggestedFollowUps: ["Rank the value drivers.", "Show cash flow bridge.", "Generate committee summary."]
  };
}

export function stressTestCase(args = {}) {
  const severity = args.severity || "moderate";
  const stress = severity === "severe"
    ? { capexIncreasePct: 0.16, occupancyShiftPct: -0.08, powerCostIncreasePct: 0.12, financingCostIncreaseBps: 125, constructionDelayMonths: 9, exitYieldExpansionBps: 75 }
    : { capexIncreasePct: 0.1, occupancyShiftPct: -0.05, powerCostIncreasePct: 0.08, financingCostIncreaseBps: 75, constructionDelayMonths: 6, exitYieldExpansionBps: 50 };
  const result = calculateIrrScenario({ ...args, ...stress, scenario: normalScenario(args.scenario || "base"), analystMode: "Risk Analyst" });
  return {
    severity,
    ...result,
    type: "stress_test",
    narrative: {
      headline: `${severity === "severe" ? "Severe" : "Moderate"} stress case: IRR ${result.metrics.irr}%, NPV ${result.metrics.npv} AEDm, risk ${riskLevel(result.metrics.riskScore)}.`,
      insight: `The stressed hurdle spread is ${result.metrics.hurdleSpread} pts versus the 12.0% threshold.`,
      dependency: "This stress combines capex escalation, slower lease-up, energy cost pressure, financing, delay, and exit yield.",
      recommendation: result.metrics.irr >= 12 ? "Proceed with gated approval and risk mitigants." : "Do not approve without commercial protections or revised pricing."
    },
    suggestedFollowUps: ["Explain bridge versus base.", "List mitigations.", "Show committee summary."]
  };
}

export function generateInvestmentCommitteeSummary(args = {}) {
  const result = calculateIrrScenario({ ...args, scenario: normalScenario(args.scenario || "base") });
  const risks = explainRiskDrivers({ ...args, scenario: result.scenario });
  return {
    type: "committee_summary",
    scenario: result.scenario,
    metrics: result.metrics,
    sections: [
      { title: "Recommendation", body: result.narrative.recommendation },
      { title: "Valuation", body: `IRR ${result.metrics.irr}%, NPV ${result.metrics.npv} AEDm, payback ${result.metrics.paybackYears ?? "terminal"} years, hurdle spread ${result.metrics.hurdleSpread} pts.` },
      { title: "Capital Ask", body: `Total CAPEX is ${result.metrics.totalCapex} AEDm with front-loaded deployment across 2026 to 2028.` },
      { title: "Top Risks", body: risks.drivers.slice(0, 3).map((driver) => driver.name).join(", ") },
      { title: "Approval Gates", body: "Pre-leasing, procurement lock, power cost pass-through, debt pricing, and terminal-value review." }
    ],
    narrative: {
      headline: `Committee summary ready: ${result.label} ${result.metrics.irr}% IRR and ${result.metrics.npv} AEDm NPV.`,
      insight: `The recommendation is: ${result.narrative.recommendation}`,
      dependency: risks.narrative.dependency,
      recommendation: "Use this as the spoken close for the CFO demo."
    },
    suggestedFollowUps: ["Show the bridge.", "Stress test severe case.", "Open controls risk angle."]
  };
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/[% AED,aedm]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitRows(text = "") {
  const delimiter = text.includes("\t") ? "\t" : ",";
  return text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(delimiter).map((cell) => cell.trim()));
}

function modelFromParsedRows(rows, source) {
  const warnings = [];
  const missingFields = [];
  const headers = rows[0]?.map((cell) => cell.toLowerCase()) || [];
  const yearIndex = headers.findIndex((cell) => cell === "year");
  const find = (names) => names.map((name) => headers.findIndex((cell) => cell === name)).find((index) => index >= 0) ?? -1;
  const indexes = {
    year: yearIndex,
    capex: find(["capex", "capex phasing"]),
    occupancy: find(["occupancy", "occupancy ramp"]),
    revenue: find(["revenue at full occupancy", "revenue_full_occupancy", "full occupancy revenue"]),
    opex: find(["opex base", "opex"]),
    power: find(["power cost", "power"]),
    workingCapital: find(["working capital", "workingcapital"]),
    financing: find(["financing cost", "financing"])
  };

  Object.entries(indexes).forEach(([key, index]) => {
    if (index < 0) missingFields.push(key);
  });

  const dataRows = rows.slice(1).filter((row) => parseNumber(row[indexes.year]) !== null);
  const getSeries = (key, fallback, transform = (value) => value) => {
    if (indexes[key] < 0) return fallback;
    const values = dataRows.map((row) => parseNumber(row[indexes[key]])).filter((value) => value !== null);
    return values.length === fallback.length ? values.map(transform) : fallback;
  };

  if (dataRows.length !== baseCase.years.length) {
    warnings.push(`Expected ${baseCase.years.length} model years; found ${dataRows.length || 0}. Seeded series used where lengths differ.`);
  }

  const occupancy = getSeries("occupancy", baseCase.occupancy, (value) => (value > 1 ? value / 100 : value));
  return {
    type: "uploaded_model",
    case: {
      ...baseCase,
      years: getSeries("year", baseCase.years),
      capexPhasing: getSeries("capex", baseCase.capexPhasing),
      occupancy,
      revenueAtFullOccupancy: getSeries("revenue", baseCase.revenueAtFullOccupancy),
      opexBase: getSeries("opex", baseCase.opexBase),
      powerCost: getSeries("power", baseCase.powerCost),
      workingCapital: getSeries("workingCapital", baseCase.workingCapital),
      financingCost: getSeries("financing", baseCase.financingCost)
    },
    confidence: {
      source,
      status: missingFields.length ? "partial" : "complete",
      missingFields,
      warnings,
      rowsRead: dataRows.length,
      lastScenarioChangedBy: "Uploaded model"
    },
    narrative: {
      headline: missingFields.length ? `Uploaded model read with ${missingFields.length} missing fields.` : "Uploaded model read successfully.",
      insight: `Source is ${source}; ${dataRows.length} annual rows were detected.`,
      dependency: "Missing fields automatically fall back to seeded demo data.",
      recommendation: missingFields.length ? "Use the data confidence panel before presenting uploaded outputs." : "Use the uploaded model as the active data source."
    },
    suggestedFollowUps: ["Validate the finance model.", "Compare uploaded model with seeded case.", "Run downside sensitivity."]
  };
}

export function readUploadedModel(args = {}) {
  if (!args.content) {
    return {
      type: "uploaded_model",
      case: baseCase,
      confidence: {
        source: "Seeded DAMAC demo model",
        status: "no_upload",
        missingFields: [],
        warnings: ["No uploaded model content was available to the tool."],
        rowsRead: 0,
        lastScenarioChangedBy: "Seeded fallback"
      },
      narrative: {
        headline: "No uploaded model is active; using seeded DAMAC demo data.",
        insight: "Upload a CSV or TSV export to activate file-based assumptions.",
        dependency: "The demo remains safe because seeded data is always available.",
        recommendation: "Continue with seeded data or upload a model export."
      },
      suggestedFollowUps: ["Validate the seeded model.", "Run base case.", "Compare scenarios."]
    };
  }

  const rows = splitRows(args.content);
  const uploaded = modelFromParsedRows(rows, args.fileName || "Uploaded finance model");
  const uploadedCase = calculateIrrScenario({ scenario: "base", modelData: uploaded });
  const seededCase = calculateIrrScenario({ scenario: "base" });
  uploaded.seededComparison = {
    uploaded: uploadedCase.metrics,
    seeded: seededCase.metrics,
    deltas: {
      irr: round(uploadedCase.metrics.irr - seededCase.metrics.irr, 1),
      npv: round(uploadedCase.metrics.npv - seededCase.metrics.npv),
      capex: round(uploadedCase.metrics.totalCapex - seededCase.metrics.totalCapex)
    }
  };
  uploaded.narrative.insight = `${uploaded.narrative.insight} Uploaded base IRR is ${uploadedCase.metrics.irr}% versus seeded ${seededCase.metrics.irr}%.`;
  return uploaded;
}

export function validateFinanceModel(args = {}) {
  const modelData = args.modelData;
  const confidence = modelData?.confidence || {
    source: "Seeded DAMAC demo model",
    status: "seeded",
    missingFields: [],
    warnings: [],
    rowsRead: baseCase.years.length,
    lastScenarioChangedBy: "Seeded fallback"
  };
  const warnings = [...(confidence.warnings || [])];
  if (confidence.status === "partial") warnings.push("Some uploaded fields are missing; seeded values are filling gaps.");
  if (confidence.rowsRead && confidence.rowsRead < 5) warnings.push("Model has fewer annual rows than expected for a board valuation view.");

  return {
    type: "model_validation",
    confidence: { ...confidence, warnings },
    narrative: {
      headline: `Data confidence is ${confidence.status || "seeded"} from ${confidence.source}.`,
      insight: confidence.missingFields?.length ? `Missing fields: ${confidence.missingFields.join(", ")}.` : "Required valuation fields are available.",
      dependency: "The valuation engine will only use deterministic fields from the active model or seeded fallback.",
      recommendation: warnings.length ? "Review warnings before using uploaded model outputs in the demo." : "Model is ready for CFO scenario analysis."
    },
    suggestedFollowUps: ["Run base case.", "Stress test uploaded model.", "Generate committee summary."]
  };
}
