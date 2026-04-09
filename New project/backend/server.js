const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  predictHeartDisease,
  getModelInfo,
  analyzeScenario,
  getDashboardBootstrap,
  optimizeFeatureSubset
} = require("./src/heartModel");
const { generatePdfReport } = require("./src/report");
const { registerUser, loginUser, requireAuth, logoutUser } = require("./src/auth");
const { savePrediction, getPredictionHistory } = require("./src/db");

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "..", "frontend", "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const urlPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.join(publicDir, path.normalize(urlPath));

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, error.code === "ENOENT" ? 404 : 500, { error: "Unable to serve file" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    sendJson(res, 200, getDashboardBootstrap());
    return;
  }

  if (req.method === "GET" && pathname === "/model-info") {
    sendJson(res, 200, getModelInfo());
    return;
  }

  if (req.method === "POST" && pathname === "/register") {
    try {
      const payload = await readBody(req);
      sendJson(res, 201, registerUser(payload.username, payload.password));
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to register user" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/login") {
    try {
      const payload = await readBody(req);
      sendJson(res, 200, loginUser(payload.username, payload.password));
    } catch (error) {
      sendJson(res, 401, { error: error.message || "Unable to login" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/logout") {
    logoutUser(req);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/me") {
    try {
      const auth = requireAuth(req);
      sendJson(res, 200, { user: auth.user });
    } catch (error) {
      sendJson(res, 401, { error: error.message || "Not authenticated" });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/history") {
    try {
      const auth = requireAuth(req);
      const limit = Number(requestUrl.searchParams.get("limit") || 12);
      sendJson(res, 200, { history: getPredictionHistory(auth.user.id, limit) });
    } catch (error) {
      sendJson(res, 401, { error: error.message || "Unable to load history" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/predict") {
    try {
      const payload = await readBody(req);
      const result = predictHeartDisease(payload);

      try {
        const auth = requireAuth(req);
        savePrediction(auth.user.id, payload, result);
      } catch (error) {
        // Prediction remains available to guests; history is stored only for authenticated users.
      }

      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/scenario") {
    try {
      const payload = await readBody(req);
      sendJson(res, 200, analyzeScenario(payload));
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/optimize") {
    try {
      const payload = await readBody(req);
      sendJson(res, 200, await optimizeFeatureSubset(payload));
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to optimize features" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/report") {
    try {
      const payload = await readBody(req);
      const result = predictHeartDisease(payload);
      const pdf = generatePdfReport(result);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="heart-disease-report.pdf"',
        "Cache-Control": "no-store"
      });
      res.end(pdf);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to generate report" });
    }
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Heart Disease Prediction Dashboard running at http://localhost:${port}`);
});
