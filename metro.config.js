const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ─── Soporte para archivos .wasm (necesario para expo-sqlite web) ─────────────
config.resolver.assetExts = config.resolver.assetExts || [];
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// ─── Headers COOP/COEP para habilitar SharedArrayBuffer en el browser ─────────
// expo-sqlite/web usa SharedArrayBuffer vía Web Workers con WASM
const originalServerMiddleware = config.server?.enhanceMiddleware;
config.server = config.server || {};
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const enhanced = originalServerMiddleware
    ? originalServerMiddleware(metroMiddleware, server)
    : metroMiddleware;
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    enhanced(req, res, next);
  };
};

module.exports = withNativeWind(config, { input: "./global.css" });
