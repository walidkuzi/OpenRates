import { defineConfig } from "vitepress";

export default defineConfig({
  title: "OpenRates",
  description:
    "Currency intelligence gateway for AI agents. Current, historical, and provider-specific exchange rates with freshness, confidence, and source attribution.",
  srcDir: "../../docs",
  outDir: "dist",

  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    siteTitle: "OpenRates",
    nav: [
      { text: "Quickstart", link: "/quickstart" },
      { text: "MCP", link: "/mcp" },
      { text: "REST API", link: "/rest-api" },
      { text: "Providers", link: "/providers" },
    ],

    sidebar: [
      {
        text: "Getting started",
        items: [
          { text: "Quickstart", link: "/quickstart" },
          { text: "MCP server", link: "/mcp" },
          { text: "REST API", link: "/rest-api" },
          { text: "Self-hosting", link: "/self-hosting" },
        ],
      },
      {
        text: "Concepts",
        items: [
          { text: "Rate types", link: "/rate-types" },
          { text: "Freshness", link: "/freshness" },
          { text: "Precision and rounding", link: "/precision-and-rounding" },
          { text: "Providers", link: "/providers" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Security", link: "/security" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Adding a provider", link: "/adding-a-provider" },
          { text: "Architecture", link: "/architecture" },
          { text: "CLI", link: "/cli" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/openrates/openrates-agent" },
    ],

    footer: {
      message: "Released under the Apache-2.0 license.",
      copyright: "OpenRates Agent Gateway",
    },

    editLink: {
      pattern:
        "https://github.com/openrates/openrates-agent/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
