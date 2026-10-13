// @ts-check

// Builds a real git repository (loose objects) in memory, using only browser APIs.

/** @typedef {Uint8Array<ArrayBuffer>} Bytes */
/** @typedef {{ path: string, data: Bytes }} RepoFile */

const encoder = new TextEncoder()

/** @param {...Bytes} parts */
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** @param {Bytes} bytes */
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

/** @param {Bytes} data */
async function deflate(data) {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * A git object is "<type> <size>\0<body>", hashed with SHA-1 and zlib-compressed.
 * @param {string} type
 * @param {Bytes} body
 */
async function gitObject(type, body) {
  const raw = concat(encoder.encode(`${type} ${body.length}\0`), body)
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", raw))
  const id = hex(hash)
  const file = { path: `.git/objects/${id.slice(0, 2)}/${id.slice(2)}`, data: await deflate(raw) }
  return { id, hash, file }
}

const README = `# My commitCanvasV2 art

Made with commitCanvasV2. Push this repository to GitHub to show the art on your contribution graph.
`

/**
 * One README, one tree, and a chain of commits (one per timestamp) all sharing that tree.
 * @param {string} name
 * @param {string} email
 * @param {number[]} times unix seconds
 * @returns {Promise<RepoFile[]>}
 */
export async function buildRepo(name, email, times) {
  const blob = await gitObject("blob", encoder.encode(README))
  const tree = await gitObject("tree", concat(encoder.encode("100644 README.md\0"), blob.hash))
  const objects = [blob, tree]

  /** @type {string | null} */
  let parent = null
  for (const time of times) {
    const who = `${name} <${email}> ${time} +0000`
    const lines = [`tree ${tree.id}`, ...(parent ? [`parent ${parent}`] : []), `author ${who}`, `committer ${who}`]
    const commit = await gitObject("commit", encoder.encode(`${lines.join("\n")}\n\nBrush stroke!\n`))
    objects.push(commit)
    parent = commit.id
  }

  /** @type {(path: string, content: string) => RepoFile} */
  const text = (path, content) => ({ path, data: encoder.encode(content) })
  return [
    text("README.md", README),
    text(".git/HEAD", "ref: refs/heads/main\n"),
    text(".git/config", "[core]\n\trepositoryformatversion = 0\n\tbare = false\n"),
    ...(parent ? [text(".git/refs/heads/main", `${parent}\n`)] : []),
    ...objects.map((o) => o.file),
  ]
}
