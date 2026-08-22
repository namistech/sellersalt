import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Migration Recurrence Prevention: Web and Worker entrypoint scripts and Dockerfiles are properly configured", () => {
  const root = process.cwd();

  // 1. Web Entrypoint Script
  const webScriptPath = path.join(root, "docker/entrypoint-web.sh");
  assert.ok(fs.existsSync(webScriptPath), "docker/entrypoint-web.sh must exist");
  const webScript = fs.readFileSync(webScriptPath, "utf-8");
  assert.ok(webScript.includes("set -e"), "entrypoint-web.sh must specify set -e");
  assert.ok(webScript.includes("npx prisma migrate deploy"), "entrypoint-web.sh must run prisma migrate deploy");
  assert.ok(!webScript.includes("|| echo"), "entrypoint-web.sh must NEVER swallow migration failures with || echo");
  assert.ok(webScript.includes("exec node server.js"), "entrypoint-web.sh must start node server.js");

  // 2. Worker Entrypoint Script
  const workerScriptPath = path.join(root, "docker/entrypoint-worker.sh");
  assert.ok(fs.existsSync(workerScriptPath), "docker/entrypoint-worker.sh must exist");
  const workerScript = fs.readFileSync(workerScriptPath, "utf-8");
  assert.ok(workerScript.includes("set -e"), "entrypoint-worker.sh must specify set -e");
  assert.ok(workerScript.includes("npx prisma migrate deploy"), "entrypoint-worker.sh must run prisma migrate deploy");
  assert.ok(!workerScript.includes("|| echo"), "entrypoint-worker.sh must NEVER swallow migration failures with || echo");
  assert.ok(workerScript.includes("exec npx tsx src/workers/index.ts"), "entrypoint-worker.sh must start worker process");

  // 3. Dockerfile.web
  const dockerfileWeb = fs.readFileSync(path.join(root, "docker/Dockerfile.web"), "utf-8");
  assert.ok(dockerfileWeb.includes("entrypoint-web.sh"), "Dockerfile.web must reference entrypoint-web.sh");
  assert.ok(dockerfileWeb.includes('ENTRYPOINT ["./docker/entrypoint-web.sh"]'), "Dockerfile.web must set entrypoint-web.sh as ENTRYPOINT");

  // 4. Dockerfile.worker
  const dockerfileWorker = fs.readFileSync(path.join(root, "docker/Dockerfile.worker"), "utf-8");
  assert.ok(dockerfileWorker.includes("entrypoint-worker.sh"), "Dockerfile.worker must reference entrypoint-worker.sh");
  assert.ok(dockerfileWorker.includes('ENTRYPOINT ["./docker/entrypoint-worker.sh"]'), "Dockerfile.worker must set entrypoint-worker.sh as ENTRYPOINT");

  // 5. BASE-ARCHITECTURE.md Documentation
  const baseArch = fs.readFileSync(path.join(root, "docs/architecture/BASE-ARCHITECTURE.md"), "utf-8");
  assert.ok(baseArch.includes("Promotion to Main & Migration Safety Protocol"), "BASE-ARCHITECTURE.md must include Section 5 on promotion protocol");
  assert.ok(baseArch.includes("separate PostgreSQL database instances"), "BASE-ARCHITECTURE.md must document database separation");
  assert.ok(baseArch.includes("prisma migrate status"), "BASE-ARCHITECTURE.md must document prisma migrate status check");
});
