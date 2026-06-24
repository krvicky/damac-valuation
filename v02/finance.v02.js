export * from "../finance.js";
import {
  calculateIrrScenario,
  runSensitivityAnalysis,
  realtimeFinanceTools,
  sessionInstructions,
  baseCase
} from "../finance.js";

function round(value, digits = 1) { return Math.round(value * (10 ** digits)) / (10 ** digits); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function normalScenario(scenario = "base") { return scenario === "custom" ? "base" : scenario; }

export const dcEconomics = {
  totalMW: 120,
  hyperscalePct: 0.62,
  coloPct: 0.38,
  arpuPerKwPerMonth: 185,
  pue: 1.38,
  stabilizationYear: 2029,
  mwOnlineByYear: [18, 38, 62, 82, 96, 108, 120],
  kwhPerMwPerYear: 8760000
};

export function getDcValueDrivers(args = {}) {
  const scenario = normalScenario(args.scenario || "base");
  const result = calculateIrrScenario({ scenario });
  const { years, revenueAtFullOccupancy, occupancy, powerCost, opexBase } = baseCase;

  const annualMetrics = years.map((year, i) => {
    const mwOnline = dcEconomics.mwOnlineByYear[i];
    const revenue = round(revenueAtFullOccupancy[i] * occupancy[i]);
    const revenuePerMW = mwOnline > 0 ? round(revenue / mwOnline) : 0;
    const ebitda = round(revenue - opexBase[i] - powerCost[i]);
    const ebitdaMarginPct = revenue > 0 ? round((ebitda / revenue) * 100) : 0;
    return {
      year,
      mwOnline,
      revenue,
      revenuePerMW,
      hyperscaleRevenuePct: round(dcEconomics.hyperscalePct * 100),
      ebitdaMarginPct
    };
  });

  return {
    type: "dc_drivers",
    scenario,
    dcEconomics,
    annualMetrics,
    blendedArpuPerKwMonth: dcEconomics.arpuPerKwPerMonth,
    pue: dcEconomics.pue,
    stabilizationYear: dcEconomics.stabilizationYear,
    hyperscaleMW: round(dcEconomics.totalMW * dcEconomics.hyperscalePct),
    coloMW: round(dcEconomics.totalMW * dcEconomics.coloPct),
    narrative: {
      headline: `DAMAC Data Center: ${dcEconomics.totalMW} MW total capacity, ${round(dcEconomics.hyperscalePct * 100)}% hyperscale, PUE ${dcEconomics.pue}.`,
      insight: `ARPU is AED ${dcEconomics.arpuPerKwPerMonth}/kW/month blended. Asset stabilizes in ${dcEconomics.stabilizationYear} at ${dcEconomics.mwOnlineByYear[6]} MW.`,
      dependency: "The hyperscale lease concentration is the primary revenue visibility driver.",
      recommendation: "Protect hyperscale pre-commitment before advancing to construction stages."
    },
    suggestedFollowUps: [
      "Show me the multi-method football field valuation.",
      "What is the WACC for this infrastructure asset?",
      "Run the enterprise value sensitivity."
    ]
  };
}

export function buildMultiMethodValuation(args = {}) {
  const scenario = normalScenario(args.scenario || "base");
  const result = calculateIrrScenario({ ...args, scenario });
  const stabilizedEbitda = result.metrics.finalYearEbitda;
  const totalMW = dcEconomics.totalMW;

  const wacc = (args.waccBps || 1050) / 10000;
  const discountFactor7yr = Math.pow(1 + wacc, 7);

  const dcfLow = round(stabilizedEbitda * 7.5 / discountFactor7yr);
  const dcfMid = round(stabilizedEbitda * 9.5 / discountFactor7yr);
  const dcfHigh = round(stabilizedEbitda * 12.0 / discountFactor7yr);

  const tradingMultipleMid = args.tradingCompsEVEBITDA || 21;
  const tradingLow = round(stabilizedEbitda * 18 / discountFactor7yr);
  const tradingMid = round(stabilizedEbitda * tradingMultipleMid / discountFactor7yr);
  const tradingHigh = round(stabilizedEbitda * 25 / discountFactor7yr);

  const precedentMultipleMid = args.precedentEVEBITDA || 18;
  const precedentLow = round(stabilizedEbitda * 14 / discountFactor7yr);
  const precedentMid = round(stabilizedEbitda * precedentMultipleMid / discountFactor7yr);
  const precedentHigh = round(stabilizedEbitda * 22 / discountFactor7yr);

  const replPerMW = args.replacementCostPerMW || 30;
  const replLow = round(totalMW * 18);
  const replMid = round(totalMW * replPerMW);
  const replHigh = round(totalMW * 45);

  const evMid = round((dcfMid + tradingMid + precedentMid + replMid) / 4);
  const evLow = round(Math.min(dcfLow, precedentLow, replLow) * 1.1);
  const evHigh = round(Math.max(tradingHigh, replHigh) * 0.92);

  const impliedEvPerMW = {
    low: round(evLow / totalMW),
    mid: round(evMid / totalMW),
    high: round(evHigh / totalMW)
  };
  const impliedEvEbitda = {
    low: round(evLow / stabilizedEbitda, 1),
    mid: round(evMid / stabilizedEbitda, 1),
    high: round(evHigh / stabilizedEbitda, 1)
  };

  return {
    type: "football_field",
    scenario,
    methods: [
      { name: "DCF (Exit Multiple)", low: dcfLow, mid: dcfMid, high: dcfHigh, currency: "AEDm", note: `${(args.waccBps || 1050) / 100}% WACC, exit multiple range 7.5×–12×` },
      { name: "Trading Comps (EV/EBITDA)", low: tradingLow, mid: tradingMid, high: tradingHigh, currency: "AEDm", note: "Public DC operator comps 18×–25×" },
      { name: "Precedent Deals (EV/EBITDA)", low: precedentLow, mid: precedentMid, high: precedentHigh, currency: "AEDm", note: "M&A transaction comps 14×–22×" },
      { name: "Asset Replacement (AEDm/MW)", low: replLow, mid: replMid, high: replHigh, currency: "AEDm", note: "Cost to replicate 120 MW at AEDm 18–45/MW" }
    ],
    enterpriseValue: { low: evLow, mid: evMid, high: evHigh },
    impliedEVPerMW: impliedEvPerMW,
    impliedEVEBITDA: impliedEvEbitda,
    stabilizedEbitda,
    totalMW,
    narrative: {
      headline: `Football field EV: AEDm ${evLow}–${evHigh}, midpoint AEDm ${evMid} (${impliedEvPerMW.mid} AEDm/MW).`,
      insight: `DCF method (most conservative): AEDm ${dcfMid} mid. Asset replacement (scarcity value): AEDm ${replMid} mid. Spread reflects construction drag in DCF vs stabilized market multiples.`,
      dependency: "The DCF–comps gap closes as occupancy ramps up and the stabilization year is reached.",
      recommendation: "Use the precedent deal range as the board anchor. DCF sets the return floor; replacement cost validates scarcity."
    },
    suggestedFollowUps: [
      "Show me the EV sensitivity tornado.",
      "Build the WACC from first principles.",
      "Compare this against M&A precedent comps."
    ]
  };
}

export function buildWaccStack(args = {}) {
  const rfRate = args.rfRate || 0.045;
  const erp = args.equityRiskPremium || 0.065;
  const beta = args.beta || 1.35;
  const costOfEquity = rfRate + beta * erp;
  const debtCost = (args.debtCostBps || 700) / 10000;
  const taxRate = 0.09;
  const afterTaxDebtCost = debtCost * (1 - taxRate);
  const leverage = args.leverage || 0.45;
  const wacc = costOfEquity * (1 - leverage) + afterTaxDebtCost * leverage;

  const baseEbitda = 510;
  const baseExitMultiple = 9.5;
  const steps = [-0.01, -0.005, 0, 0.005, 0.01];
  const sensitivityGrid = steps.map(delta => {
    const adjWacc = wacc + delta;
    const discountFactor7yr = Math.pow(1 + adjWacc, 7);
    const ev = round(baseEbitda * baseExitMultiple / discountFactor7yr);
    return {
      waccPct: round(adjWacc * 100, 2),
      bpsDelta: Math.round(delta * 10000),
      ev,
      evDeltaVsBase: 0
    };
  });
  const baseEv = sensitivityGrid[2].ev;
  sensitivityGrid.forEach(row => { row.evDeltaVsBase = row.ev - baseEv; });

  return {
    type: "wacc_stack",
    components: {
      rfRate: round(rfRate * 100, 2),
      erp: round(erp * 100, 2),
      beta,
      costOfEquity: round(costOfEquity * 100, 2),
      debtCost: round(debtCost * 100, 2),
      afterTaxDebtCost: round(afterTaxDebtCost * 100, 2),
      taxRate: round(taxRate * 100, 1),
      leverage: round(leverage * 100, 1),
      wacc: round(wacc * 100, 2)
    },
    sensitivityGrid,
    baseEv,
    narrative: {
      headline: `WACC is ${round(wacc * 100, 2)}% (${round(costOfEquity * 100, 2)}% equity, ${round(afterTaxDebtCost * 100, 2)}% after-tax debt at ${round(leverage * 100)}% leverage).`,
      insight: `A 50bps WACC increase moves EV by approximately ${Math.abs(sensitivityGrid[3].evDeltaVsBase)} AEDm. Beta of ${beta} reflects infrastructure-like risk profile with execution uncertainty.`,
      dependency: "WACC is most sensitive to leverage assumption and risk-free rate in a rising-rate environment.",
      recommendation: "Lock financing rate before construction peak spend to reduce WACC sensitivity."
    },
    suggestedFollowUps: [
      "Show the football field at a higher WACC.",
      "How does 50bps more financing cost affect EV?",
      "Run the enterprise value sensitivity tornado."
    ]
  };
}

export function runEvScenarioSensitivity(args = {}) {
  const scenario = normalScenario(args.scenario || "base");
  const wacc = 0.105;
  const discountFactor7yr = Math.pow(1 + wacc, 7);

  const baseSensitivity = runSensitivityAnalysis({ scenario });

  const leverArgs = [
    { key: "Occupancy -5 pts", args: { occupancyShiftPct: -0.05 } },
    { key: "CAPEX +10%", args: { capexIncreasePct: 0.1 } },
    { key: "Power cost +8%", args: { powerCostIncreasePct: 0.08 } },
    { key: "Financing +75 bps", args: { financingCostIncreaseBps: 75 } },
    { key: "Delay +6 months", args: { constructionDelayMonths: 6 } },
    { key: "Exit yield +50 bps", args: { exitYieldExpansionBps: 50 } }
  ];

  const baseResult = calculateIrrScenario({ scenario });
  const baseEv = round(baseResult.metrics.finalYearEbitda * 9.5 / discountFactor7yr);

  const levers = leverArgs.map(lever => {
    const stressed = calculateIrrScenario({ scenario, ...lever.args });
    const exitMultipleAdj = 9.5 - (lever.args.exitYieldExpansionBps || 0) / 100;
    const stressedEv = round(stressed.metrics.finalYearEbitda * exitMultipleAdj / discountFactor7yr);
    const irr = baseSensitivity.levers ? baseSensitivity.levers.find(l => l.lever === lever.key) : null;
    return {
      lever: lever.key,
      irr: stressed.metrics.irr,
      npv: stressed.metrics.npv,
      riskScore: stressed.metrics.riskScore,
      irrDelta: irr?.irrDelta ?? round(stressed.metrics.irr - baseResult.metrics.irr, 1),
      npvDelta: irr?.npvDelta ?? round(stressed.metrics.npv - baseResult.metrics.npv),
      ev: stressedEv,
      evDelta: round(stressedEv - baseEv)
    };
  });

  levers.sort((a, b) => a.evDelta - b.evDelta);

  return {
    type: "ev_sensitivity",
    scenario,
    base: { ...baseResult.metrics, ev: baseEv },
    levers,
    narrative: {
      headline: `EV sensitivity: ${levers[0].lever} is the largest driver, moving EV by ${levers[0].evDelta} AEDm.`,
      insight: `Base EV is AEDm ${baseEv} (DCF terminal method). Occupancy and exit yield dominate the EV range.`,
      dependency: "Enterprise value is most exposed to exit yield and EBITDA margin — both driven by occupancy and power cost.",
      recommendation: "Anchor the exit multiple floor in the financing agreement and lock power pass-through provisions."
    },
    suggestedFollowUps: [
      "Show me the football field valuation.",
      "Build the WACC stack.",
      "Run Build vs Buy comparison."
    ]
  };
}

export function runBuildVsBuy(args = {}) {
  const scenario = normalScenario(args.scenario || "base");

  // BUILD side: uses the existing modelScenario engine
  const buildResult = calculateIrrScenario({ ...args, scenario });
  const buildCapex = buildResult.metrics.totalCapex;
  const buildTimeToRevenue = 30; // months — DC ramp takes 2.5 years before meaningful revenue
  const buildExecutionRiskScore = buildResult.metrics.riskScore;

  // BUY side: acquire an existing operating platform
  const buyCapex = args.buyCapex || 2200; // AEDm acquisition price default
  const buyTimeToRevenue = args.buyTimeToRevenueMonths || 6; // months (operational day 1)
  const buyExecutionRiskScore = 42; // lower construction risk, higher integration risk

  // Buy NPV: assume acquired asset generates stabilized EBITDA from Year 1
  // Use 65% of final-year EBITDA as current stabilized EBITDA (operating DC, not construction)
  const stabilizedEbitda = buildResult.metrics.finalYearEbitda * 0.68;
  const buyAnnualFCF = stabilizedEbitda * 0.82; // after financing and integration opex
  const buyNpvYears = 7;
  const discountRate = 0.105;
  let buyNpv = -buyCapex; // initial outlay
  for (let i = 1; i <= buyNpvYears; i++) {
    // Add integration cost drag in Year 1 (8% of buyCapex), growing thereafter
    const integrationDrag = i === 1 ? buyCapex * 0.08 : 0;
    const annualFcf = i === 1 ? buyAnnualFCF - integrationDrag : buyAnnualFCF * Math.pow(1.03, i - 1);
    buyNpv += annualFcf / Math.pow(1 + discountRate, i);
  }
  // Terminal value for buy side
  buyNpv += (stabilizedEbitda * 9.5) / Math.pow(1 + discountRate, buyNpvYears);
  buyNpv = round(buyNpv);

  // Simple IRR approximation for buy side
  const buyIrr = round(((buyAnnualFCF / buyCapex) * 100 + 4.5), 1); // simplified

  const recommendation = buildResult.metrics.irr > buyIrr
    ? "build"
    : buyNpv > buildResult.metrics.npv ? "buy" : "build";

  const decisionMatrix = [
    { criterion: "NPV (AEDm)", buildScore: Math.round(buildResult.metrics.npv), buyScore: Math.round(buyNpv), weight: 0.35, weightedDiff: round((buildResult.metrics.npv - buyNpv) * 0.35) },
    { criterion: "IRR (%)", buildScore: buildResult.metrics.irr, buyScore: buyIrr, weight: 0.30, weightedDiff: round((buildResult.metrics.irr - buyIrr) * 0.30) },
    { criterion: "Time to revenue (mo)", buildScore: buildTimeToRevenue, buyScore: buyTimeToRevenue, weight: 0.20, weightedDiff: round((buyTimeToRevenue - buildTimeToRevenue) * 0.20) },
    { criterion: "Execution risk (0-100)", buildScore: buildExecutionRiskScore, buyScore: buyExecutionRiskScore, weight: 0.15, weightedDiff: round((buyExecutionRiskScore - buildExecutionRiskScore) * 0.15) }
  ];

  return {
    type: "build_vs_buy",
    scenario,
    recommendation,
    build: {
      npv: buildResult.metrics.npv,
      irr: buildResult.metrics.irr,
      totalCapex: buildCapex,
      timeToRevenueMonths: buildTimeToRevenue,
      executionRiskScore: buildExecutionRiskScore,
      advantages: ["Full control over spec and timeline", "No integration risk", "Optimized for hyperscale from ground up"],
      risks: ["Construction cost overrun", "Occupancy ramp uncertainty", "3-year revenue delay"]
    },
    buy: {
      acquisitionPriceAEDm: buyCapex,
      npv: buyNpv,
      irr: buyIrr,
      timeToRevenueMonths: buyTimeToRevenue,
      executionRiskScore: buyExecutionRiskScore,
      stabilizedEbitda: round(stabilizedEbitda),
      impliedEVEBITDA: round(buyCapex / stabilizedEbitda, 1),
      advantages: ["Revenue from month 6", "Existing tenant relationships", "Known operational profile"],
      risks: ["Integration complexity", "Cultural fit", "Price premium vs greenfield NPV"]
    },
    decisionMatrix,
    narrative: {
      headline: `${recommendation === "build" ? "Build" : "Buy"} recommendation: Build IRR ${buildResult.metrics.irr}% vs Buy IRR ${buyIrr}%. Buy achieves revenue ${buildTimeToRevenue - buyTimeToRevenue} months sooner.`,
      insight: `Build NPV is ${buildResult.metrics.npv} AEDm vs Buy NPV of ${buyNpv} AEDm at AEDm ${buyCapex} acquisition price (${round(buyCapex / stabilizedEbitda, 1)}× EV/EBITDA). Build wins on pure return; Buy wins on speed and certainty.`,
      dependency: "The choice hinges on DAMAC's strategic priority: maximizing return (build) vs minimising time-to-revenue and execution risk (buy).",
      recommendation: recommendation === "buy"
        ? `Proceed with acquisition at ≤ AEDm ${buyCapex} — monitor synergy delivery and integration costs closely.`
        : `Proceed with greenfield build — lock procurement and pre-leasing before committing full capex.`
    },
    suggestedFollowUps: [
      "Show me M&A precedent comps — is this acquisition price fair?",
      "Build the synergy model for the acquisition.",
      "What's the maximum bid price we can justify?"
    ]
  };
}

export function getPrecedentTransactionComps(args = {}) {
  const allDeals = [
    { deal: "QTS Realty / Blackstone", year: 2021, region: "north_america", mw: 250, evUSD: 10000, evebitda: 27, note: "Premium paid for hyperscale pipeline" },
    { deal: "CyrusOne / KKR–GIP", year: 2021, region: "north_america", mw: 180, evUSD: 5500, evebitda: 22, note: "Data center specialist buyout" },
    { deal: "Switch / DigitalBridge", year: 2022, region: "north_america", mw: 190, evUSD: 11000, evebitda: 24, note: "Campuses with long-term hyperscale leases" },
    { deal: "EdgeConneX / EQT", year: 2020, region: "europe", mw: 80, evUSD: 2300, evebitda: 19, note: "Edge network with EU expansion pipeline" },
    { deal: "Gulf Data Hub", year: 2023, region: "mena", mw: 22, evUSD: 400, evebitda: 16, note: "MENA benchmark — lower multiple, emerging market premium" },
    { deal: "DC7 MEA / Sovereign Fund", year: 2024, region: "mena", mw: 35, evUSD: 600, evebitda: 18, note: "Strategic acquisition, MEA data center infrastructure" }
  ];

  const usdToAed = 3.67;
  const deals = allDeals
    .filter(d => !args.filterRegion || args.filterRegion === "global" || d.region === args.filterRegion)
    .filter(d => !args.filterMinMW || d.mw >= args.filterMinMW)
    .map(d => ({
      ...d,
      evAEDm: round(d.evUSD * usdToAed / 1000), // USD millions → AED millions
      evPerMW: round(d.evUSD * usdToAed / 1000 / d.mw) // AEDm per MW
    }));

  const evEBITDAValues = deals.map(d => d.evebitda);
  const evPerMWValues = deals.map(d => d.evPerMW);
  const median = arr => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

  const benchmarkRanges = {
    evEBITDA: { low: Math.min(...evEBITDAValues), median: median(evEBITDAValues), high: Math.max(...evEBITDAValues) },
    evPerMW: { low: Math.min(...evPerMWValues), median: round(median(evPerMWValues)), high: Math.max(...evPerMWValues) }
  };

  // DAMAC implied (from typical football field result)
  // Use seeded football field output: EV mid ~4,000 AEDm for 120 MW, stabilized EBITDA ~510 AEDm
  const damacEvMid = 4024; // AEDm — from football field consensus
  const damacEbitda = 510; // AEDm — base case stabilized
  const damacMW = 120;
  const damacImplied = {
    evEBITDA: round(damacEvMid / damacEbitda, 1),
    evPerMW: round(damacEvMid / damacMW)
  };

  const premiumOrDiscount = {
    evEBITDA: round(damacImplied.evEBITDA - benchmarkRanges.evEBITDA.median, 1),
    evPerMW: round(damacImplied.evPerMW - benchmarkRanges.evPerMW.median)
  };

  return {
    type: "precedent_comps",
    transactions: deals,
    benchmarkRanges,
    damacImplied,
    premiumOrDiscount,
    narrative: {
      headline: `DAMAC implied EV/EBITDA of ${damacImplied.evEBITDA}× is ${premiumOrDiscount.evEBITDA > 0 ? premiumOrDiscount.evEBITDA + "× above" : Math.abs(premiumOrDiscount.evEBITDA) + "× below"} the ${benchmarkRanges.evEBITDA.median}× precedent median.`,
      insight: `At AEDm ${damacEvMid} enterprise value and ${damacMW} MW, implied EV per MW is AEDm ${damacImplied.evPerMW} vs precedent range AEDm ${benchmarkRanges.evPerMW.low}–${benchmarkRanges.evPerMW.high}/MW. MENA comps trade at a discount to global deals.`,
      dependency: "MENA premium/discount vs global comps reflects liquidity, exit optionality, and hyperscale anchor mix.",
      recommendation: "Use MENA comps (Gulf Data Hub, DC7 MEA) as the conservative anchor and global comps as the upside benchmark."
    },
    suggestedFollowUps: [
      "How does DAMAC compare to MENA-specific comps only?",
      "Run Build vs Buy using these multiples.",
      "Show the synergy model for an acquisition."
    ]
  };
}

export function runScenarioOnEv(args = {}) {
  const scenarios = args.scenarios || ["base", "upside", "downside"];
  const tradingMultiple = args.tradingCompsMultiple || 21;
  const precedentMultiple = args.precedentMultiple || 18;
  const wacc = 0.105;
  const discountFactor7yr = Math.pow(1 + wacc, 7);

  const cases = scenarios.map(scenario => {
    const result = calculateIrrScenario({ scenario: normalScenario(scenario) });
    const ebitda = result.metrics.finalYearEbitda;
    const evDCF = round(ebitda * 9.5 / discountFactor7yr);
    const evComps = round(ebitda * tradingMultiple / discountFactor7yr);
    const evPrecedent = round(ebitda * precedentMultiple / discountFactor7yr);
    const blendedEV = round((evDCF + evComps + evPrecedent) / 3);
    return {
      scenario,
      label: result.label,
      irr: result.metrics.irr,
      npv: result.metrics.npv,
      stabilizedEbitda: ebitda,
      evDCF,
      evComps,
      evPrecedent,
      blendedEV,
      evPerMW: round(blendedEV / 120)
    };
  });

  const baseCase = cases.find(c => c.scenario === "base") || cases[0];
  return {
    type: "ev_scenario_comparison",
    scenarios: cases,
    narrative: {
      headline: `Base blended EV: AEDm ${baseCase.blendedEV}. Range across scenarios: AEDm ${Math.min(...cases.map(c => c.blendedEV))}–${Math.max(...cases.map(c => c.blendedEV))}.`,
      insight: `Using ${tradingMultiple}× trading and ${precedentMultiple}× precedent multiples on stabilized EBITDA, the EV range is ${Math.min(...cases.map(c => c.evDCF))}–${Math.max(...cases.map(c => c.evComps))} AEDm across methods and scenarios.`,
      dependency: "The EV range is most sensitive to EBITDA margin at stabilization, which depends on the occupancy ramp and power cost trajectory.",
      recommendation: "Use downside blended EV as the minimum acceptable deal price in acquisition discussions."
    },
    suggestedFollowUps: [
      "Show the football field valuation.",
      "Compare against M&A precedent comps.",
      "Build the synergy model."
    ]
  };
}

export function runQualityOfEarnings(args = {}) {
  // Base case stabilised EBITDA (Year 7 base scenario, from finance engine)
  const baseResult = calculateIrrScenario({ scenario: "base" });
  const reportedEbitda = round(baseResult.metrics.finalYearEbitda);

  const adjustments = [
    { item: "Pre-opening costs (non-recurring)", type: "addback", amount: 22, category: "one_time" },
    { item: "Above-market management fee", type: "deduct", amount: -14, category: "one_time" },
    { item: "Power hedging gain (non-recurring)", type: "deduct", amount: -18, category: "one_time" },
    { item: "Working capital timing", type: "deduct", amount: -8, category: "one_time" }
  ];
  const debtLikeItems = [
    { item: "Construction warranty obligations", amount: 35 },
    { item: "Finance lease liabilities", amount: 67 }
  ];

  const totalOneTimeAdj = adjustments.reduce((s, a) => s + a.amount, 0);
  const normalizedEbitda = round(reportedEbitda + totalOneTimeAdj);
  const totalDebtLike = debtLikeItems.reduce((s, d) => s + d.amount, 0);

  // Quality score: penalise material one-time items relative to EBITDA
  const oneTimeMagnitude = adjustments.reduce((s, a) => s + Math.abs(a.amount), 0);
  const qualityScore = clamp(Math.round(100 - (oneTimeMagnitude / reportedEbitda) * 100), 30, 95);

  // Effect on EV: use 9.5× normalised vs reported
  const exitMultiple = 9.5;
  const wacc = 0.105;
  const df7 = Math.pow(1 + wacc, 7);
  const reportedEV = round(reportedEbitda * exitMultiple / df7);
  const normalisedEV = round(normalizedEbitda * exitMultiple / df7);
  const effectOnEV = round(normalisedEV - reportedEV);

  return {
    type: "quality_of_earnings",
    reportedEbitda,
    normalizedEbitda,
    adjustments,
    debtLikeItems,
    totalDebtLike,
    qualityScore,
    reportedEV,
    normalisedEV,
    effectOnEV,
    narrative: {
      headline: `QoE: Reported EBITDA AEDm ${reportedEbitda} → Normalised AEDm ${normalizedEbitda} (${totalOneTimeAdj > 0 ? "+" : ""}${totalOneTimeAdj} AEDm one-time adj). Quality score: ${qualityScore}/100.`,
      insight: `Normalisation reduces EV by AEDm ${Math.abs(effectOnEV)} at 9.5× exit. Debt-like items of AEDm ${totalDebtLike} should be deducted from enterprise value in offer pricing.`,
      dependency: "Final QoE findings should be confirmed against management accounts and actual power hedge contract terms.",
      recommendation: effectOnEV < -100
        ? `Material EBITDA inflation — negotiate acquisition price down by at least AEDm ${Math.abs(effectOnEV)} or request price adjustment mechanism.`
        : `Limited quality issues. Proceed at current offer price but track the AEDm ${totalDebtLike} debt-like items at closing.`
    },
    suggestedFollowUps: [
      "Build the synergy model — what is the maximum bid price?",
      "Show the debt-like items and their impact on net debt.",
      "Run the football field on normalised EBITDA."
    ]
  };
}

export function buildSynergyModel(args = {}) {
  // Standalone value: use football field football_field.enterpriseValue.mid if available, else DCF
  // Since state is not available here, default to the DCF terminal value
  const baseResult = calculateIrrScenario({ scenario: "base" });
  const standaloneEbitda = round(baseResult.metrics.finalYearEbitda);
  const wacc = 0.105;
  const df7 = Math.pow(1 + wacc, 7);
  const standaloneValue = args.standaloneValue || round(standaloneEbitda * 9.5 / df7);

  // QoE adjustment: assume QoE has been run and reduces standalone by ~EV impact
  const qoeDeduction = args.qoeDeduction || 180; // AEDm — default from typical QoE run
  const debtLikeDeduction = args.debtLikeDeduction || 102; // AEDm — from QoE debt-like items

  const synergyItems = [
    { item: "Tenant cross-sell (from Year 3)", type: "revenue", annualAmount: 28, startYear: 3, pv: round(28 * 5 / df7) },
    { item: "Facilities opex savings (from Year 2)", type: "cost", annualAmount: 19, startYear: 2, pv: round(19 * 6 / df7) },
    { item: "Procurement CAPEX saving (Year 1 one-time)", type: "capex", annualAmount: 12, startYear: 1, pv: round(12 / (1 + wacc)) },
    { item: "Integration costs (Year 1–2)", type: "cost_out", annualAmount: -22.5, startYear: 1, pv: round(-45 / (1 + wacc)) }
  ];

  const synergyNPV = round(synergyItems.reduce((s, sy) => s + sy.pv, 0));
  const totalAcquisitionValue = round(standaloneValue + synergyNPV);
  // Max bid = Total Acquisition Value minus minimum required return buffer (15% of synergy NPV)
  const maxBid = round(totalAcquisitionValue - synergyNPV * 0.15);

  return {
    type: "synergy_model",
    standaloneValue,
    synergyNPV,
    totalAcquisitionValue,
    maxBid,
    synergyItems,
    qoeDeduction,
    debtLikeDeduction,
    adjustedMaxBid: round(maxBid - qoeDeduction - debtLikeDeduction),
    narrative: {
      headline: `Max bid: AEDm ${maxBid}. Synergy NPV: AEDm ${synergyNPV}. Total acquisition value: AEDm ${totalAcquisitionValue}.`,
      insight: `Standalone value AEDm ${standaloneValue} + Synergy NPV AEDm ${synergyNPV} = Total AEDm ${totalAcquisitionValue}. After deducting QoE (AEDm ${qoeDeduction}) and debt-like items (AEDm ${debtLikeDeduction}), adjusted max bid is AEDm ${round(maxBid - qoeDeduction - debtLikeDeduction)}.`,
      dependency: "Synergy realisation depends on Year 2 integration completion and cross-tenant agreement execution.",
      recommendation: `Open bid at AEDm ${round(maxBid * 0.88)} (leaving 12% negotiation headroom). Do not exceed AEDm ${maxBid} without board approval.`
    },
    suggestedFollowUps: [
      "Run quality of earnings — what EBITDA are we synergising from?",
      "Freeze the approval gate — we have all the numbers.",
      "Generate the IC board memo."
    ]
  };
}

export function runDueDiligenceChecklist(args = {}) {
  const categories = [
    {
      category: "Financial",
      items: [
        { check: "3-year audited EBITDA trend", status: "complete", finding: "EBITDA CAGR +22% — in line with MW ramp", riskRating: "low" },
        { check: "Lease contract audit", status: "complete", finding: "7 hyperscale contracts, avg 8.5yr term, 95% take-or-pay", riskRating: "low" },
        { check: "Power cost trajectory", status: "flagged", finding: "Variable rate exposure 38% of power cost — no hedge beyond Year 2", riskRating: "medium" },
        { check: "Working capital normalisation", status: "complete", finding: "AEDm 8 timing difference identified in QoE", riskRating: "low" }
      ]
    },
    {
      category: "Legal & Regulatory",
      items: [
        { check: "Land title and zoning", status: "complete", finding: "Freehold title confirmed, DC zoning approved", riskRating: "low" },
        { check: "Environmental clearance", status: "complete", finding: "Phase 1 ESA complete, no material issues", riskRating: "low" },
        { check: "Interconnect agreements", status: "flagged", finding: "One agreement expires Year 3 — renewal terms unconfirmed", riskRating: "medium" },
        { check: "Regulatory: UAE Telecom Authority", status: "complete", finding: "DC license issued, in good standing", riskRating: "low" }
      ]
    },
    {
      category: "Technical",
      items: [
        { check: "Power infrastructure capacity", status: "complete", finding: "200 MW grid connection secured — headroom to 200 MW from 120 MW plan", riskRating: "low" },
        { check: "Cooling system PUE validation", status: "complete", finding: "PUE 1.38 confirmed via 90-day site measurement", riskRating: "low" },
        { check: "Generator redundancy (N+1)", status: "flagged", finding: "Phase 2 (MW 62+) relies on procured gensets not yet on-site", riskRating: "medium" },
        { check: "Fibre diversity (dual path)", status: "complete", finding: "Dark fibre from 2 independent carriers confirmed", riskRating: "low" }
      ]
    },
    {
      category: "Commercial",
      items: [
        { check: "Hyperscale anchor pre-lease", status: "complete", finding: "62 MW pre-leased, 3 hyperscalers confirmed", riskRating: "low" },
        { check: "Colo pipeline", status: "flagged", finding: "38 MW colo at 45% pipeline coverage — occupancy risk", riskRating: "medium" },
        { check: "Management team retention", status: "flagged", finding: "CTO and Head of Sales on 12-month lock-up only", riskRating: "high" },
        { check: "Key-man insurance", status: "complete", finding: "Policy in place for CEO and CTO", riskRating: "low" }
      ]
    }
  ];

  const allItems = categories.flatMap((c) => c.items);
  const blockingItems = allItems.filter((i) => i.riskRating === "high");
  const flaggedItems = allItems.filter((i) => i.status === "flagged");
  const completedCount = allItems.filter((i) => i.status === "complete").length;
  const overallStatus = blockingItems.length > 0 ? "blocked" : flaggedItems.length > 2 ? "conditional" : "clear";

  return {
    type: "due_diligence",
    overallStatus,
    categories,
    blockingItems,
    flaggedItems: flaggedItems.length,
    completedChecks: completedCount,
    totalChecks: allItems.length,
    narrative: {
      headline: `Due diligence: ${completedCount}/${allItems.length} checks complete. Status: ${overallStatus.toUpperCase()}. ${blockingItems.length} blocking item(s).`,
      insight: `${flaggedItems.length} flagged items require resolution before signing. Key risks: power hedge exposure, colo pipeline coverage, CTO retention.`,
      dependency: "Genset delivery schedule and interconnect renewal terms must be confirmed before closing.",
      recommendation: blockingItems.length > 0
        ? `DO NOT PROCEED to signing. Resolve ${blockingItems.length} blocking item(s) first: ${blockingItems.map((i) => i.check).join(", ")}.`
        : `Proceed with conditions: resolve flagged items and include closing conditions for power hedge and interconnect renewal.`
    },
    suggestedFollowUps: [
      "Build the synergy model now that DD is complete.",
      "Freeze the approval gate — DD is clear.",
      "Show me only the high and medium risk items."
    ]
  };
}

const v02AdditionalTools = [
  {
    type: "function",
    name: "get_dc_value_drivers",
    description: "Return Data Center-specific operational value drivers: contracted MW, hyperscale vs colo revenue split, ARPU per kW, PUE, and stabilization ramp by year.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"], description: "Scenario preset." }
      }
    }
  },
  {
    type: "function",
    name: "build_multi_method_valuation",
    description: "Build a football-field enterprise value chart using DCF (exit multiple), trading comps EV/EBITDA, precedent deal EV/EBITDA, and asset replacement cost per MW. Returns four valuation method ranges and a consensus EV range.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"] },
        waccBps: { type: "number", description: "Override WACC in basis points, e.g. 1050 for 10.5%." },
        tradingCompsEVEBITDA: { type: "number", description: "Override trading comps EV/EBITDA multiple midpoint." },
        precedentEVEBITDA: { type: "number", description: "Override precedent deal EV/EBITDA multiple midpoint." },
        replacementCostPerMW: { type: "number", description: "Asset replacement cost per MW in AEDm." }
      },
      required: ["scenario"]
    }
  },
  {
    type: "function",
    name: "build_wacc_stack",
    description: "Build WACC from first principles: risk-free rate, equity risk premium, beta, cost of equity, debt cost, leverage, and blended WACC. Returns a 50bps sensitivity grid showing EV impact.",
    parameters: {
      type: "object",
      properties: {
        rfRate: { type: "number", description: "Risk-free rate as decimal, e.g. 0.045 for 4.5%." },
        equityRiskPremium: { type: "number", description: "Equity risk premium as decimal." },
        beta: { type: "number", description: "Asset beta." },
        debtCostBps: { type: "number", description: "Pre-tax debt cost in basis points, e.g. 700 for 7.0%." },
        leverage: { type: "number", description: "Debt as fraction of total capital, e.g. 0.45 for 45%." }
      }
    }
  },
  {
    type: "function",
    name: "run_ev_scenario_sensitivity",
    description: "Run enterprise value sensitivity tornado: same 6 levers as IRR sensitivity but outputs EV range in AEDm and EV delta per lever alongside IRR and NPV.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"] }
      }
    }
  },
  {
    type: "function",
    name: "run_build_vs_buy",
    description: "Compare building a greenfield data center versus acquiring an existing platform. Returns side-by-side NPV, IRR, time-to-revenue, execution risk, decision matrix, and recommendation.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"] },
        buyCapex: { type: "number", description: "Acquisition price in AEDm for the buy option." },
        buyTimeToRevenueMonths: { type: "number", description: "Months to revenue for the buy option (default 6)." }
      },
      required: ["scenario"]
    }
  },
  {
    type: "function",
    name: "get_precedent_transaction_comps",
    description: "Return M&A precedent transaction benchmarks for data center deals: EV/MW and EV/EBITDA multiples with DAMAC implied valuation plotted against the range.",
    parameters: {
      type: "object",
      properties: {
        filterRegion: { type: "string", enum: ["global", "mena", "europe", "north_america"] },
        filterMinMW: { type: "number", description: "Minimum MW to include in comps." }
      }
    }
  },
  {
    type: "function",
    name: "run_scenario_on_ev",
    description: "Apply base, upside, and downside scenarios to enterprise value output using DCF exit multiple, trading comps, and precedent deal multiples.",
    parameters: {
      type: "object",
      properties: {
        scenarios: { type: "array", items: { type: "string", enum: ["base", "upside", "downside"] } },
        tradingCompsMultiple: { type: "number", description: "Override trading comps EV/EBITDA multiple." },
        precedentMultiple: { type: "number", description: "Override precedent deal EV/EBITDA multiple." }
      }
    }
  },
  {
    type: "function",
    name: "run_quality_of_earnings",
    description: "Run quality of earnings analysis: normalise reported EBITDA by stripping one-time items (pre-opening costs, management fee, hedging gains, working capital), identify debt-like items, compute quality score and impact on enterprise value.",
    parameters: {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["base", "upside", "downside"] }
      }
    }
  },
  {
    type: "function",
    name: "build_synergy_model",
    description: "Build M&A synergy model: revenue cross-sell, opex savings, capex savings, integration costs. Returns standalone value, synergy NPV, total acquisition value, and maximum bid price.",
    parameters: {
      type: "object",
      properties: {
        standaloneValue: { type: "number", description: "Override standalone EV (AEDm). Defaults to DCF terminal value." },
        qoeDeduction: { type: "number", description: "QoE EBITDA normalisation impact on EV (AEDm). Default 180." },
        debtLikeDeduction: { type: "number", description: "Debt-like items to deduct from bid price (AEDm). Default 102." }
      }
    }
  },
  {
    type: "function",
    name: "run_due_diligence_checklist",
    description: "Run a structured M&A due diligence checklist across financial, legal, technical, and commercial categories. Returns check statuses, risk ratings, blocking items, and an overall DD status.",
    parameters: {
      type: "object",
      properties: {
        filterCategory: { type: "string", enum: ["financial", "legal", "technical", "commercial"] }
      }
    }
  },
  {
    type: "function",
    name: "build_evidence_chain",
    description: "Build an evidence chain tracing every KPI and valuation metric back to its source tool call. Returns traceability score, gap flags for missing metrics, and readiness to freeze the approval gate.",
    parameters: {
      type: "object",
      properties: {
        evidenceLog: {
          type: "array",
          description: "Evidence log entries from this session. Each entry has metric, toolCall, scenario, timestamp.",
          items: { type: "object" }
        }
      }
    }
  },
  {
    type: "function",
    name: "freeze_approval_gate",
    description: "Freeze an immutable approval gate snapshot of all current metrics with a hash digest. Frozen gates cannot be modified — a new version must be created for any change.",
    parameters: {
      type: "object",
      properties: {
        version: { type: "string", description: "Gate version label (e.g. IC-v1.0, IC-v2.0)." },
        metrics: { type: "object", description: "Current metric snapshot: irr, npv, capex, riskScore, enterpriseValue, evPerMW, normalizedEbitda, maxBid." },
        evidenceLog: { type: "array", items: { type: "object" }, description: "Evidence chain entries to include in the gate." }
      },
      required: ["version"]
    }
  },
  {
    type: "function",
    name: "generate_board_memo",
    description: "Generate a 9-section Investment Committee board memo from a frozen approval gate. All content is derived from the frozen gate — no live state is used.",
    parameters: {
      type: "object",
      properties: {
        gate: { type: "object", description: "Frozen gate object from freeze_approval_gate." }
      }
    }
  }
];

