// Throwaway HTTP server for the render-fidelity spike (issue #2).
// Receives a base64-encoded PDF POSTed from the Expo Go app running on the
// physical phone (reached via `adb reverse tcp:9099 tcp:9099`) and writes it
// to spike/device-output.pdf so it can be diffed against browser-output.pdf.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 9099;
const OUT_PATH = path.join(__dirname, "device-output.pdf");

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/upload") {
    res.writeHead(404);
    res.end("not found");
    return;
  }

  let chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    try {
      const body = Buffer.concat(chunks).toString("utf8");
      let base64;
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        const parsed = JSON.parse(body);
        base64 = parsed.base64;
      } else {
        base64 = body;
      }
      if (!base64) {
        throw new Error("no base64 field in body");
      }
      const buf = Buffer.from(base64, "base64");
      fs.writeFileSync(OUT_PATH, buf);
      console.log(
        `[receive-pdf] wrote ${buf.length} bytes to ${OUT_PATH} at ${new Date().toISOString()}`
      );
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    } catch (err) {
      console.error("[receive-pdf] error:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("error: " + err.message);
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[receive-pdf] listening on http://127.0.0.1:${PORT}/upload`);
});
