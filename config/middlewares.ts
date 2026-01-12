export default ({ env }) => {
  const frontendUrl = env('FRONTEND_URL', 'http://localhost:3000')

  return [
    {
      name: 'global::cache',
      config: { ttl: 3600 },
    },

    'strapi::logger',
    'strapi::errors',

    // 👇 CORS aquí y sin "enabled"
    {
      name: 'strapi::cors',
      config: {
        origin: [frontendUrl],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        headers: [
          'Content-Type',
          'Authorization',
          'Origin',
          'Accept',
        ],
        credentials: true,
        keepHeadersOnError: true,
      },
    },

    'strapi::security',

    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ]
}
