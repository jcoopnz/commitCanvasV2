import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, normalize } from "node:path"

const PORT = process.env.PORT ?? 3000
const TYPES = { ".html": "text/html", ".js": "text/javascript" }

// Serves only index.html and the scripts in src/
createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost")
  const file = pathname === "/" ? "index.html" : normalize(pathname).slice(1)

  try {
    if (file !== "index.html" && !file.startsWith("src/")) throw new Error("not served")
    const body = await readFile(file)
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" })
    res.end(body)
  } catch {
    res.writeHead(404).end("Not found")
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`))