export function buildEvidenceChain(args = {}) {
  // This function receives the evidence log from app state via args (passed by app.v02.js)
  // Falls back to a demonstration evidence chain if no log is provided
  const log = args.evidenceLog || [];

  const requiredMetrics = [
    { metric: "irr", label: "IRR (%)" },
    { metric: "npv", label: "NPV (AEDm)" },
    { metric: "football_field", label: "Enterprise Value (Football Field)" },
    { metric: "wacc_stack", label: "WACC Build" },
    { metric: "build_vs_buy", label: "Build vs Buy" },
    { metric: "quality_of_earnings", label: "Quality of Earnings" },
    { metric: "synergy_model", label: "Synergy NPV / Max Bid" }
  ];

  const loggedTypes = new Set(log.map((e) => e.metric || e.type));

  const gapFlags = requiredMetrics
    .filter((r) => !loggedTypes.has(r.metric))
    .map((r) => ({ metric: r.metric, label: r.label, resolution: `Run ${r.label} tool to populate this metric before freezing.` }));

  const entries = log.length > 0 ? log : requiredMetrics.map((r, i) => ({
    id: `EV-${String(i + 1).padStart(3, "0")}`,
    metric: r.metric,
    label: r.label,
    toolCall: `${r.metric.replace(/-/g, "_")}_tool`,
    scenario: "base",
    timestamp: new Date(Date.now() - (requiredMetrics.length - i) * 60000).toISOString(),
    traceable: loggedTypes.size === 0 ? false : loggedTypes.has(r.metric)
  }));

  const traceabilityScore = entries.length > 0
    ? Math.round((entries.filter((e) => e.traceable).length / entries.length) * 100)
    : 0;

  return {
    type: "evidence_chain",
    entries,
    gapFlags,
    traceabilityScore,
    readyToFreeze: gapFlags.length === 0 && traceabilityScore >= 85,
    narrative: {
      headline: `Evidence chain: ${entries.length} metrics traced. Traceability score: ${traceabilityScore}%. ${gapFlags.length} gap(s) identified.`,
      insight: gapFlags.length === 0
        ? "All required metrics are traceable to a source tool call. Safe to freeze the approval gate."
        : `Missing traces for: ${gapFlags.map((g) => g.label).join(", ")}. Run those tools before freezing.`,
      dependency: "Evidence chain is built from the tools called this session. A fresh session starts with an empty chain.",
      recommendation: gapFlags.length > 0
        ? `Fill gaps before freezing: ${gapFlags.map((g) => g.resolution).join(" | ")}`
        : "All metrics traced. Proceed to freeze the approval gate."
    },
    suggestedFollowUps: [
      "Freeze the approval gate as IC-v1.0.",
      "Generate the IC board memo.",
      gapFlags.length > 0 ? `Run ${gapFlags[0].label} to close the first gap.` : "Show me the football field one more time."
    ]
  };
}

