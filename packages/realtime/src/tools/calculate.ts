import { parse, type MathNode } from "mathjs";

const functions: Record<string, (...values: number[]) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  exp: Math.exp,
  pow: Math.pow,
  mod: (a, b) => ((a % b) + b) % b,
  sum: (...a) => a.reduce((sum, value) => sum + value, 0),
  avg: (...a) => a.reduce((sum, value) => sum + value, 0) / a.length,
  min: Math.min,
  max: Math.max,
};
const binary: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "^": Math.pow,
  "%": functions.mod!,
  mod: functions.mod!,
};

/** Parse with mathjs, then interpret only bounded numeric expressions. No scope,
 * compilation, assignments, property access, units or allocation functions. */
export function calculate(expression: string): number {
  if (!expression.trim() || expression.length > 2000)
    throw new Error("Expression must contain 1–2000 characters.");
  let depth = 0;
  for (const c of expression) {
    if (c === "(" || c === "[") {
      if (++depth > 32) throw new Error("Expression is too deeply nested.");
    }
    if (c === ")" || c === "]") depth--;
  }
  const tree = parse(expression.replaceAll(";", ","));
  let count = 0;
  const visit = (node: MathNode, level = 0): number | number[] => {
    if (++count > 512 || level > 64)
      throw new Error("Expression is too complex.");
    const scalar = (child: MathNode) => {
      const value = visit(child, level + 1);
      if (typeof value !== "number") throw new Error("Expected a number.");
      return value;
    };
    if (node.type === "ConstantNode") {
      const value = (node as import("mathjs").ConstantNode).value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    if (node.type === "SymbolNode") {
      const name = (node as import("mathjs").SymbolNode).name;
      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
    }
    if (node.type === "ParenthesisNode")
      return visit(
        (node as import("mathjs").ParenthesisNode).content,
        level + 1,
      );
    if (node.type === "ArrayNode")
      return (node as import("mathjs").ArrayNode).items.map(scalar);
    if (node.type === "OperatorNode") {
      const { op, args } = node as import("mathjs").OperatorNode;
      if (args.length === 1 && (op === "+" || op === "-"))
        return (op === "-" ? -1 : 1) * scalar(args[0]!);
      if (args.length === 2 && Object.hasOwn(binary, op))
        return binary[op]!(scalar(args[0]!), scalar(args[1]!));
    }
    if (node.type === "FunctionNode") {
      const { fn, args } = node as import("mathjs").FunctionNode;
      if (fn.type !== "SymbolNode" || !Object.hasOwn(functions, fn.name))
        throw new Error("Unsupported function.");
      const aggregate = ["sum", "avg", "min", "max"].includes(fn.name);
      const values = aggregate
        ? args.flatMap((a) => visit(a, level + 1))
        : args.map(scalar);
      const arity = ["pow", "mod"].includes(fn.name) ? 2 : 1;
      if (aggregate ? values.length === 0 : values.length !== arity)
        throw new Error("Invalid number of arguments.");
      return functions[fn.name]!(...values);
    }
    throw new Error(
      "Unsupported expression. Use numbers, arithmetic and supported functions only.",
    );
  };
  const result = visit(tree);
  if (typeof result !== "number" || !Number.isFinite(result))
    throw new Error("The result must be a finite real number.");
  return result;
}
