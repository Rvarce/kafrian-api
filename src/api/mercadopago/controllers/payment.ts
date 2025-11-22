import { processWebhook } from '../services/payment.js'
import axios from 'axios'

export default {
  async webhook(ctx) {
    const payload = ctx.request.body

    // Log inicial para debugging
    console.log('📩 Mercado Pago Webhook recibido:', JSON.stringify(payload, null, 2))

    // Respuesta inmediata (requisito MP)
    ctx.response.status = 200
    ctx.body = 'OK'

    // Procesar asincrónicamente
    try {
      // Verifica si es un evento de pago
      if (
        payload?.type !== 'payment' ||
        !payload?.data?.id
      ) {
        console.log('⚠️ Webhook no corresponde a payment, ignorado.')
        return
      }

      const paymentId = payload.data.id

      // Pedimos la info completa del pago a Mercado Pago
      const paymentDetail = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      )

      const payment = paymentDetail.data

      console.log('💳 Detalle del pago obtenido:', paymentId)

      // Extraemos metadata
      const metadata = payment.metadata || {}

      console.log('📦 Metadata recibida:', metadata)

      // Enviar a tu servicio de negocio
      await processWebhook({
        paymentId,
        status: payment.status,
        statusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        payerEmail: payment.payer?.email,
        metadata
      })

    } catch (err) {
      console.error('❌ Error procesando webhook:', err)
    }
  }
}