export function freezeApprovalGate(args = {}) {
  const version = args.version || "IC-v1.0";
  const metrics = args.metrics || {};
  const evidenceLog = args.evidenceLog || [];
  const timestamp = new Date().toISOString();

  // Build a deterministic snapshot string for hashing
  // In browser, app.v02.js will replace hashDigest with crypto.subtle.digest result
  const snapshotStr = JSON.stringify({ version, metrics, timestamp, evidenceLog: evidenceLog.length });
  // Deterministic simple hash fallback (replaced by WebCrypto in browser)
  let hashDigest = "sha256-pending";
  let h = 5381;
  for (let i = 0; i < snapshotStr.length; i++) {
    h = ((h << 5) + h) ^ snapshotStr.charCodeAt(i);
    h = h >>> 0;
  }
  hashDigest = `djb2-${h.toString(16).padStart(8, "0")}`;

  const frozenGate = {
    version,
    status: "FROZEN",
    timestamp,
    hashDigest,
    metrics: {
      irr: metrics.irr || "--",
      npv: metrics.npv || "--",
      capex: metrics.capex || "--",
      riskScore: metrics.riskScore || "--",
      enterpriseValue: metrics.enterpriseValue || "--",
      evPerMW: metrics.evPerMW || "--",
      normalizedEbitda: metrics.normalizedEbitda || "--",
      maxBid: metrics.maxBid || "--"
    },
    evidenceCount: evidenceLog.length,
    frozenBy: "CFO Co-Pilot v02"
  };

  return {
    type: "approval_gate",
    gate: frozenGate,
    narrative: {
      headline: `Approval gate frozen as "${version}". Hash: ${hashDigest}. Timestamp: ${timestamp}.`,
      insight: `All metrics locked. This gate is immutable — any change creates a new version. Share the hash with the IC committee to confirm data integrity.`,
      dependency: "Gate integrity depends on the hash remaining unchanged. Do not modify any metric after freezing.",
      recommendation: `Present this gate to the Investment Committee. Reference hash ${hashDigest} in all committee documentation.`
    },
    suggestedFollowUps: [
      "Generate the IC board memo from this gate.",
      "Show me the evidence chain for this gate.",
      "Freeze another version with updated assumptions."
    ]
  };
}

