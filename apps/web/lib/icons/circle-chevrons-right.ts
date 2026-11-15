import { createLucideIcon } from "lucide-react";

// Keep the requested double-chevron icon on the repository's pinned Lucide
// version, which only exports the single-chevron circle variant.
export const CircleChevronsRight = createLucideIcon("CircleChevronsRight", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "circle" }],
  ["path", { d: "m7 9 3 3-3 3", key: "first" }],
  ["path", { d: "m12 9 3 3-3 3", key: "second" }],
]);
