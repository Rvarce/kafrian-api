// ✅ src/api/user-profile/routes/user-profile.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/register',
      handler: 'api::user-profile.user-profile.register',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'api::user-profile.user-profile.login',
      config: {
        auth: false,
      },
    },
  ],
}
