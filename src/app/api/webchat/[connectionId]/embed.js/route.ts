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
  root.style.cssText = "position:fixed;z-index:2147483000;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));max-height:calc(100vh - 32px);font-family:Inter,Arial,sans-serif;color:#111827;box-sizing:border-box";
  root.innerHTML = '<button type="button" data-launcher aria-label="Open chat" style="float:right;border:0;border-radius:999px;background:#0F766E;color:white;width:56px;height:56px;box-shadow:0 12px 28px rgba(17,24,39,.22);font-weight:700;outline-offset:3px">AI</button><div hidden role="dialog" aria-label="ReplyOps chat" style="clear:both;margin-top:12px;border:1px solid #dbe4e1;border-radius:8px;background:white;box-shadow:0 20px 44px rgba(17,24,39,.18);overflow:hidden"><header style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#0F766E;color:white;font-weight:700"><span data-title>ReplyOps Chat</span><button type="button" data-close aria-label="Close chat" style="border:0;background:transparent;color:inherit;font-size:18px;line-height:1;cursor:pointer;outline-offset:3px">x</button></header><div data-profile style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;border-bottom:1px solid #dbe4e1"><input data-name aria-label="Customer name" placeholder="Name" style="min-width:0;border:1px solid #cbd5d1;border-radius:6px;padding:8px" /><input data-email aria-label="Customer email" placeholder="Email" inputmode="email" style="min-width:0;border:1px solid #cbd5d1;border-radius:6px;padding:8px" /></div><div data-log role="log" aria-live="polite" style="height:min(280px,42vh);overflow:auto;padding:12px;font-size:14px"></div><p data-typing hidden style="margin:0;padding:0 12px 8px;color:#4b5563;font-size:13px">Assistant is typing...</p><form style="display:flex;gap:8px;border-top:1px solid #dbe4e1;padding:10px"><input aria-label="Message" style="min-width:0;flex:1;border:1px solid #cbd5d1;border-radius:6px;padding:9px;outline-offset:2px" /><button style="border:0;border-radius:6px;background:#0F766E;color:white;padding:0 12px;font-weight:700;outline-offset:2px">Send</button></form></div>';
  const toggle = root.querySelector("[data-launcher]");
  const close = root.querySelector("[data-close]");
  const panel = root.querySelector("div");
  const log = root.querySelector("[data-log]");
  const form = root.querySelector("form");
  const input = root.querySelector("input");
  const nameInput = root.querySelector("[data-name]");
  const emailInput = root.querySelector("[data-email]");
  const typing = root.querySelector("[data-typing]");
  const add = (who, text) => {
    const row = document.createElement("p");
    row.style.cssText = "margin:0 0 10px;line-height:1.45;overflow-wrap:anywhere";
    row.textContent = who + ": " + text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  };
  toggle.addEventListener("click", async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !panel.dataset.loaded) {
      const config = await fetch(baseUrl + "/api/webchat/" + connectionId + "/config", { headers: { "x-replyops-public-key": publicKey } }).then(r => r.json()).catch(() => null);
      if (config?.success) {
        panel.querySelector("[data-title]").textContent = config.title;
        toggle.style.background = config.brand_color;
        panel.querySelector("header").style.background = config.brand_color;
        form.querySelector("button").style.background = config.brand_color;
        if (config.language === "ar") root.dir = "rtl";
        add(config.assistant_name, config.welcome_message);
      }
      panel.dataset.loaded = "1";
      input.focus();
    }
  });
  close.addEventListener("click", () => {
    panel.hidden = true;
    toggle.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    add("You", message);
    typing.hidden = false;
    const response = await fetch(baseUrl + "/api/webchat/" + connectionId + "/message", {
      method: "POST",
      headers: { "content-type": "application/json", "x-replyops-public-key": publicKey },
      body: JSON.stringify({ session_id: sessionId, message_id: crypto.randomUUID(), message, customer_name: nameInput.value.trim(), customer_email: emailInput.value.trim() })
    }).then(r => r.json()).catch(() => ({ success: false }));
    typing.hidden = true;
    add("AI", response.reply || "Support is not available from this widget right now.");
  });
  document.body.appendChild(root);
})();
`
  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
      "vary": "Origin",
    },
  })
}
