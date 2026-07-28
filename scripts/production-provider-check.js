import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function loadEnv(filePath) {
  const vars = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return vars;
}

async function checkGemini(vars) {
  if (!vars.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY=missing");
    return;
  }

  const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
  const { GoogleGenAI } = requireFromCwd("@google/genai");
  const ai = new GoogleGenAI({ apiKey: vars.GEMINI_API_KEY });
  const embeddingModels = ["gemini-embedding-2", "gemini-embedding-001", "text-embedding-004"];
  const generationModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let embeddingModel = null;
  let dimension = 0;
  let generationModel = null;
  let generationOk = false;

  for (const model of embeddingModels) {
    try {
      const embedding = await ai.models.embedContent({
        model,
        contents: ["ReplyOps verification"],
        config: { outputDimensionality: 768 },
      });
      dimension = embedding.embeddings?.[0]?.values?.length ?? 0;
      embeddingModel = model;
      break;
    } catch {
      // Try next model.
    }
  }

  for (const model of generationModels) {
    try {
      const answer = await ai.models.generateContent({
        model,
        contents: "Return only the word ok.",
        config: { temperature: 0 },
      });
      generationModel = model;
      generationOk = /ok/i.test(answer.text || "");
      break;
    } catch {
      // Try next model.
    }
  }

  console.log(`GEMINI_API_KEY=present`);
  console.log(`GEMINI_EMBEDDING_MODEL=${embeddingModel || "none"} dimension=${dimension}`);
  console.log(`GEMINI_GENERATION_MODEL=${generationModel || "none"} ok=${generationOk}`);
}

async function checkTelegram(vars) {
  const tokenName = Object.keys(vars).find((key) => /TELEGRAM/i.test(key) && /TOKEN/i.test(key));
  if (!tokenName || !vars[tokenName]) {
    console.log("TELEGRAM_BOT_TOKEN=missing");
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${vars[tokenName]}/getMe`);
  const json = await response.json();
  console.log(`TELEGRAM_BOT_TOKEN=present`);
  console.log(`TELEGRAM_GETME_OK=${json.ok === true}`);
  if (json.result?.username) {
    console.log(`TELEGRAM_BOT_USERNAME=${json.result.username}`);
  }
}

async function main() {
  const envPath = process.argv[2] || "/var/www/replyops/shared/.env";
  const vars = loadEnv(envPath);
  process.env.GEMINI_API_KEY = vars.GEMINI_API_KEY;
  await checkGemini(vars).catch((error) => {
    console.log(`GEMINI_CHECK_FAILED=${error.name}`);
    if (error.code || error.status) {
      console.log(`GEMINI_CHECK_STATUS=${error.code || error.status}`);
    }
  });
  await checkTelegram(vars).catch((error) => {
    console.log(`TELEGRAM_CHECK_FAILED=${error.name}`);
  });
}

main();
