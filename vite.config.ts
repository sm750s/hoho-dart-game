import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "SITE_");
  const configuredUrl = process.env.SITE_URL || env.SITE_URL;
  if (command === "build" && !configuredUrl) {
    console.warn("공개 SITE_URL이 없어 공유 메타 주소에 localhost를 사용합니다. 공개 배포 전에 SITE_URL을 설정하세요.");
  }
  return {
    plugins: [react(), {
      name: "sharing-metadata",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          const site = new URL(configuredUrl || context.server?.resolvedUrls?.network[0] || "http://localhost:6173/");
          if (!["http:", "https:"].includes(site.protocol) || site.username || site.password || site.search || site.hash) {
            throw new Error("SITE_URL은 사용자 정보·쿼리·해시가 없는 http(s) 서비스 주소여야 합니다.");
          }
          if (!site.pathname.endsWith("/")) site.pathname += "/";
          const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
          return html.replaceAll("__SITE_URL__", escape(site.href))
            .replaceAll("__OG_IMAGE_URL__", escape(new URL("og-cover.png", site).href));
        },
      },
    }],
    base: "./",
    server: {
      host: "0.0.0.0",
      port: 6173,
    },
    preview: {
      host: "0.0.0.0",
    },
  };
});
