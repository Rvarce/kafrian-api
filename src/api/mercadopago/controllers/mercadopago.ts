"use strict";

const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = {
  async createPreference(ctx) {
    try {
      const { items, payer, metadata, shippingPrice } = ctx.request.body;

      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
      });

      const preference = new Preference(client);


const mpItems = items.map((i) => ({
  title: i.title,
  quantity: Number(i.qty),
  unit_price: Number(i.price),
  currency_id: "CLP",
}));

// 👇 Agregar el envío como ítem extra
if (shippingPrice && Number(shippingPrice) > 0) {
  mpItems.push({
    title: "Envío",
    quantity: 1,
    unit_price: Number(shippingPrice),
    currency_id: "CLP",
  });
}

const body: any = {
  items: mpItems,
  payer: {
    name: payer.first_name,
    surname: payer.last_name,
    email: payer.email,
    address: payer.address,
  },
  metadata,
  back_urls: {
    success: "http://localhost:3000/success",
    failure: "http://localhost:3000/failure",
    pending: "http://localhost:3000/pending",
  },
  // auto_return: "approved",

  // lo dejamos, aunque no lo veas en la UI, sirve para el cargo en la tarjeta
  statement_descriptor: "KafriaN",
  external_reference: `KafriaN-${Date.now()}`,
};

console.log("📦 MP Preference body:", JSON.stringify(body, null, 2));

const result = await preference.create({ body });

return {
  id: result.id,
  init_point: result.init_point,
};

    } catch (error) {
      console.error("MP ERROR:", error);
      return ctx.badRequest("Error creando preference");
    }
  },
};
