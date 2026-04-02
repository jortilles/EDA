import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

// --- Configuration ---
const EDA_API_URL = process.env.EDA_API_URL || "http://localhost:8888";
const EDA_APP_URL = process.env.EDA_APP_URL || new URL(EDA_API_URL).origin;
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

  server.registerTool(
    "list_datasources",
    {
      description: "Lista los datasources accesibles en EDA para el usuario autenticado, filtrados por sus permisos.",
    },
    async () => {
      log("INFO", "list_datasources", "Tool invocado");

      let token: string;
      try {
        token = await login();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", "list_datasources", `Autenticación fallida: ${msg}`);
        return {
          content: [{ type: "text", text: `Error de autenticación: ${msg}` }],
          isError: true,
        };
      }

      const url = new URL(`${EDA_API_URL}/datasource/namesForDashboard`);
      url.searchParams.set("token", token);
      log("INFO", "list_datasources", `GET ${url.origin}${url.pathname}?token=<redacted>`);

      let response: globalThis.Response;
      try {
        response = await fetch(url.toString());
      } catch (err) {
        log("ERROR", "list_datasources", `Error de red al llamar a /datasource/namesForDashboard: ${err}`);
        return {
          content: [{ type: "text", text: `Error de red: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "list_datasources", `HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        log("ERROR", "list_datasources", `Error en /datasource/namesForDashboard — body: ${body}`);
        return {
          content: [{ type: "text", text: `Error al obtener datasources (${response.status}): ${body}` }],
          isError: true,
        };
      }

      type DatasourceName = { _id: string; model_name: string };
      let data: { ok: boolean; ds: DatasourceName[] };

      try {
        data = await response.json() as typeof data;
      } catch (err) {
        log("ERROR", "list_datasources", `Respuesta no es JSON válido: ${err}`);
        return {
          content: [{ type: "text", text: `Error parseando respuesta: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "list_datasources", `ok=${data.ok} | datasources=${data.ds?.length ?? "?"}`);

      if (!data.ok) {
        log("WARN", "list_datasources", "La API respondió con ok: false");
        return {
          content: [{ type: "text", text: "La API respondió con ok: false" }],
          isError: true,
        };
      }

      const lines = (data.ds ?? []).map(
        (ds) => `  - [${ds._id}] ${ds.model_name ?? "(sin nombre)"}`
      );

      log("INFO", "list_datasources", "Respuesta generada correctamente");

      return {
        content: [{
          type: "text",
          text: `Datasources en EDA (${EDA_API_URL}):\n` + (lines.length ? lines.join("\n") : "  (sin datasources)"),
        }],
      };
    }
  );

  server.registerTool(
    "get_datasource",
    {
      description: "Obtiene el detalle de un datasource de EDA por su ID.",
      inputSchema: {
        id: z.string().describe("ID del datasource a consultar"),
      },
    },
    async ({ id }: { id: string }) => {
      log("INFO", "get_datasource", `Tool invocado — id: ${id}`);

      let token: string;
      try {
        token = await login();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", "get_datasource", `Autenticación fallida: ${msg}`);
        return {
          content: [{ type: "text", text: `Error de autenticación: ${msg}` }],
          isError: true,
        };
      }

      const url = new URL(`${EDA_API_URL}/datasource/${encodeURIComponent(id)}`);
      url.searchParams.set("token", token);
      log("INFO", "get_datasource", `GET ${url.origin}${url.pathname}?token=<redacted>`);

      let response: globalThis.Response;
      try {
        response = await fetch(url.toString());
      } catch (err) {
        log("ERROR", "get_datasource", `Error de red al llamar a /datasource/${id}: ${err}`);
        return {
          content: [{ type: "text", text: `Error de red: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "get_datasource", `HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        log("ERROR", "get_datasource", `Error en /datasource/${id} — body: ${body}`);
        return {
          content: [{ type: "text", text: `Error al obtener datasource (${response.status}): ${body}` }],
          isError: true,
        };
      }

      let data: { ok: boolean; dataSource: unknown };
      try {
        data = await response.json() as typeof data;
      } catch (err) {
        log("ERROR", "get_datasource", `Respuesta no es JSON válido: ${err}`);
        return {
          content: [{ type: "text", text: `Error parseando respuesta: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "get_datasource", `ok=${data.ok}`);

      if (!data.ok) {
        log("WARN", "get_datasource", "La API respondió con ok: false");
        return {
          content: [{ type: "text", text: "La API respondió con ok: false" }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data.dataSource, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "get_dashboard",
    {
      description: "Obtiene el contenido de un dashboard de Edalitics por su ID: título, panels con su título, datasource y campos mostrados.",
      inputSchema: {
        id: z.string().describe("ID del dashboard a consultar"),
      },
    },
    async ({ id }: { id: string }) => {
      log("INFO", "get_dashboard", `Tool invocado — id: ${id}`);

      let token: string;
      try {
        token = await login();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", "get_dashboard", `Autenticación fallida: ${msg}`);
        return {
          content: [{ type: "text", text: `Error de autenticación: ${msg}` }],
          isError: true,
        };
      }

      const url = new URL(`${EDA_API_URL}/dashboard/${encodeURIComponent(id)}`);
      url.searchParams.set("token", token);
      log("INFO", "get_dashboard", `GET ${url.origin}${url.pathname}?token=<redacted>`);

      let response: globalThis.Response;
      try {
        response = await fetch(url.toString());
      } catch (err) {
        log("ERROR", "get_dashboard", `Error de red al llamar a /dashboard/${id}: ${err}`);
        return {
          content: [{ type: "text", text: `Error de red: ${err}` }],
          isError: true,
        };
      }

      log("INFO", "get_dashboard", `HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        log("ERROR", "get_dashboard", `Error en /dashboard/${id} — body: ${body}`);
        return {
          content: [{ type: "text", text: `Error al obtener dashboard (${response.status}): ${body}` }],
          isError: true,
        };
      }

      type Field = { field_name: string; display_name?: string };
      type Panel = {
        title?: string;
        content?: {
          query?: {
            model_id?: string;
            query?: { fields?: Field[] };
          };
        };
      };
      type DashboardData = {
        ok: boolean;
        dashboard: {
          config: { title: string; panel?: Panel[] };
        };
      };

      let data: DashboardData;
      try {
        data = await response.json() as DashboardData;
      } catch (err) {
        log("ERROR", "get_dashboard", `Respuesta no es JSON válido: ${err}`);
        return {
          content: [{ type: "text", text: `Error parseando respuesta: ${err}` }],
          isError: true,
        };
      }

      if (!data.ok) {
        log("WARN", "get_dashboard", "La API respondió con ok: false");
        return {
          content: [{ type: "text", text: "La API respondió con ok: false" }],
          isError: true,
        };
      }

      const db = data.dashboard;
      const dashboardUrl = `${EDA_APP_URL}/en/#/dashboard/${encodeURIComponent(id)}`;
      const lines: string[] = [`# ${db.config.title}`, `URL: ${dashboardUrl}`, ""];

      const panels = db.config.panel ?? [];
      if (panels.length === 0) {
        lines.push("(sin panels)");
      }

      for (const panel of panels) {
        lines.push(`## Panel: ${panel.title ?? "(sin título)"}`);
        const modelId = panel.content?.query?.model_id;
        if (modelId) lines.push(`  datasource: ${modelId}`);
        const fields = panel.content?.query?.query?.fields ?? [];
        if (fields.length > 0) {
          lines.push("  campos:");
          for (const f of fields) {
            lines.push(`    - ${f.display_name ?? f.field_name}`);
          }
        }
        lines.push("");
      }

      log("INFO", "get_dashboard", `Respuesta generada — ${panels.length} panel(es)`);

      return {
        content: [{
          type: "text",
          text: lines.join("\n"),
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
