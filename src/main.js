// @ts-check
import { cellDate, commitTimes, emptyGrid, DAYS, WEEKS } from "./graph.js"
import { buildRepo } from "./git.js"
import { zip } from "./zip.js"

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
const $ = (id) => /** @type {T} */ (document.getElementById(id))

const graphEl = $("graph")
const yearEl = /** @type {HTMLSelectElement} */ ($("year"))
const nameEl = /** @type {HTMLInputElement} */ ($("name"))
const emailEl = /** @type {HTMLInputElement} */ ($("email"))
const statusEl = $("status")
const commandsEl = $("commands")
const nextStepsEl = $("next-steps")
const noticeEl = $("notice")
const dismissNoticeEl = $("dismiss-notice")

try {
  if (localStorage.getItem("notice-dismissed") === "true") {
    noticeEl?.remove()
  }
} catch {}

dismissNoticeEl?.addEventListener("click", () => {
  noticeEl?.remove()
  try {
    localStorage.setItem("notice-dismissed", "true")
  } catch {}
})

const grid = emptyGrid()
let level = 4

// ---- Controls ----
const thisYear = new Date().getFullYear()
for (let y = thisYear; y >= 2008; y--) yearEl.add(new Option(String(y)))

document.querySelectorAll("input[name=level]").forEach((input) =>
  input.addEventListener("change", () => (level = Number(/** @type {HTMLInputElement} */ (input).value))),
)
yearEl.addEventListener("change", render)

const CONFIRM_MS = 3000

/**
 * The first click asks "<label>?" (with a countdown bar); a second click within
 * CONFIRM_MS runs the action.
 * @param {HTMLElement} button
 * @param {() => void} action
 */
function twoClick(button, action) {
  const label = button.textContent
  /** @type {number | undefined} */
  let timer
  button.style.setProperty("--confirm-ms", `${CONFIRM_MS}ms`)

  button.addEventListener("click", () => {
    if (timer === undefined) {
      button.textContent = `${label}?`
      button.classList.add("pending")
      timer = setTimeout(reset, CONFIRM_MS)
    } else {
      reset()
      action()
    }
  })

  function reset() {
    clearTimeout(timer)
    timer = undefined
    button.textContent = label
    button.classList.remove("pending")
  }
}

twoClick($("clear"), () => {
  grid.forEach((days) => days.fill(0))
  render()
})
twoClick($("fill"), () => {
  const year = Number(yearEl.value)
  grid.forEach((days, week) =>
    days.forEach((_, day) => {
      if (cellDate(year, week, day)) days[day] = level
    }),
  )
  render()
})

// ---- Graph ----
function render() {
  statusEl.textContent = "" // the art changed, so any commit count shown is stale
  const year = Number(yearEl.value)
  graphEl.replaceChildren(
    ...Array.from({ length: WEEKS * DAYS }, (_, i) => {
      const week = Math.floor(i / DAYS)
      const day = i % DAYS
      const date = cellDate(year, week, day)
      const cell = document.createElement("div")
      cell.className = "cell"
      cell.dataset.week = String(week)
      cell.dataset.day = String(day)
      if (date) {
        cell.dataset.level = String(grid[week][day])
        cell.title = date.toUTCString().slice(0, 16)
      } else {
        cell.classList.add("outside")
      }
      return cell
    }),
  )
}

/**
 * @param {number} x
 * @param {number} y
 */
function paint(x, y) {
  const cell = /** @type {HTMLElement | null} */ (document.elementFromPoint(x, y))
  if (!cell?.classList.contains("cell") || cell.classList.contains("outside")) return
  statusEl.textContent = ""
  grid[Number(cell.dataset.week)][Number(cell.dataset.day)] = level
  cell.dataset.level = String(level)
}

graphEl.addEventListener("pointerdown", (e) => paint(e.clientX, e.clientY))
graphEl.addEventListener("pointermove", (e) => e.buttons === 1 && paint(e.clientX, e.clientY))

// ---- Output ----
const FOLDER = "commit-canvas-art"

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function download(blob, filename) {
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

$("generate").addEventListener("click", async () => {
  // Native validation: shows the browser's own message for a missing or malformed email
  if (!nameEl.reportValidity() || !emailEl.reportValidity()) return

  const name = nameEl.value.trim()
  const email = emailEl.value.trim()
  const times = commitTimes(grid, Number(yearEl.value))

  if (!times.length) return (statusEl.textContent = "Draw something first.")

  statusEl.textContent = `Generating ${times.length} commits...`
  const files = await buildRepo(name, email, times)
  download(zip(files.map((file) => ({ ...file, path: `${FOLDER}/${file.path}` }))), `${FOLDER}.zip`)
  statusEl.textContent = `Downloaded ${FOLDER}.zip (equiv. ${times.length} commits). Push it to a new GitHub repo, steps below.`
  commandsEl.textContent = [
    `cd ${FOLDER}`,
    "git remote add origin https://github.com/<you>/<repo>.git",
    "git push -u origin main",
  ].join("\n")
  nextStepsEl.hidden = false
})

render()
