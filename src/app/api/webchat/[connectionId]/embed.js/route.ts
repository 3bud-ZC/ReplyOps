import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const script = `
(() => {
  const currentScript = document.currentScript;
  const publicKey = currentScript?.dataset.replyopsKey || "";
  const connectionId = ${JSON.stringify(connectionId)};
  const baseUrl = ${JSON.stringify(baseUrl)};
  const sessionKey = "replyops_session_" + connectionId;
  const sessionId = localStorage.getItem(sessionKey) || crypto.randomUUID();
  localStorage.setItem(sessionKey, sessionId);
  const root = document.createElement("section");
  root.setAttribute("aria-live", "polite");
  root.style.cssText = "position:fixed;z-index:2147483000;right:20px;bottom:20px;width:min(360px,calc(100vw - 32px));font-family:Inter,Arial,sans-serif;color:#111827";
  root.innerHTML = '<button type="button" style="float:right;border:0;border-radius:999px;background:#0F766E;color:white;width:56px;height:56px;box-shadow:0 12px 28px rgba(17,24,39,.22);font-weight:700">AI</button><div hidden style="clear:both;margin-top:12px;border:1px solid #dbe4e1;border-radius:8px;background:white;box-shadow:0 20px 44px rgba(17,24,39,.18);overflow:hidden"><header style="padding:12px 14px;background:#0F766E;color:white;font-weight:700">ReplyOps Chat</header><div data-log style="height:280px;overflow:auto;padding:12px;font-size:14px"></div><form style="display:flex;gap:8px;border-top:1px solid #dbe4e1;padding:10px"><input aria-label="Message" style="min-width:0;flex:1;border:1px solid #cbd5d1;border-radius:6px;padding:9px" /><button style="border:0;border-radius:6px;background:#0F766E;color:white;padding:0 12px;font-weight:700">Send</button></form></div>';
  const toggle = root.querySelector("button");
  const panel = root.querySelector("div");
  const log = root.querySelector("[data-log]");
  const form = root.querySelector("form");
  const input = root.querySelector("input");
  const add = (who, text) => {
    const row = document.createElement("p");
    row.style.cssText = "margin:0 0 10px;line-height:1.45";
    row.textContent = who + ": " + text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  };
  toggle.addEventListener("click", async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !panel.dataset.loaded) {
      const config = await fetch(baseUrl + "/api/webchat/" + connectionId + "/config", { headers: { "x-replyops-public-key": publicKey } }).then(r => r.json()).catch(() => null);
      if (config?.success) {
        panel.querySelector("header").textContent = config.title;
        toggle.style.background = config.brand_color;
        panel.querySelector("header").style.background = config.brand_color;
        add(config.assistant_name, config.welcome_message);
      }
      panel.dataset.loaded = "1";
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    add("You", message);
    const response = await fetch(baseUrl + "/api/webchat/" + connectionId + "/message", {
      method: "POST",
      headers: { "content-type": "application/json", "x-replyops-public-key": publicKey },
      body: JSON.stringify({ session_id: sessionId, message_id: crypto.randomUUID(), message })
    }).then(r => r.json()).catch(() => ({ success: false }));
    add("AI", response.reply || "Support is not available from this widget right now.");
  });
  document.body.appendChild(root);
})();
`
  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  })
}
