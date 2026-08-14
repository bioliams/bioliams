import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { listEntities, getEntity } from "./entities";
import { listLowStock, listRecentUsage } from "./inventory";
import { getLocationPath } from "./locations";
import { ServiceError } from "@/lib/service-error";

/**
 * The lab assistant: a tool-calling loop over the same service layer every
 * page uses, so it can only see what the asking member's roles and projects
 * allow. The model never touches SQL — it asks for searches and stock reports
 * and composes an answer from what comes back.
 *
 * Provider-agnostic by construction: any OpenAI-compatible endpoint works,
 * which covers Gemini, Groq, OpenRouter, OpenAI and a self-hosted Ollama.
 */

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  source: "lab" | "shared";
}

export async function getAiConfig(orgId: string): Promise<AiConfig | null> {
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.organizationId, orgId))
    .limit(1);
  if (row?.apiKey) {
    return { baseUrl: row.baseUrl, apiKey: row.apiKey, model: row.model, source: "lab" };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      baseUrl:
        process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.AI_MODEL ?? "gemini-flash-latest",
      source: "shared",
    };
  }
  return null;
}

export async function saveAiSettings(
  orgId: string,
  input: { baseUrl: string; apiKey: string | null; model: string }
) {
  const existing = await db
    .select({ id: aiSettings.id })
    .from(aiSettings)
    .where(eq(aiSettings.organizationId, orgId))
    .limit(1);
  const values = {
    baseUrl: input.baseUrl.trim().replace(/\/$/, ""),
    // Empty string means "keep what's there"; null means "clear it".
    ...(input.apiKey !== "" ? { apiKey: input.apiKey } : {}),
    model: input.model.trim(),
    updatedAt: new Date(),
  };
  if (existing.length > 0) {
    await db
      .update(aiSettings)
      .set(values)
      .where(and(eq(aiSettings.organizationId, orgId), eq(aiSettings.id, existing[0].id)));
  } else {
    await db.insert(aiSettings).values({ organizationId: orgId, apiKey: null, ...values });
  }
}

/* ------------------------------ tools ------------------------------ */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_records",
      description:
        "Search the lab's records — samples, reagents, primers and anything else — by name, display ID, or any custom field value (vendor, lot, organism…). Returns matches with type, status, quantity-bearing records' stock, and location.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "What to search for" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_record",
      description:
        "Fetch one record in full by its display ID (e.g. SMP-000001), including every field, its storage path, and lineage.",
      parameters: {
        type: "object",
        properties: { displayId: { type: "string" } },
        required: ["displayId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "low_stock",
      description: "List every inventory item at or below its minimum threshold.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "recent_stock_activity",
      description:
        "The most recent stock movements across the lab: what was used, received, discarded or moved, by whom, and when.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "How many events, up to 30" } },
      },
    },
  },
] as const;

async function runTool(
  orgId: string,
  projectIds: string[],
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_records": {
      const { rows } = await listEntities(orgId, {
        search: String(args.query ?? ""),
        limit: 15,
        projectIds,
      });
      return rows.map(({ entity, typeName, locationName }) => ({
        displayId: entity.displayId,
        name: entity.name,
        type: typeName,
        status: entity.status,
        location: locationName,
        fields: entity.data,
      }));
    }
    case "get_record": {
      const entity = await getEntity(orgId, String(args.displayId ?? ""), projectIds);
      const path = entity.locationId ? await getLocationPath(orgId, entity.locationId) : [];
      return {
        displayId: entity.displayId,
        name: entity.name,
        status: entity.status,
        fields: entity.data,
        storagePath: path.map((l) => l.name).join(" › ") || null,
        parentId: entity.parentId,
        checkedOut: entity.checkedOutBy !== null,
        created: entity.createdAt,
      };
    }
    case "low_stock": {
      const rows = await listLowStock(orgId);
      return rows.map(({ item, entity }) => ({
        displayId: entity.displayId,
        name: entity.name,
        quantity: `${item.quantity} ${item.unit}`,
        minimum: item.minThreshold,
      }));
    }
    case "recent_stock_activity": {
      const rows = await listRecentUsage(orgId, Math.min(Number(args.limit ?? 15), 30));
      return rows.map(({ event, entityName, displayId, actorName }) => ({
        what: event.kind,
        record: `${displayId} ${entityName}`,
        amount: `${event.delta} ${event.unit}`,
        remaining: `${event.quantityAfter} ${event.unit}`,
        by: actorName,
        at: event.createdAt,
        note: event.note,
      }));
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/* ------------------------------ the loop ------------------------------ */

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

const SYSTEM_PROMPT = `You are the lab assistant inside BioLIMS, a laboratory inventory system.
Answer questions about this lab's samples, reagents, stock and activity using the tools.
Rules:
- Always look things up with tools before answering; never invent records, quantities or locations.
- Refer to records by display ID and name, e.g. "RGT-000002 Taq DNA Polymerase".
- If a search finds nothing, say so plainly and suggest how to rephrase.
- Be concise: lab members are mid-task. Prefer a short answer with the key numbers.
- You can only read data. If asked to change something, explain where in the app to do it.`;

export async function askAssistant(
  orgId: string,
  projectIds: string[],
  config: AiConfig,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-12),
  ];

  // Free tiers spike: retry once, then fall back to the lite model before
  // showing anyone an error.
  const modelCandidates = [config.model, config.model, "gemini-flash-lite-latest"];

  for (let turn = 0; turn < 6; turn++) {
    let res: Response | null = null;
    for (const [attempt, model] of modelCandidates.entries()) {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, tools: TOOLS, temperature: 0.2 }),
      });
      if (res.ok || res.status === 401 || res.status === 403) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }

    if (!res || !res.ok) {
      const body = res ? await res.text() : "";
      const status = res?.status ?? 0;
      throw new ServiceError(
        status === 401 || status === 403
          ? "The AI provider rejected the key — check Settings → AI assistant"
          : status === 503 || status === 429
            ? "The model is overloaded right now — try again in a minute"
            : `The AI provider returned an error (${status}): ${body.slice(0, 200)}`,
        502
      );
    }

    const data = (await res.json()) as {
      choices: { message: ChatMessage; finish_reason: string }[];
    };
    const message = data.choices?.[0]?.message;
    if (!message) throw new ServiceError("The AI provider returned an empty response", 502);

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);
      for (const call of message.tool_calls) {
        let result: unknown;
        try {
          result = await runTool(
            orgId,
            projectIds,
            call.function.name,
            JSON.parse(call.function.arguments || "{}")
          );
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "tool failed" };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return message.content ?? "I couldn't produce an answer — try rephrasing.";
  }

  throw new ServiceError("The question needed too many lookups — try something narrower", 502);
}
