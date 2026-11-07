const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

const id = (prefix = "DN") => `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
const slugify = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
async function makeToken(secret) {
  const payload = btoa(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000, role: "admin" }));
  return `${payload}.${await sign(payload, secret)}`;
}
async function isAdmin(request, env) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !env.SESSION_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== await sign(payload, env.SESSION_SECRET)) return false;
  try { const data = JSON.parse(atob(payload)); return data.role === "admin" && data.exp > Date.now(); } catch { return false; }
}
const safeText = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const randomSlug = (bride, groom) => `${slugify(bride)}-${slugify(groom)}-${crypto.randomUUID().slice(0, 5)}`;

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = request.method;
  try {
    if (path === "health" && method === "GET") return json({ ok: true, brand: "Dawat Nama" });

    if (path === "login" && method === "POST") {
      const body = await request.json();
      if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: "Admin secrets are not configured." }, 503);
      if (safeText(body.password, 200) !== env.ADMIN_PASSWORD) return json({ error: "Incorrect password." }, 401);
      return json({ token: await makeToken(env.SESSION_SECRET) });
    }

    if (path === "templates" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT id, slug, name, collection, description, price_pkr, cover_image, demo_style FROM templates WHERE active=1 AND is_custom=0 ORDER BY created_at DESC").all();
      return json({ templates: results || [] });
    }

    if (path.startsWith("invitations/") && method === "GET") {
      const slug = path.split("/")[1];
      const row = await env.DB.prepare(`
        SELECT i.slug, t.name AS template_name, t.demo_style, c.full_name AS customer_name,
          cd.bride_name, cd.bride_father, cd.groom_name, cd.groom_father
        FROM invitations i
        JOIN orders o ON o.id=i.order_id
        JOIN customers c ON c.id=o.customer_id
        JOIN couple_details cd ON cd.order_id=o.id
        LEFT JOIN templates t ON t.id=i.template_id
        WHERE i.slug=? AND i.published=1
      `).bind(slug).first();
      if (!row) return json({ error: "Invitation not found." }, 404);
      const { results: events } = await env.DB.prepare("SELECT event_name, event_date, venue_name, venue_address, maps_url FROM events WHERE order_id=(SELECT order_id FROM invitations WHERE slug=?) ORDER BY event_index").bind(slug).all();
      return json({ invitation: row, events: events || [] });
    }

    if (path === "orders" && method === "POST") {
      const body = await request.json();
      const customer = body.customer || {};
      const couple = body.couple || {};
      const events = Array.isArray(body.events) ? body.events.slice(0, 12) : [];
      if (!safeText(customer.fullName, 120) || !safeText(customer.phone, 40) || !safeText(couple.brideName, 120) || !safeText(couple.groomName, 120)) return json({ error: "Please complete customer, bride and groom details." }, 400);
      if (!events.length || events.some(e => !safeText(e.name, 100) || !safeText(e.date, 30) || !safeText(e.venue, 160) || !safeText(e.address, 300))) return json({ error: "Please complete every event's name, date, venue and address." }, 400);
      const orderId = id("DN");
      const customerId = id("CUS");
      const orderType = body.orderType === "custom" ? "custom" : "ready_made";
      let template = null;
      if (orderType === "ready_made") {
        template = await env.DB.prepare("SELECT id, price_pkr FROM templates WHERE slug=? AND active=1").bind(safeText(body.templateSlug, 80)).first();
        if (!template) return json({ error: "Please select an available template." }, 400);
      }
      const amount = orderType === "custom" ? 0 : Number(template.price_pkr || 0);
      const batch = [
        env.DB.prepare("INSERT INTO customers (id, full_name, phone, email) VALUES (?, ?, ?, ?)").bind(customerId, safeText(customer.fullName,120), safeText(customer.phone,40), safeText(customer.email,160)),
        env.DB.prepare("INSERT INTO orders (id, order_type, customer_id, template_id, status, payment_status, amount_pkr, notes) VALUES (?, ?, ?, ?, 'pending_payment', 'unpaid', ?, ?)").bind(orderId, orderType, customerId, template?.id || null, amount, safeText(body.notes,1000)),
        env.DB.prepare("INSERT INTO couple_details (order_id, bride_name, bride_father, groom_name, groom_father) VALUES (?, ?, ?, ?, ?)").bind(orderId, safeText(couple.brideName,120), safeText(couple.brideFather,120), safeText(couple.groomName,120), safeText(couple.groomFather,120))
      ];
      events.forEach((e, index) => batch.push(env.DB.prepare("INSERT INTO events (id, order_id, event_index, event_name, event_date, venue_name, venue_address, maps_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id("EVT"), orderId, index + 1, safeText(e.name,100), safeText(e.date,30), safeText(e.venue,160), safeText(e.address,300), safeText(e.maps,500))));
      if (orderType === "custom") batch.push(env.DB.prepare("INSERT INTO custom_requests (order_id, style_preference, reference_links, budget_note) VALUES (?, ?, ?, ?)").bind(orderId, safeText(body.custom?.style,500), safeText(body.custom?.references,1000), safeText(body.custom?.budget,300)));
      await env.DB.batch(batch);
      return json({ ok: true, orderId, amountPkr: amount, message: "Order received. Please send your payment proof or discuss your custom quote on WhatsApp." }, 201);
    }

    if (path === "admin/orders" && method === "GET") {
      if (!await isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
      const { results } = await env.DB.prepare(`
        SELECT o.id, o.order_type, o.status, o.payment_status, o.amount_pkr, o.created_at,
          c.full_name, c.phone, cd.bride_name, cd.groom_name, t.name AS template_name
        FROM orders o JOIN customers c ON c.id=o.customer_id
        LEFT JOIN couple_details cd ON cd.order_id=o.id
        LEFT JOIN templates t ON t.id=o.template_id
        ORDER BY o.created_at DESC LIMIT 100
      `).all();
      return json({ orders: results || [] });
    }

    if (path.startsWith("admin/orders/") && method === "PATCH") {
      if (!await isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
      const orderId = path.split("/")[2];
      const body = await request.json();
      const payment = ["unpaid","submitted","verified","rejected"].includes(body.paymentStatus) ? body.paymentStatus : null;
      const status = ["pending_payment","in_progress","ready_to_publish","published","cancelled"].includes(body.status) ? body.status : null;
      if (!payment && !status) return json({ error: "No valid status supplied." }, 400);
      if (payment) await env.DB.prepare("UPDATE orders SET payment_status=? WHERE id=?").bind(payment, orderId).run();
      if (status) await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(status, orderId).run();
      return json({ ok: true });
    }

    if (path.startsWith("admin/orders/") && path.endsWith("/publish") && method === "POST") {
      if (!await isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
      const orderId = path.split("/")[2];
      const order = await env.DB.prepare("SELECT o.id, o.payment_status, o.template_id, cd.bride_name, cd.groom_name FROM orders o JOIN couple_details cd ON cd.order_id=o.id WHERE o.id=?").bind(orderId).first();
      if (!order) return json({ error: "Order not found." }, 404);
      if (order.payment_status !== "verified") return json({ error: "Verify payment before publishing." }, 409);
      const slug = randomSlug(order.bride_name, order.groom_name);
      await env.DB.prepare("INSERT INTO invitations (id, order_id, slug, template_id, published, published_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT(order_id) DO UPDATE SET slug=excluded.slug, published=1, published_at=CURRENT_TIMESTAMP").bind(id("INV"), orderId, slug, order.template_id).run();
      await env.DB.prepare("UPDATE orders SET status='published' WHERE id=?").bind(orderId).run();
      return json({ ok: true, slug, url: `${url.origin}/i/${slug}` });
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    return json({ error: "Server error.", detail: env.ENVIRONMENT === "development" ? String(error) : undefined }, 500);
  }
}