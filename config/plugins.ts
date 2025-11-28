// config/plugins.ts
export default ({ env }) => ({
  'users-permissions': {
    config: {
      register: {
        // aquí pones los campos extra que quieres permitir en el body
        allowedFields: ['firstName', 'lastName', 'address'],
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: env.int('SMTP_PORT', 587),
        secure: false, // TLS sobre 587 (STARTTLS)
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLY'),
      },
    },
  },
})
