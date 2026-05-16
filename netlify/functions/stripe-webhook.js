const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

    console.log("Session metadata:", JSON.stringify(meta));
    const payload = {
      order_ref:   meta.order_ref   || "—",
      name:        meta.name        || "—",
      email:       meta.email       || session.customer_email || "—",
      phone:       meta.phone       || "—",
      postal_code: meta.postal_code || "—",
      address:     meta.address     || "—",
      note:        meta.note        || "—",
      items:       meta.items       || "—",
      shipping:    meta.shipping    || "—",
      total:       session.amount_total
                     ? (session.amount_total / 100).toFixed(2) + " €"
                     : "—",
    };

    // Google Sheets — send as URL params via GET to avoid redirect/method issues
    try {
      const params = new URLSearchParams(payload).toString();
      const url = `${process.env.GOOGLE_SHEET_WEBHOOK_URL}?${params}`;
      const res = await fetch(url);
      console.log("Google Sheets response:", res.status);
    } catch (err) {
      console.error("Google Sheets error:", err.message);
    }

    // Fetch Stripe invoice PDF if available
    let invoiceAttachment = null;
    if (session.invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(session.invoice);
        if (invoice.invoice_pdf) {
          const pdfRes = await fetch(invoice.invoice_pdf);
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          invoiceAttachment = {
            filename: `fatura-${payload.order_ref}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          };
        }
      } catch (err) {
        console.error("Invoice fetch error:", err.message);
      }
    }

    // Confirmation email
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: `Cangurito <${process.env.GMAIL_USER}>`,
        to: payload.email,
        subject: `Confirmação da sua encomenda ${payload.order_ref}`,
        attachments: invoiceAttachment ? [invoiceAttachment] : [],
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#3b2a1a">
            <h2 style="color:#8b5c2a">Obrigada pela sua encomenda! 🎁</h2>
            <p>Olá ${payload.name},</p>
            <p>O seu pagamento foi recebido com sucesso. Aqui ficam os detalhes da sua encomenda:</p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <tr style="background:#f9f4ef">
                <td style="padding:8px 12px;font-weight:bold">Referência</td>
                <td style="padding:8px 12px">${payload.order_ref}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:bold;vertical-align:top">Produtos</td>
                <td style="padding:8px 12px">${payload.items.split(" | ").join("<br>")}</td>
              </tr>
              <tr style="background:#f9f4ef">
                <td style="padding:8px 12px;font-weight:bold">Portes</td>
                <td style="padding:8px 12px">${payload.shipping}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:bold">Total</td>
                <td style="padding:8px 12px"><strong>${payload.total}</strong></td>
              </tr>
              <tr style="background:#f9f4ef">
                <td style="padding:8px 12px;font-weight:bold">Morada</td>
                <td style="padding:8px 12px">${payload.address}, ${payload.postal_code}</td>
              </tr>
              ${payload.note !== "—" ? `
              <tr>
                <td style="padding:8px 12px;font-weight:bold">Observações</td>
                <td style="padding:8px 12px">${payload.note}</td>
              </tr>` : ""}
            </table>

            <p>Iremos preparar a sua encomenda com todo o carinho e entraremos em contacto assim que for enviada.</p>

            <div style="background:#f9f4ef;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="margin:0 0 8px 0">Tem alguma dúvida? Pode responder diretamente a este e-mail e entraremos em contacto o mais brevemente possível.</p>
              <p style="margin:0">Siga-nos no Instagram para novidades e inspirações: <a href="https://instagram.com/cangurito2026" style="color:#8b5c2a">@cangurito2026</a></p>
            </div>

            <p>Com carinho,<br><strong>Equipa Cangurito</strong></p>
          </div>
        `,
      });
      console.log("Email sent to:", payload.email);
    } catch (err) {
      console.error("Email error:", err.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
