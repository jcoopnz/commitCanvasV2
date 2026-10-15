// @ts-check

// GitHub's contribution graph: columns are weeks starting Sunday, rows are days.
// A calendar year spans up to 53 columns.
export const WEEKS = 53
export const DAYS = 7

/** Art levels 0-4 mapped to commits per day. GitHub shades each day relative to your
 *  busiest day of the year (roughly in quarters), so these sit mid-band and are high
 *  enough to dominate most existing activity. Raise them if your real days are busier. */
export const COMMITS_PER_LEVEL = [0, 12, 37, 62, 100]

/** @typedef {number[][]} Grid grid[week][day] = level */

const DAY_MS = 86_400_000

/** @returns {Grid} */
export const emptyGrid = () => Array.from({ length: WEEKS }, () => Array(DAYS).fill(0))

/**
 * The date shown at a cell for the given year, or null if it falls outside that year.
 * @param {number} year
 * @param {number} week
 * @param {number} day
 */
export function cellDate(year, week, day) {
  const jan1 = Date.UTC(year, 0, 1)
  const firstSunday = jan1 - new Date(jan1).getUTCDay() * DAY_MS
  const date = new Date(firstSunday + (week * 7 + day) * DAY_MS)
  return date.getUTCFullYear() === year ? date : null
}

/**
 * Chronological commit timestamps (unix seconds, noon UTC to dodge timezone edges).
 * @param {Grid} grid
 * @param {number} year
 */
export function commitTimes(grid, year) {
  /** @type {number[]} */
  const times = []
  grid.forEach((days, week) =>
    days.forEach((level, day) => {
      const date = cellDate(year, week, day)
      if (!date) return
      const noon = date.getTime() / 1000 + 12 * 3600
      for (let i = 0; i < COMMITS_PER_LEVEL[level]; i++) times.push(noon + i)
    }),
  )
  return times
}
