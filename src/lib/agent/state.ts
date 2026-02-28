import type { AgentStep } from "./types";

/**
 * Build the list of prior steps + tool results for the next LLM prompt.
 */
export function formatStepsForPrompt(steps: AgentStep[]): string {
  return steps
    .map((s) => {
      let block = `Step ${s.stepIndex + 1}:\nThought: ${s.thought}\n`;
      if (s.type === "tool_call" && s.toolName) {
        block += `Tool: ${s.toolName}\nArguments: ${JSON.stringify(s.toolArguments ?? {})}\n`;
        block += `Result: ${JSON.stringify(s.toolResult)}\n`;
      }
      if (s.type === "final_answer" && s.finalAnswer) {
        block += `Final answer: ${JSON.stringify(s.finalAnswer)}\n`;
      }
      return block;
    })
    .join("\n---\n");
}

/**
 * Build the full user message for the LLM (task + prior steps).
 */
export function buildUserMessage(task: string, steps: AgentStep[]): string {
  if (steps.length === 0) {
    return `Task: ${task}\n\nPlan your steps and either call a tool or respond with final_answer.`;
  }
  const history = formatStepsForPrompt(steps);
  return `Task: ${task}\n\nPrevious steps:\n${history}\n\nContinue: either call another tool (tool_call) or provide your final answer (final_answer).`;
}
