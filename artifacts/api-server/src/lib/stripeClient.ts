// Stripe integration via Replit connector (stripe-replit-sync)
import Stripe from "stripe";

async function fetchConnectionSettings(hostname: string, token: string, environment: string) {
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", environment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": token,
    },
  });

  const data = await response.json() as { items?: Array<{ settings?: { publishable?: string; secret?: string } }> };
  const item = data.items?.[0];
  if (item?.settings?.publishable && item?.settings?.secret) {
    return {
      publishableKey: item.settings.publishable as string,
      secretKey: item.settings.secret as string,
    };
  }
  return null;
}

async function getCredentials() {
  // Fallback: plain env vars (set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY if needed)
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Stripe credentials not found: no STRIPE_SECRET_KEY env var and no Replit connector token");
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

  // Try preferred environment first, then fall back to the other
  const environments = isProduction
    ? ["production", "development"]
    : ["development", "production"];

  for (const env of environments) {
    const creds = await fetchConnectionSettings(hostname, xReplitToken, env);
    if (creds) return creds;
  }

  throw new Error("Stripe connection not found in any environment (production or development)");
}

// WARNING: Never cache this client — always call to get a fresh instance
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
