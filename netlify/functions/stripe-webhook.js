exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    stripeEvent = JSON.parse(rawBody);
  } catch (err) {
    return { statusCode: 400, body: `Parse error: ${err.message}` };
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
      const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
      const body = JSON.stringify(payload);
      const headers = { "Content-Type": "application/json" };

      // Google Apps Script redirects POST → follow redirect manually to keep POST method
      let res = await fetch(url, { method: "POST", headers, body, redirect: "manual" });
      if (res.status === 301 || res.status === 302) {
        const location = res.headers.get("location");
        res = await fetch(location, { method: "POST", headers, body });
      }
      const text = await res.text();
      console.log("Google Sheets response:", res.status, text);
    } catch (err) {
      console.error("Google Sheets error:", err.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
