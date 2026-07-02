/**
 * proxy-server.js
 * Servidor proxy que envuelve Metro con headers COOP/COEP.
 * Necesario para que SharedArrayBuffer funcione en el browser
 * (requerido por expo-sqlite WASM worker en web).
 *
 * Uso: node proxy-server.js
 * Metro corre en :8081, el proxy en :8082
 */
const http = require("http");
const httpProxy = require("http-proxy");

const METRO_PORT = 8081;
const PROXY_PORT = 8082;

const proxy = httpProxy.createProxyServer({
  target: `http://localhost:${METRO_PORT}`,
  ws: true,
  changeOrigin: false,
});

proxy.on("proxyRes", (proxyRes) => {
  proxyRes.headers["Cross-Origin-Opener-Policy"] = "same-origin";
  proxyRes.headers["Cross-Origin-Embedder-Policy"] = "require-corp";
  proxyRes.headers["Cross-Origin-Resource-Policy"] = "cross-origin";
});

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PROXY_PORT, () => {
  console.log(
    `✅ Proxy COOP/COEP corriendo en http://localhost:${PROXY_PORT}`
  );
  console.log(
    `   (requiere Metro corriendo en http://localhost:${METRO_PORT})`
  );
});
