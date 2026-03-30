import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

// --- Configuration ---
const EDA_API_URL = process.env.EDA_API_URL || "http://localhost:8888";
const PORT = parseInt(process.env.PORT || "3100", 10);
const DEFAULT_EMAIL = process.env.EDA_EMAIL || "";
const DEFAULT_PASSWORD = process.env.EDA_PASSWORD || "";

// --- Logger ---
function log(level: "INFO" | "WARN" | "ERROR", scope: string, msg: string) {
  const ts = new Date().toISOString();
  console[level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log"](
    `[${ts}] [${level}] [${scope}] ${msg}`
  );
}

// --- Login helper ---
async function login(): Promise<string> {
  if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
    const msg = "EDA_EMAIL y EDA_PASSWORD no están configurados en el servidor.";
    log("ERROR", "login", msg);
    throw new Error(msg);
  }

  const loginUrl = `${EDA_API_URL}/admin/user/login`;
  log("INFO", "login", `POST ${loginUrl} — usuario: ${DEFAULT_EMAIL}`);

  let response: globalThis.Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }),
    });
  } catch (err) {
    log("ERROR", "login", `Error de red al conectar con ${loginUrl}: ${err}`);
    throw new Error(`No se pudo conectar con la EDA API (${loginUrl}): ${err}`);
  }

  const text = await response.text();
  log("INFO", "login", `HTTP ${response.status} ${response.statusText}`);
  log("INFO", "login", `Response body: ${text.slice(0, 500)}`);

  if (!response.ok) {
    log("ERROR", "login", `Login fallido — status ${response.status}`);
    throw new Error(`Login fallido (${response.status}): ${text}`);
  }

  let data: { token?: string };
  try {
    data = JSON.parse(text);
  } catch {
    log("ERROR", "login", `Respuesta no es JSON válido: ${text}`);
    throw new Error(`Respuesta no es JSON válido: ${text}`);
  }

  if (!data.token) {
    log("ERROR", "login", `El JSON no contiene 'token'. Keys recibidas: ${Object.keys(data).join(", ")}`);
    throw new Error(`Login no devolvió token. Respuesta: ${text}`);
  }

  log("INFO", "login", `Token obtenido correctamente (${data.token.slice(0, 20)}...)`);
  return data.token;
}

// --- MCP Server setup ---
function createMcpServer() {
  const server = new McpServer({
    name: "eda-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "list_dashboards",
    {
      description: "Lista todos los dashboards accesibles en EDA (privados, de grupo, públicos y compartidos).",
    },
    async () => {
      log("INFO", "list_dashboards", "Tool invocado");

      let token: string;
      try {
        token = await login();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", "list_dashboards", `Autenticación fallida: ${msg}`);
        return {
          content: [{ type: "text", text: `Error de autenticación: ${msg}` }],
          isError: true,
        };
      }

      const url = new URL(`${EDA_API_URL}/dashboard/`);
      url.searchParams.set("token", token);
      log("INFO", "list_dashboards", `GET ${url.origin}${url.pathname}?token=<redacted>`);

      let response: globalThis.Response;
      try {
        response = await fetch(url.toString());
      } catch (err) {
        log("ERROR", "list_dashboards", `Error de red al llamar a /dashboard/: ${err}`);
        return {
          content: [{ type: "text", text: `Error de red: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "list_dashboards", `HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        log("ERROR", "list_dashboards", `Error en /dashboard/ — body: ${body}`);
        return {
          content: [{ type: "text", text: `Error al obtener dashboards (${response.status}): ${body}` }],
          isError: true,
        };
      }

      type Dashboard = {
        _id: string;
        config: { title: string; visible: string };
      };

      let data: {
        ok: boolean;
        dashboards: Dashboard[];
        group: Dashboard[];
        publics: Dashboard[];
        shared: Dashboard[];
      };

      try {
        data = await response.json() as typeof data;
      } catch (err) {
        log("ERROR", "list_dashboards", `Respuesta de /dashboard/ no es JSON válido: ${err}`);
        return {
          content: [{ type: "text", text: `Error parseando respuesta: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "list_dashboards", `ok=${data.ok} | privados=${data.dashboards?.length ?? "?"} | grupo=${data.group?.length ?? "?"} | públicos=${data.publics?.length ?? "?"} | compartidos=${data.shared?.length ?? "?"}`);

      if (!data.ok) {
        log("WARN", "list_dashboards", "La API respondió con ok: false");
        return {
          content: [{ type: "text", text: "La API respondió con ok: false" }],
          isError: true,
        };
      }

      const formatGroup = (label: string, items: Dashboard[] = []) => {
        const lines = [`\n## ${label}`];
        if (items.length === 0) {
          lines.push("  (sin dashboards)");
        }
        for (const d of items) {
          lines.push(`  - [${d._id}] ${d.config.title}`);
        }
        return lines;
      };

      const lines = [
        ...formatGroup("Privados", data.dashboards),
        ...formatGroup("De grupo", data.group),
        ...formatGroup("Públicos", data.publics),
        ...formatGroup("Compartidos", data.shared),
      ];

      log("INFO", "list_dashboards", "Respuesta generada correctamente");

      return {
        content: [{
          type: "text",
          text: `Dashboards en EDA (${EDA_API_URL}):\n` + lines.join("\n"),
        }],
      };
    }
  );

  return server;
}

// --- Express HTTP server ---
async function main() {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next) => {
    log("INFO", "http", `${req.method} ${req.path}`);
    next();
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    log("INFO", "mcp", `Nueva petición MCP — body method: ${req.body?.method ?? "(ninguno)"}`);
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      log("INFO", "mcp", "Conexión cerrada");
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/", (_req: Request, res: Response) => {
    res.json({
      service: "eda-mcp",
      version: "1.0.0",
      status: "ok",
      endpoint: "/mcp",
      transport: "Streamable HTTP (MCP 2025-03-26)",
      edaApiUrl: EDA_API_URL,
      autoLogin: !!(DEFAULT_EMAIL && DEFAULT_PASSWORD),
    });
  });

  app.listen(PORT, () => {
    log("INFO", "startup", `EDA MCP server escuchando en puerto ${PORT}`);
    log("INFO", "startup", `MCP endpoint : POST /mcp`);
    log("INFO", "startup", `Health check : GET  /`);
    log("INFO", "startup", `EDA API URL  : ${EDA_API_URL}`);
    log("INFO", "startup", `Auto-login   : ${DEFAULT_EMAIL ? `enabled (${DEFAULT_EMAIL})` : "DISABLED — configura EDA_EMAIL + EDA_PASSWORD"}`);
  });
}

main().catch((err) => {
  log("ERROR", "startup", `Error fatal: ${err}`);
  process.exit(1);
});
