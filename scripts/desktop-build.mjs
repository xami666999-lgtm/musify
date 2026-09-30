import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mergeAppEnv, projectRoot, readAppEnv } from "./with-app-env.mjs";

const viteJs = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const env = { ...mergeAppEnv(readAppEnv(projectRoot()), process.env), MUSIFY_DESKTOP: "1" };

const child = spawn(process.execPath, [viteJs, "build"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
