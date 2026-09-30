import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["scripts/with-app-env.mjs", "vite", "build"], {
  stdio: "inherit",
  env: { ...process.env, MUSIFY_DESKTOP: "1" },
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
