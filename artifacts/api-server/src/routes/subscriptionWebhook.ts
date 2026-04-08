// Stripe webhook handler — must be mounted with express.raw() body parser
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../lib/stripeClient";
import Stripe from "stripe";

const router: IRouter = Router();

router.post("/subscription/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    const stripe = await getUncachableStripeClient();

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Dev/sandbox mode: parse raw body as JSON without signature verification
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body);
      event = JSON.parse(rawBody) as Stripe.Event;
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
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || (session.metadata?.userId as string);
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

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
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

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
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

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
