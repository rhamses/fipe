// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-icon"],
  app: {
    head: {
      title: "Tabela FIPE - Histórico e API Amb1.io",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, user-scalable=no",
        },
      ],
    },
  },
  nitro: {
    future: {
      nativeSWR: true,
    },
  },
});
