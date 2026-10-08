const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite en web carga wa-sqlite como .wasm
config.resolver.assetExts.push("wasm");

// expo-sqlite en web necesita SharedArrayBuffer, que el navegador solo habilita
// si el documento HTML llega con COOP/COEP. Desde SDK 57 el index.html lo sirve
// un middleware de Expo que corre antes que `server.enhanceMiddleware`, así que
// los headers se aplican a nivel de respuesta HTTP del servidor de desarrollo.
const CROSS_ORIGIN_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};
const originalWriteHead = http.ServerResponse.prototype.writeHead;
if (!originalWriteHead.__postrapiCrossOrigin) {
  http.ServerResponse.prototype.writeHead = function (...args) {
    if (!this.headersSent) {
      for (const [key, value] of Object.entries(CROSS_ORIGIN_HEADERS)) {
        if (!this.hasHeader(key)) this.setHeader(key, value);
      }
    }
    return originalWriteHead.apply(this, args);
  };
  http.ServerResponse.prototype.writeHead.__postrapiCrossOrigin = true;
}

module.exports = withNativeWind(config, { input: "./global.css" });
