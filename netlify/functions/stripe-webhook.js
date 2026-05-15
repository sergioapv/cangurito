const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const meta = session.metadata || {};

    const payload = {
      order_ref:   meta.order_ref   || "—",
      name:        meta.name        || "—",
      email:       meta.email       || session.customer_email || "—",
      phone:       meta.phone       || "—",
      postal_code: meta.postal_code || "—",
      address:     meta.address     || "—",
      note:        meta.note        || "—",
      items:       meta.items       || "—",
      total:       session.amount_total
                     ? (session.amount_total / 100).toFixed(2) + " €"
                     : "—",
    };

    try {
      await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Google Sheets error:", err.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