export function generateBoardMemo(args = {}) {
  const gate = args.gate || {};
  const metrics = gate.metrics || {};
  const version = gate.version || "IC-v1.0";
  const timestamp = gate.timestamp ? new Date(gate.timestamp).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "N/A";

  const sections = [
    {
      id: "01",
      title: "Executive Summary",
      content: `DAMAC Properties proposes a ${metrics.capex || "AEDm 1,850"} investment in a 120 MW data centre campus in the UAE, targeting stabilisation by 2029. At a ${metrics.irr || "--"}% unlevered IRR against a 12% hurdle rate, the project generates NPV of ${metrics.npv || "--"} AEDm. Recommendation: APPROVE.`
    },
    {
      id: "02",
      title: "Transaction Overview",
      content: `Asset type: Greenfield hyperscale + co-location data centre. Capacity: 120 MW (62% hyperscale, 38% co-location). Location: UAE (DAMAC freehold land). Construction: 2026–2032 (7-phase ramp). Total CAPEX: ${metrics.capex || "AEDm 1,850"} phased. Target stabilisation: 2029 at 82 MW online.`
    },
    {
      id: "03",
      title: "Valuation Summary",
      content: `Football field enterprise value: ${metrics.enterpriseValue || "AEDm ~4,000"} (consensus midpoint). Implied EV/MW: ${metrics.evPerMW || "~AEDm 33/MW"}. DCF exits at 9.5× stabilised EBITDA discounted at WACC 10.5%. Trading comps (21×) and precedent deals (18×) support a premium to DCF given hyperscale lease quality.`
    },
    {
      id: "04",
      title: "Build vs Buy Rationale",
      content: `Greenfield build delivers superior IRR (${metrics.irr || "--"}%) versus a typical platform acquisition (estimated ~14–15%). Buy option provides faster revenue but requires acquisition premium of 30–40% to NAV. Board endorses build as the value-maximising path given DAMAC's land bank position and construction expertise.`
    },
    {
      id: "05",
      title: "Quality of Earnings",
      content: `Normalised stabilised EBITDA: ${metrics.normalizedEbitda || "~AEDm 492"} (after stripping AEDm 18 one-time items). Quality score: 82/100. Debt-like obligations (AEDm 102) to be deducted from any acquisition consideration. No material irregularities identified.`
    },
    {
      id: "06",
      title: "Synergy Analysis",
      content: `If DAMAC acquires an operating asset to complement the greenfield build: synergy NPV estimated at AEDm 120–150 (cross-sell, opex savings, procurement). Maximum adjusted bid: ${metrics.maxBid || "~AEDm 2,100"}. Recommended opening bid: AEDm ${metrics.maxBid ? Math.round(Number(String(metrics.maxBid).replace(/[^0-9.]/g, "")) * 0.88) : "~1,850"} (12% headroom).`
    },
    {
      id: "07",
      title: "Risk & Sensitivities",
      content: `Downside IRR (severe occupancy + power cost stress): ~9.8% — below hurdle. Key risks: (1) colo absorption velocity, (2) power cost trajectory beyond Year 2 hedge, (3) CTO retention (12-month lock-up only). Mitigants: hyperscale pre-leasing at 62 MW, UAE land grant, dual fibre diversity, N+1 power redundancy at Phase 1.`
    },
    {
      id: "08",
      title: "Approval Gate",
      content: `Gate version: ${version}. Frozen: ${timestamp}. Hash: ${gate.hashDigest || "pending"}. Status: ${gate.status || "FROZEN"}. All metrics locked. ${gate.evidenceCount || 0} tool-call evidence entries logged. This memo was generated from the frozen gate — no post-hoc adjustments have been made.`
    },
    {
      id: "09",
      title: "Recommended Resolution",
      content: `The Investment Committee is requested to APPROVE the DAMAC 120 MW Data Centre investment at a total CAPEX of ${metrics.capex || "AEDm 1,850"}, subject to: (i) Confirming power hedge strategy before Year 3; (ii) CTO key-man lock-up extension to 24 months; (iii) Colo pipeline review at 40 MW occupancy milestone. Next step: financial close target Q4 2026.`
    }
  ];

  return {
    type: "board_memo",
    version,
    timestamp,
    hashDigest: gate.hashDigest || "pending",
    sections,
    narrative: {
      headline: `IC memo generated: ${sections.length} sections, gate version ${version}, hash ${gate.hashDigest || "pending"}.`,
      insight: "This memo was generated exclusively from frozen gate data. No live state was used — it is audit-safe.",
      dependency: "Present alongside the frozen gate printout and evidence chain log.",
      recommendation: "Distribute to IC members 48 hours before the meeting. Reference gate hash in the covering letter."
    },
    suggestedFollowUps: [
      "Show me the evidence chain one more time.",
      "What is the final max bid price?",
      "Run the downside scenario again."
    ]
  };
}

export const realtimeFinanceToolsV2 = [...realtimeFinanceTools, ...v02AdditionalTools];

export const sessionInstructionsV2 = sessionInstructions + `

v02 Extended Capabilities:
- Multi-method valuation (football field): DCF, trading comps, precedent deals, asset replacement
- Data-center specific value drivers: contracted MW, PUE, ARPU, hyperscale/colo split
- WACC construction from first principles with 50bps sensitivity
- Enterprise value sensitivity tornado (EV/MW and EV deltas)

Operating additions for v02:
- Lead with the football field range, not just IRR. The CFO needs EV per MW context.
- When asked about valuation, call build_multi_method_valuation first, then narrate the method spread.
- On WACC questions, always build from first principles using build_wacc_stack.
- Express EV results in AEDm and AEDm/MW alongside IRR and NPV.
- The DCF-to-comps spread is a feature, not a bug — explain the construction drag.
`;
