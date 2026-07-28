import fs from "node:fs";

function loadEnv(filePath) {
  const vars = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return vars;
}

function cookieHeader(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : headers.get("set-cookie")?.split(/,(?=[^;]+?=)/) || [];
  return raw.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function main() {
  const vars = loadEnv(process.argv[2] || "/var/www/replyops/shared/.env");
  const email = vars.REPLYOPS_OWNER_EMAIL || "abudfun@gmail.com";
  const passwordName = vars.REPLYOPS_OWNER_CURRENT_PASSWORD
    ? "REPLYOPS_OWNER_CURRENT_PASSWORD"
    : vars.REPLYOPS_OWNER_BOOTSTRAP_PASSWORD
    ? "REPLYOPS_OWNER_BOOTSTRAP_PASSWORD"
    : Object.keys(vars).find((key) => /ADMIN|OWNER|INITIAL/i.test(key) && /PASSWORD/i.test(key));
  const password = passwordName ? vars[passwordName] : "";

  if (!password) {
    console.log("AUTH_OWNER_PASSWORD=missing");
    return;
  }

  const base = "https://replyops.abud.fun";
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const csrfCookie = cookieHeader(csrfRes.headers);
  const csrfJson = await csrfRes.json();

  const body = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    email,
    password,
    json: "true",
  });

  const loginRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: csrfCookie,
    },
    body,
    redirect: "manual",
  });

  const cookies = loginRes.headers.get("set-cookie") || "";
  console.log(`AUTH_LOGIN_STATUS=${loginRes.status}`);
  console.log(`AUTH_SESSION_COOKIE=${/next-auth\.session-token|__Secure-next-auth\.session-token/.test(cookies)}`);
  console.log(`AUTH_HTTPONLY=${/HttpOnly/i.test(cookies)}`);
  console.log(`AUTH_SAMESITE=${/SameSite=Lax|SameSite=Strict/i.test(cookies)}`);
  console.log(`AUTH_SECURE_COOKIE=${/Secure/i.test(cookies)}`);

  const invalidBody = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    email,
    password: `${password}-invalid`,
    json: "true",
  });
  const invalidRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: csrfCookie,
    },
    body: invalidBody,
    redirect: "manual",
  });
  console.log(`AUTH_INVALID_STATUS=${invalidRes.status}`);

  const dashboardRes = await fetch(`${base}/dashboard`, { redirect: "manual" });
  console.log(`AUTH_DASHBOARD_ANON_STATUS=${dashboardRes.status}`);
}

main().catch((error) => {
  console.log(`AUTH_SMOKE_FAILED=${error.name}`);
});
