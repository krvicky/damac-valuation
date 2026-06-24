import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import {
  calculateIrrScenario,
  compareCapexCases,
  compareScenarios,
  buildCustomScenario,
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
  realtimeFinanceTools,
  sessionInstructions
} from "./public/finance.js";
import {
  realtimeFinanceToolsV2,
  sessionInstructionsV2
} from "./public/v02/finance.v02.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
const realtimeModel = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const realtimeVoice = process.env.OPENAI_REALTIME_VOICE || "marin";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin === "http://localhost:3000" || origin.endsWith(".github.io")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-OpenAI-Key");
  res.setHeader("Vary", "Origin");
}

function safetyIdentifier(req) {
  const source = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "damac-demo";
  return crypto.createHash("sha256").update(String(source)).digest("hex");
}

async function createRealtimeToken(req, res) {
  const apiKey = process.env.OPENAI_API_KEY || req.headers["x-openai-key"];
  if (!apiKey) {
    sendJson(res, 503, {
      error: "OPENAI_API_KEY is not configured on the server.",
      hint: "Click 'API Key' in the top right to enter your OpenAI key for this session."
    });
    return;
  }

  const sessionConfig = {
    session: {
      type: "realtime",
      model: realtimeModel,
      instructions: sessionInstructions,
      audio: {
        output: { voice: realtimeVoice },
        input: {
          transcription: { model: "gpt-realtime-whisper" },
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 650 }
        }
      },
      tools: realtimeFinanceTools,
      tool_choice: "auto"
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier(req)
      },
      body: JSON.stringify(sessionConfig)
    });

    const body = await response.text();
    if (!response.ok) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = { error: body };
      }
      sendJson(res, response.status, {
        error: parsed.error?.message || parsed.error || "OpenAI Realtime session creation failed.",
        detail: parsed.error || parsed
      });
      return;
    }

    res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/json" });
    res.end(body);
  } catch (error) {
    sendJson(res, 500, { error: "Failed to create Realtime client secret.", detail: error.message });
  }
}

async function createRealtimeTokenV2(req, res) {
  const apiKey = process.env.OPENAI_API_KEY || req.headers["x-openai-key"];
  if (!apiKey) {
    sendJson(res, 503, {
      error: "OPENAI_API_KEY is not configured on the server.",
      hint: "Click 'API Key' in the top right to enter your OpenAI key for this session."
    });
    return;
  }

  const sessionConfig = {
    session: {
      type: "realtime",
      model: realtimeModel,
      instructions: sessionInstructionsV2,
      audio: {
        output: { voice: realtimeVoice },
        input: {
          transcription: { model: "gpt-realtime-whisper" },
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 650 }
        }
      },
      tools: realtimeFinanceToolsV2,
      tool_choice: "auto"
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier(req)
      },
      body: JSON.stringify(sessionConfig)
    });

    const body = await response.text();
    if (!response.ok) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = { error: body };
      }
      sendJson(res, response.status, {
        error: parsed.error?.message || parsed.error || "OpenAI Realtime session creation failed.",
        detail: parsed.error || parsed
      });
      return;
    }

    res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/json" });
    res.end(body);
  } catch (error) {
    sendJson(res, 500, { error: "Failed to create Realtime client secret.", detail: error.message });
  }
}

async function handleFinanceTool(req, res) {
  const body = await readBody(req);
  const payload = body ? JSON.parse(body) : {};
  const name = payload.name;
  const args = payload.arguments || {};

  const handlers = {
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

  if (!handlers[name]) {
    sendJson(res, 404, { error: `Unknown finance tool: ${name}` });
    return;
  }

  sendJson(res, 200, handlers[name](args));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/health")) {
      sendJson(res, 200, {
        ok: true,
        realtimeConfigured: Boolean(process.env.OPENAI_API_KEY),
        acceptsSessionKey: true,
        realtimeModel,
        realtimeVoice
      });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/v02/realtime-token")) {
      await createRealtimeTokenV2(req, res);
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/realtime-token")) {
      await createRealtimeToken(req, res);
      return;
    }

    if (req.method === "POST" && req.url.startsWith("/api/finance-tool")) {
      await handleFinanceTool(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
  } catch (error) {
    sendJson(res, 500, { error: "Unexpected server error.", detail: error.message });
  }
});

server.listen(port, () => {
  console.log(`DAMAC CFO Finance Co-Pilot running at http://localhost:${port}`);
});
