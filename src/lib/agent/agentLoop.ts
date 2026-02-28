import OpenAI from "openai";
import type { AgentRunResult, AgentStep, LLMAgentResponse } from "./types";
import { buildUserMessage } from "./state";
import { getToolDescriptions, executeTool } from "@/lib/tools/registry";
import type { ToolContext } from "@/lib/tools/types";
import { DEFAULT_MAX_STEPS } from "./types";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

const SYSTEM_PROMPT = `You are an autonomous agent. Given a task, you must respond with exactly one JSON object and nothing else.

Available tools:
${getToolDescriptions()}

Response format (strict JSON only, no markdown or extra text):
- To call a tool: {"type":"tool_call","thought":"...","tool_name":"<name>","tool_arguments":{...}}
- To finish: {"type":"final_answer","thought":"...","final_answer":{"summary":"...","detailed_answer":"...","sources":[]}}

Rules:
- Respond with only the JSON object. No \`\`\`json or explanation outside the JSON.
- For final_answer, "sources" must be an array of strings (URLs or references).
- Use tools when you need external information; then summarize in final_answer.
- Inside summary and detailed_answer, do NOT use markdown formatting such as **bold**, numbered markdown lists, or headings. Use plain text only (e.g. "Amazon:" instead of "**Amazon**:").`;

/**
 * Parse and validate LLM response. Returns null if invalid.
 */
function parseLLMResponse(text: string): LLMAgentResponse | null {
  const trimmed = text.trim();

  // Try multiple strategies to extract JSON
  let jsonStr = trimmed;


  // Strategy 1: code block (```json ... ``` or ``` ... ```)
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  console.log("codeBlock", codeBlock)
  if (codeBlock) {
    jsonStr = codeBlock[1]!.trim();
  } else {
    // Strategy 2: extract first JSON object using brace matching
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    console.log("braces", firstBrace, lastBrace)
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = trimmed.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;

    // Normalize: the LLM sometimes uses the tool name as "type" instead of "tool_call"
    // e.g. {"type":"vectorSearch","thought":"...","query":"...","topK":5}
    // instead of {"type":"tool_call","tool_name":"vectorSearch","tool_arguments":{"query":"...","topK":5}}
    if (o.type !== "tool_call" && o.type !== "final_answer" && typeof o.type === "string") {
      const toolName = (typeof o.tool_name === "string" && o.tool_name) ? o.tool_name : o.type;
      console.log("toolName", toolName)
      // Collect everything that isn't a known meta-key into tool_arguments
      const knownKeys = new Set(["type", "thought", "tool_name", "tool_arguments"]);
      const extraArgs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) {
        if (!knownKeys.has(k)) extraArgs[k] = v;
      }
      const existingArgs = (o.tool_arguments && typeof o.tool_arguments === "object")
        ? o.tool_arguments as Record<string, unknown>
        : {};
      o.type = "tool_call";
      o.tool_name = toolName;
      o.tool_arguments = { ...existingArgs, ...extraArgs };
    }

    if (o.type !== "tool_call" && o.type !== "final_answer") return null;
    if (typeof o.thought !== "string") return null;
    if (o.type === "tool_call") {
      if (typeof o.tool_name !== "string" || !o.tool_name) return null;
      if (o.tool_arguments !== undefined && typeof o.tool_arguments !== "object") return null;
    }
    if (o.type === "final_answer") {
      const fa = o.final_answer;
      if (!fa || typeof fa !== "object") return null;
      const f = fa as Record<string, unknown>;
      if (typeof f.summary !== "string" || typeof f.detailed_answer !== "string") return null;
      if (!Array.isArray(f.sources)) return null;
      if (f.sources.some((s: unknown) => typeof s !== "string")) return null;
    }
    return o as unknown as LLMAgentResponse;
  } catch {
    return null;
  }
}

export interface RunAgentOptions {
  task: string;
  maxSteps?: number;
  userId?: string;
}

/**
 * Run the agent loop until final_answer or max steps.
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  const { task, maxSteps = DEFAULT_MAX_STEPS, userId } = options;
  const steps: AgentStep[] = [];
  const context: ToolContext = userId ? { userId } : {};
  let totalTokens = 0;

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const userMessage = buildUserMessage(task, steps);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ];

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 2048,
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content?.trim();
    if (completion.usage) {
      totalTokens += completion.usage.total_tokens ?? 0;
    }
    if (!content) {
      steps.push({
        stepIndex,
        thought: "LLM returned empty response.",
        type: "final_answer",
        finalAnswer: {
          summary: "Error",
          detailed_answer: "The model did not return a valid response.",
          sources: [],
        },
      });
      break;
    }
    console.log("content", content)
    const response = parseLLMResponse(content);
    if (!response) {
      console.error(`[agent] Failed to parse LLM response (step ${stepIndex}):`, content);
      // Give the LLM another chance by continuing the loop instead of immediately failing
      steps.push({
        stepIndex,
        thought: `Invalid JSON response, retrying...`,
        type: "tool_call",
        toolName: "_parse_error",
        toolArguments: {},
        toolResult: { error: "Your previous response was not valid JSON. Remember: respond with ONLY a JSON object, no markdown or extra text." },
      });
      continue;
    }

    if (response.type === "final_answer") {
      const fa = response.final_answer ?? {
        summary: "Done",
        detailed_answer: response.thought,
        sources: [],
      };
      steps.push({
        stepIndex,
        thought: response.thought,
        type: "final_answer",
        finalAnswer: fa,
      });
      return {
        success: true,
        steps,
        finalAnswer: fa,
        tokenUsage: totalTokens,
      };
    }

    // Tool call
    const toolName = response.tool_name ?? "";
    const toolArgs = response.tool_arguments ?? {};
    const result = await executeTool(toolName, toolArgs, context);

    steps.push({
      stepIndex,
      thought: response.thought,
      type: "tool_call",
      toolName,
      toolArguments: toolArgs,
      toolResult: result.success ? result.data : { error: result.error },
    });

    if (!result.success) {
      // Optionally stop on tool error or let the LLM retry. We continue so the LLM can try another tool or give final answer.
    }
  }

  // Max steps reached without final_answer
  const lastStep = steps[steps.length - 1];
  const finalAnswer = lastStep?.type === "final_answer" && lastStep.finalAnswer
    ? lastStep.finalAnswer
    : {
      summary: "Incomplete",
      detailed_answer: "Maximum steps reached without a final answer. Consider rephrasing or breaking down the task.",
      sources: [],
    };

  return {
    success: lastStep?.type === "final_answer",
    steps,
    finalAnswer,
    tokenUsage: totalTokens,
  };
}
