import { all, create, type MathNode } from "mathjs";
import { z } from "zod";

// Bound parsing before building a tree, then bound compilation/evaluation by
// node count and depth. Wide lists can be large without allowing deep recursion.
const limits = {
  characters: 32_768,
  nodes: 4096,
  nesting: 64,
  operators: 128,
  depth: 256,
};
export const calculatorInputSchema = z.object({
  expression: z.string().min(1).max(limits.characters),
});
export const calculatorDescription = `Calculate a numeric expression. Supports + - * / ^ % mod, parentheses, pi, e; sqrt, sin/cos/tan and inverses (radians), ln (natural), log/log10 (base 10), log2, abs, floor, ceil, round, exp, pow, mod. sum/avg/min/max accept lists or arrays: avg(2;4;5), sum([1,2,3]). Commas and semicolons separate arguments; decimals use a dot. Finite real results with floating-point precision. Maximum ${limits.characters} characters, ${limits.nodes} syntax nodes, ${limits.nesting} nested brackets, ${limits.operators} operators per argument/bracket level, and ${limits.depth} syntax-tree levels.`;

const math = create(all!, {
  number: "number",
  matrix: "Array",
  predictable: true,
});
const unary = new Set([
  "sqrt",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "ln",
  "log",
  "log10",
  "log2",
  "abs",
  "floor",
  "ceil",
  "round",
  "exp",
]);
const aggregate = new Set(["sum", "avg", "min", "max"]);
const operators = new Set(["+", "-", "*", "/", "^", "%", "mod"]);
// Only compatibility aliases and the existing mixed scalar/list calling
// convention live here. All arithmetic and aggregation are performed by mathjs.
const scope = new Map<string, unknown>([
  ["ln", math.log],
  ["log", math.log10],
  ...(["sum", "avg", "min", "max"] as const).map(
    (name) =>
      [
        name,
        (...values: (number | number[])[]) =>
          math[name === "avg" ? "mean" : name](values.flat()),
      ] as [string, unknown],
  ),
]);

function checkParsingBudget(expression: string) {
  const levels = [0];
  // Limit recursive grammar paths (powers and unary signs included) before
  // mathjs parses them. Commas start a new argument at the current level.
  for (const token of expression.matchAll(/mod\b|[()[\],;+*/%^\-]/g)) {
    const value = token[0];
    if (value === "(" || value === "[") {
      if (levels.length > limits.nesting)
        throw new Error("Expression is too deeply nested.");
      levels.push(0);
    } else if (value === ")" || value === "]") {
      if (levels.length === 1) throw new Error("Unmatched closing bracket.");
      levels.pop();
    } else if (value === "," || value === ";") {
      levels[levels.length - 1] = 0;
    } else if (++levels[levels.length - 1]! > limits.operators) {
      throw new Error("Too many operators in one argument or bracket level.");
    }
  }
}

/** Validate the numeric subset, then let mathjs compile and evaluate it. */
export function calculate(expression: string): number {
  calculatorInputSchema.parse({ expression });
  if (!expression.trim()) throw new Error("Expression must not be blank.");
  checkParsingBudget(expression);
  const tree = math.parse(expression.replaceAll(";", ","));
  let count = 0;
  const validate = (node: MathNode, depth = 0, allowArray = false): void => {
    if (++count > limits.nodes || depth > limits.depth)
      throw new Error("Expression is too complex.");
    const scalar = (child: MathNode) => validate(child, depth + 1);
    switch (node.type) {
      case "ConstantNode": {
        const { value } = node as import("mathjs").ConstantNode;
        if (typeof value === "number" && Number.isFinite(value)) return;
        break;
      }
      case "SymbolNode":
        if (["pi", "e"].includes((node as import("mathjs").SymbolNode).name))
          return;
        break;
      case "ParenthesisNode":
        validate(
          (node as import("mathjs").ParenthesisNode).content,
          depth + 1,
          allowArray,
        );
        return;
      case "ArrayNode":
        if (allowArray) {
          (node as import("mathjs").ArrayNode).items.forEach(scalar);
          return;
        }
        break;
      case "OperatorNode": {
        const { op, args } = node as import("mathjs").OperatorNode;
        if (
          operators.has(op) &&
          (args.length === 2 || (args.length === 1 && ["+", "-"].includes(op)))
        ) {
          args.forEach(scalar);
          return;
        }
        break;
      }
      case "FunctionNode": {
        const { fn, args } = node as import("mathjs").FunctionNode;
        if (fn.type !== "SymbolNode") break;
        if (aggregate.has(fn.name) && args.length > 0) {
          args.forEach((arg) => validate(arg, depth + 1, true));
          return;
        }
        if (
          (unary.has(fn.name) && args.length === 1) ||
          (["pow", "mod"].includes(fn.name) && args.length === 2)
        ) {
          args.forEach(scalar);
          return;
        }
      }
    }
    throw new Error(
      "Unsupported expression. Use numbers, arithmetic and supported functions only.",
    );
  };
  validate(tree);
  const result: unknown = tree.compile().evaluate(new Map(scope));
  if (typeof result !== "number" || !Number.isFinite(result))
    throw new Error("The result must be a finite real number.");
  return result;
}
