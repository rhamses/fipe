// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-icon"],
  app: {
    head: {
      title: "Tabela FIPE - API e Análise de Dados",
      link: [
        {
          rel: "apple-touch-icon",
          sizes: "57x57",
          href: "favicon/apple-icon-57x57.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "60x60",
          href: "favicon/apple-icon-60x60.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "72x72",
          href: "favicon/apple-icon-72x72.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "76x76",
          href: "favicon/apple-icon-76x76.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "114x114",
          href: "favicon/apple-icon-114x114.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "120x120",
          href: "favicon/apple-icon-120x120.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "144x144",
          href: "favicon/apple-icon-144x144.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "152x152",
          href: "favicon/apple-icon-152x152.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "favicon/apple-icon-180x180.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "192x192",
          href: "favicon/android-icon-192x192.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "favicon/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "96x96",
          href: "favicon/favicon-96x96.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "favicon/favicon-16x16.png",
        },
      ],
      meta: [
        {
          name: "msapplication-TileColor",
          content: "#ffffff",
        },
        {
          name: "msapplication-TileImage",
          content: "/ms-icon-144x144.png",
        },
        {
          name: "theme-color",
          content: "#ffffff",
        },
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
