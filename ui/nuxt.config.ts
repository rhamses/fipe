// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-icon"],
  app: {
    head: {
      title: "Tabela FIPE - API e Análise de Dados",
      meta: [
        {
          name: "description",
          content:
            "Valores atualizados e acesso ao histórico de preços até 2001",
        },
        {
          name: "viewport",
          content: "width=device-width, user-scalable=no",
        },
        {
          property: "og:url",
          content: "https://fipe.netlify.app",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:title",
          content: "Tabela FIPE - API e Análise de Dados",
        },
        {
          property: "og:description",
          content:
            "Valores atualizados e acesso ao histórico de preços até 2001",
        },
        {
          property: "og:image",
          content: "https://fipe.netlify.app/opengraph.png",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          property: "twitter:domain",
          content: "fipe.netlify.app",
        },
        {
          property: "twitter:url",
          content: "https://fipe.netlify.app",
        },
        {
          name: "twitter:title",
          content: "Tabela FIPE - API e Análise de Dados",
        },
        {
          name: "twitter:description",
          content:
            "Valores atualizados e acesso ao histórico de preços até 2001",
        },
        {
          name: "twitter:image",
          content: "https://fipe.netlify.app/opengraph.png",
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
