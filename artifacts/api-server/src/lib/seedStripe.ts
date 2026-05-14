// Script to seed Stripe product and price for StudyAI Premium
// Run with: npx tsx artifacts/api-server/src/lib/seedStripe.ts
//
// IMPORTANT — preços vigentes (manter sincronizados com Pricing.tsx / Landing.tsx):
//   - Pro mensal:  R$ 59,90 (unit_amount: 5990 BRL, interval: month)
//   - Pro anual:   R$ 359,40 (unit_amount: 35940 BRL, interval: year)
//     => 50% off real sobre o mensal (59,90 × 12 = 718,80 → metade = 359,40)
//
// Como o produto ainda não é comercial, os preços podem ser recriados livremente
// no dashboard do Stripe sem migração de assinaturas. Após qualquer mudança aqui,
// regere os Price IDs no dashboard e atualize STRIPE_PREMIUM_PRICE_ID
// (e o futuro STRIPE_PREMIUM_ANNUAL_PRICE_ID, quando existir) no ambiente.
import { getUncachableStripeClient } from "./stripeClient";
import * as fs from "fs";
import * as path from "path";

async function seed() {
  const stripe = await getUncachableStripeClient();

  // Check if product already exists
  const products = await stripe.products.search({ query: 'name:"StudyAI Premium"' });

  let product;
  if (products.data.length > 0) {
    product = products.data[0];
    console.log("Found existing product:", product.id);
  } else {
    product = await stripe.products.create({
      name: "StudyAI Premium",
      description: "Acesso ilimitado a todos os recursos do StudyAI: Simulados, Flashcards, Resumão Estratégico, Correção de Redação, Ranking e muito mais.",
    });
    console.log("Created product:", product.id);
  }

  // Check if price already exists
  const prices = await stripe.prices.list({ product: product.id, active: true });
  let price;
  if (prices.data.length > 0) {
    price = prices.data[0];
    console.log("Found existing price:", price.id, `= ${price.unit_amount} ${price.currency}`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2990, // R$29,90
      currency: "brl",
      recurring: { interval: "month" },
    });
    console.log("Created price:", price.id, "= R$29,90/mês");
  }

  console.log("\n✅ Stripe product seeded successfully!");
  console.log(`\nAdd this to your environment variables:`);
  console.log(`STRIPE_PREMIUM_PRICE_ID=${price.id}`);

  return price.id;
}

seed()
  .then((priceId) => {
    console.log("\nDone! Price ID:", priceId);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
