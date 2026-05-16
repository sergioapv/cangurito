const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const SITE_URL = "https://cangurito-site.netlify.app";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { items, customer, orderRef } = JSON.parse(event.body);

    const itemsSummary = items
      .map((i) => `${i.name} (${i.color}) x${i.qty}`)
      .join(" | ");

    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
      mode: "payment",
      customer_email: customer.email,
      line_items: items.map((item) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${item.name} — ${item.color}`,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),
      metadata: {
        order_ref:   orderRef,
        name:        customer.name,
        email:       customer.email,
        phone:       customer.phone,
        postal_code: customer.postal,
        address:     customer.address,
        note:        customer.note || "—",
        items:       itemsSummary,
      },
      payment_intent_data: {
        metadata: {
          order_ref:   orderRef,
          name:        customer.name,
          phone:       customer.phone,
          postal_code: customer.postal,
          address:     customer.address,
          note:        customer.note || "—",
          items:       itemsSummary,
        },
      },
      success_url: `${SITE_URL}/success.html?ref=${orderRef}`,
      cancel_url:  `${SITE_URL}/`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
