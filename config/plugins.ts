// config/plugins.ts
export default () => ({
  'users-permissions': {
    config: {
      register: {
        // aquí pones los campos extra que quieres permitir en el body
        allowedFields: ['firstName', 'lastName', 'address'],
      },
    },
  },
})
