import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { FREE_AI_LIMIT } from "../lib/freeUsage";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripeClient";

const router: IRouter = Router();

// GET /subscription/status — returns current user's subscription status
router.get("/subscription/status", async (req: Request, res: Response) => {
  if (!!!req.userId) {
    res.json({ status: "free", isPremium: false });
    return;
  }

  try {
    const [user] = await db
      .select({
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        stripeCustomerId: usersTable.stripeCustomerId,
        freeAiUses: usersTable.freeAiUses,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    const status = user?.stripeSubscriptionStatus || "free";
    const isPremium = status === "active" || status === "trialing";
    const freeAiUses = user?.freeAiUses ?? 0;
    const freeAiUsesRemaining = isPremium ? null : Math.max(0, FREE_AI_LIMIT - freeAiUses);

    res.json({ status, isPremium, freeAiUses, freeAiUsesRemaining, freeAiLimit: FREE_AI_LIMIT });
  } catch (err) {
    req.log.error({ err }, "Error fetching subscription status");
    res.json({ status: "free", isPremium: false });
  }
});

// GET /subscription/publishable-key — returns Stripe publishable key for frontend
router.get("/subscription/publishable-key", async (_req: Request, res: Response) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    res.status(500).json({ error: "Could not load payment config" });
  }
});

// POST /subscription/create-checkout — creates Stripe checkout session
router.post("/subscription/create-checkout", async (req: Request, res: Response) => {
  if (!!!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    // Determine base URL for redirect
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
    const baseUrl = `${proto}://${host}`;

    // Look up or create the premium price
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
      res.status(500).json({ error: "Produto premium não configurado" });
      return;
    }

    const sessionParams: any = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${baseUrl}/app/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/app/pricing?canceled=true`,
      metadata: { userId: user.id },
    };

    // Use existing customer if available
    if (user.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId;
    } else if (user.email) {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Error creating checkout session");
    res.status(500).json({ error: "Erro ao criar sessão de pagamento" });
  }
});

// POST /subscription/create-portal — creates Stripe billing portal session
router.post("/subscription/create-portal", async (req: Request, res: Response) => {
  if (!!!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const [user] = await db
      .select({ stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "Nenhuma assinatura ativa encontrada" });
      return;
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
    const baseUrl = `${proto}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/app/pricing`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    req.log.error({ err }, "Error creating portal session");
    res.status(500).json({ error: "Erro ao abrir portal de assinatura" });
  }
});

export default router;
