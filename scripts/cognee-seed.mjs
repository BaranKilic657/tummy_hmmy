#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.COGWIT_API_BASE?.trim();
const apiKey = process.env.COGWIT_API_KEY?.trim()?.replace(/^"|"$/g, "");
const datasetName = process.env.COGWIT_DATASET_NAME?.trim() || "tummy-default";

if (!baseUrl || !apiKey) {
  console.error("Missing COGWIT_API_BASE or COGWIT_API_KEY in environment.");
  process.exit(1);
}

const filesToSeed = ["tum_systems.md", "README.md"];

const docs = [];
for (const rel of filesToSeed) {
  try {
    const content = await readFile(resolve(process.cwd(), rel), "utf8");
    docs.push(`Source: ${rel}\n\n${content.slice(0, 18000)}`);
  } catch (error) {
    console.warn(`Skipping ${rel}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (docs.length === 0) {
  console.error("No source files found for Cognee seed.");
  process.exit(1);
}

const addResp = await fetch(join(baseUrl, "/api/v1/add_text"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
  },
  body: JSON.stringify({
    textData: docs,
    datasetName,
  }),
});

const addJson = await parseJson(addResp);
if (!addResp.ok) {
  if (addResp.status === 413) {
    console.warn("add_text skipped due quota limit", summarize(addJson));
    console.warn("Continuing with cognify on existing dataset.");
  } else {
    console.error("add_text failed", addResp.status, addJson);
    process.exit(1);
  }
} else {
  console.log("add_text ok", summarize(addJson));
}

const cognifyResp = await fetch(join(baseUrl, "/api/v1/cognify"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
  },
  body: JSON.stringify({
    datasets: [datasetName],
    runInBackground: false,
  }),
});

const cognifyJson = await parseJson(cognifyResp);
if (!cognifyResp.ok) {
  console.error("cognify failed", cognifyResp.status, cognifyJson);
  process.exit(1);
}

console.log("cognify ok", summarize(cognifyJson));
console.log("Cognee seed complete. Retry chat now.");

function join(base, suffix) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${b}${suffix}`;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function summarize(value) {
  const text = JSON.stringify(value);
  return text.length <= 360 ? value : `${text.slice(0, 360)}...`;
}
