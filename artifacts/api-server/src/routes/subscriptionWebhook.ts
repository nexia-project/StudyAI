// Stripe webhook handler — must be mounted with express.raw() body parser
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../lib/stripeClient";
import Stripe from "stripe";

const router: IRouter = Router();

type StripeId = string | { id: string } | null | undefined;

type CheckoutSessionWebhookPayload = {
  client_reference_id?: string | null;
  metadata?: { userId?: string } | null;
  customer?: StripeId;
  subscription?: StripeId;
};

type SubscriptionWebhookPayload = {
  id: string;
  customer?: StripeId;
  status: string;
};

function getStripeId(value: StripeId): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return value?.id;
}

function allowUnverifiedStripeWebhook(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.STRIPE_WEBHOOK_ALLOW_UNVERIFIED === "true";
}

router.post("/subscription/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else if (allowUnverifiedStripeWebhook()) {
      req.log.warn("Processing unverified Stripe webhook because STRIPE_WEBHOOK_ALLOW_UNVERIFIED=true in non-production");
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body);
      event = JSON.parse(rawBody) as Stripe.Event;
    } else {
      req.log.warn({ hasWebhookSecret: Boolean(webhookSecret), hasStripeSignature: Boolean(sig) }, "Rejecting unsigned Stripe webhook");
      res.status(400).json({ error: "Missing Stripe webhook signature or secret" });
      return;
    }
  } catch (err: any) {
    req.log.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  req.log.info({ type: event.type }, "Stripe webhook received");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as CheckoutSessionWebhookPayload;
        const userId = session.client_reference_id || (session.metadata?.userId as string);
        const customerId = getStripeId(session.customer);
        const subscriptionId = getStripeId(session.subscription);

        if (userId) {
          await db
            .update(usersTable)
            .set({
              stripeCustomerId: customerId || undefined,
              stripeSubscriptionId: subscriptionId || undefined,
              stripeSubscriptionStatus: "active",
              updatedAt: new Date(),
            })
            .where(eq(usersTable.id, userId));
          req.log.info({ userId }, "Subscription activated via checkout");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as SubscriptionWebhookPayload;
        const customerId = getStripeId(subscription.customer);
        const status = subscription.status;

        if (!customerId) {
          req.log.warn({ subscriptionId: subscription.id }, "Subscription update without customer ID");
          break;
        }

        await db
          .update(usersTable)
          .set({
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: status === "active" || status === "trialing" ? "active" : "inactive",
            updatedAt: new Date(),
          })
          .where(eq(usersTable.stripeCustomerId, customerId));

        req.log.info({ customerId, status }, "Subscription updated");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as SubscriptionWebhookPayload;
        const customerId = getStripeId(subscription.customer);

        if (!customerId) {
          req.log.warn({ subscriptionId: subscription.id }, "Subscription deletion without customer ID");
          break;
        }

        await db
          .update(usersTable)
          .set({
            stripeSubscriptionStatus: "inactive",
            stripeSubscriptionId: undefined,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.stripeCustomerId, customerId));

        req.log.info({ customerId }, "Subscription cancelled");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        await db
          .update(usersTable)
          .set({
            stripeSubscriptionStatus: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(usersTable.stripeCustomerId, customerId));

        req.log.info({ customerId }, "Payment failed");
        break;
      }

      default:
        req.log.info({ type: event.type }, "Unhandled webhook event");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Error processing webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
