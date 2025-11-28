import { MercadoPagoConfig, Payment } from 'mercadopago'
import { buildOrderReceivedEmail, buildAdminOrderNotificationEmail } from '../../utils/buildOrderReceivedEmail'

// declare const strapi: any  // si TS se queja

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

const paymentClient = new Payment(mp)

export async function processWebhook(payload: any) {
  try {
    // 1️⃣ Validar tipo de evento
    if (payload?.type !== 'payment' || !payload?.data?.id) {
      console.log('⚠️ Evento ignorado, no es payment o falta data.id:', payload?.type)
      return
    }

    const paymentId = payload.data.id
    console.log('🔍 Consultando pago MercadoPago:', paymentId)

    // 2️⃣ Obtener información real del pago
    const payment = await paymentClient.get({ id: paymentId })

    console.log('💳 Estado del pago:', payment.status)

    if (payment.status !== 'approved') {
      console.log('⏳ Pago no aprobado todavía, status:', payment.status)
      return
    }

    // 3️⃣ Metadata enviada desde tu backend al crear la preferencia
    const metadata = payment.metadata || {}

    // 4️⃣ Items devueltos por Mercado Pago
    const additionalItems = payment.additional_info?.items || []

    // Separar productos vs ítem "Envío"
    const shippingItem = additionalItems.find(
      (it: any) => it.title === 'Envío'
    )
    const productItems = additionalItems.filter(
      (it: any) => it.title !== 'Envío'
    )

    // 5️⃣ Calcular shippingPrice de forma robusta
    const shippingPrice =
      metadata.shippingPrice ??
      (shippingItem ? Number(shippingItem.unit_price) : 0)

    const shippingZone = metadata.shippingZone || null
    const shippingBreakdown = metadata.shippingBreakdown || null
    const providersCount =
      metadata.providersCount || metadata.provider_count || null

    // 6️⃣ Datos del pagador
    const payer = payment.payer || {}
    const additionalAddress = payment.additional_info?.payer?.address || {}

    // 7️⃣ Dirección final: prioridad para la que tú enviaste en metadata
    const finalAddress = metadata.address || additionalAddress

    // 8️⃣ Armar data de la orden mapeada al modelo
    const orderData = {
      payment_id: paymentId,
      payment_status: 'paid',
      payment_method: payment.payment_type_id,
      total: payment.transaction_amount,       // productos + envío
      items: productItems,                     // SOLO productos
      shipping_price: shippingPrice,
      shipping_zone: shippingZone,
      shipping_breakdown: shippingBreakdown,
      providers_count: providersCount,

      email: metadata.checkoutEmail || payer.email,
      first_name: metadata.first_name || payer.first_name,
      last_name: metadata.last_name || payer.last_name,
      phone: metadata.phone || payer.phone?.number || null,
      address: finalAddress,
      user: metadata.userId || null,
      date_created: payment.date_approved || null,
      date_approved: payment.date_created || null,
      payment_detail: payment,                 // JSON completo de MP
    }

    console.log('🧾 Datos procesados para orden:')
    console.log(orderData)

    // 9️⃣ Crear / actualizar orden en Strapi
    const existing = await strapi.db
      .query('api::order.order')
      .findOne({ where: { payment_id: paymentId } })

    if (existing) {
      await strapi.db
        .query('api::order.order')
        .update({ where: { id: existing.id }, data: orderData })
    } else {
      await strapi.db
        .query('api::order.order')
        .create({ data: orderData })
    }

    const htmlClient = buildOrderReceivedEmail(orderData)
    await strapi.plugin('email').service('email').send({
      to: orderData.email,
      subject: 'KafriaN: ¡Tu compra ha sido recepcionada!',
      html: htmlClient,
    })

    console.log('✅ Orden creada/actualizada correctamente en Strapi')
  } catch (err) {
    console.error('❌ Error en processWebhook:', err)
  }
}
