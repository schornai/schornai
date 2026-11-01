import { generateDockerEnv } from "./generateDockerEnv.ts";

console.log(generateDockerEnv({ samlPrivateKey: process.argv[2] ?? "" }));
