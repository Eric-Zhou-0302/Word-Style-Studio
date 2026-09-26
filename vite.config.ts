import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_SITE_URL');
  const configuredUrl = env.VITE_SITE_URL?.trim() || 'https://docxstyle.com';
  const url = new URL(configuredUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('站点地址须为完整的 HTTP(S) 域名，不含路径、查询参数或凭据。请检查 VITE_SITE_URL。');
  }
  const siteUrl = url.href;

  return {
    plugins: [react(), {
      name: 'social-sharing-metadata',
      // 在 HTML 中直接写入完整地址，让不执行 JavaScript 的分享爬虫也能读取。
      transformIndexHtml(html) {
        const imageUrl = new URL('/images/og-image.png', siteUrl).href;
        return {
          html: html.replaceAll('content="/images/og-image.png"', `content="${imageUrl}"`),
          tags: [
            { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:url', content: siteUrl }, injectTo: 'head' },
          ],
        };
      },
    }],
    server: { port: 5173, strictPort: true },
  };
});
