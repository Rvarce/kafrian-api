export default ({ env }) => ({
  'users-permissions': {
    config: {
      register: {
        allowedFields: ['firstName', 'lastName', 'address'],
      },
    },
  },

  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: env('RESEND_API_KEY'),
        },
      },
      settings: {
        defaultFrom: 'no-reply@kafrian.cl',
        defaultReplyTo: 'no-reply@kafrian.cl',
      },
    },
  },
})
