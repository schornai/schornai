import {
  platformMcpHandler,
  platformMcpOptions,
} from "@/lib/platformMcp/handleRequest";
export const POST = platformMcpHandler();
export const GET = POST;
export const DELETE = POST;
export const OPTIONS = platformMcpOptions;
