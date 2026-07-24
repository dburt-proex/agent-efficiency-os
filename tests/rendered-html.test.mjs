import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("ships the governed literacy pilot contract", async () => {
  const consoleSource = await readFile(new URL("../app/operations-console.tsx", import.meta.url), "utf8");
  const operationsSource = await readFile(new URL("../app/api/operations/route.ts", import.meta.url), "utf8");

  assert.match(consoleSource, /AEOS-LIT-1\.0/);
  assert.match(consoleSource, /Register Module 0 run/);
  assert.match(operationsSource, /initialize_mastery_run/);
  assert.match(operationsSource, /artifact possession is not evidence of independent runtime mastery/i);
});
