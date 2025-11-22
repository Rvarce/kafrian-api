import { MercadoPagoConfig, Payment } from 'mercadopago'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
})

const paymentClient = new Payment(mp)

export async function processWebhook(payload) {
  try {
    // 1️⃣ Validar tipo de evento
    if (payload.type !== 'payment') {
      console.log('⚠️ Evento ignorado:', payload.type)
      return
    }

    const paymentId = payload.data.id
    console.log('🔍 Consultando pago MercadoPago:', paymentId)

    // 2️⃣ Obtener información real del pago
    const payment = await paymentClient.get({ id: paymentId })

    console.log('💳 Estado del pago:', payment.status)

    // 3️⃣ Si el pago NO está aprobado → no crear orden
    if (payment.status !== 'approved') {
      console.log('⏳ Pago no aprobado todavía.')
      return
    }

    // 4️⃣ Extraer metadata completa enviada desde el FRONT
    const metadata = payment.metadata || {}

    // 5️⃣ Extraer datos del pagador desde MercadoPago
    const payer = payment.payer || {}
    const additionalAddress = payment.additional_info?.payer?.address || {}

    // 6️⃣ La dirección DEFINITIVA será la que tú mandaste en metadata
    const finalAddress = metadata.address || additionalAddress

    // 7️⃣ Preparar datos de la orden
    const orderData = {
      payment_id: paymentId,
      payment_status: 'paid',
      payment_method: payment.payment_type_id,
      total: payment.transaction_amount,
      items: payment.additional_info?.items || [],
      email: metadata.checkoutEmail || payer.email,
      first_name: metadata.first_name || payer.first_name,
      last_name: metadata.last_name || payer.last_name,
      phone: metadata.phone || payer.phone?.number || null,
      address: finalAddress,
      user: metadata.userId || null,
      payment_detail: payment
    }

    console.log('🧾 Datos procesados para orden:')
    console.log(orderData)

    // 8️⃣ Guardar orden en Strapi
    const existing = await strapi.db.query('api::order.order').findOne({ where: { payment_id: paymentId }})
    if(existing) {
      await strapi.db.query('api::order.order').update({ where: { id: existing.id }, data: orderData})
    } else {
      await strapi.db.query('api::order.order').create({ data: orderData })
    }

    console.log('✅ Orden creada correctamente en Strapi')

  } catch (err) {
    console.error('❌ Error en processWebhook:', err)
  }
}
