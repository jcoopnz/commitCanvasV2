# commitCanvasV2

Draw in a mock GitHub contribution graph, pick a year, and get a git repository that paints your art on your real graph. Everything runs in the browser — no server.

## Run

```sh
npm ci # (or `npm install` to install latest patches)
npm start   # serves at http://localhost:3000 (set PORT to change)
```

No install or build step: it is plain JavaScript (typed with JSDoc and `// @ts-check`) running directly in the browser, served via `serve`.
## Use

1. Pick a year and draw. Columns are weeks starting Sunday, matching GitHub.
2. Enter the name and email **of your GitHub account** (the email must be on your account, or the commits won't count).
3. Click **Generate repository** and unzip the download (the `.git` folder is hidden in Finder; press Cmd+Shift+. to see it).
4. In the unzipped folder:

```sh
git reset            # sync the index with the generated commits
git remote add origin https://github.com/<you>/<new-repo>.git
git push -u origin main
```

## Notes

- Each brush level creates a set number of commits per day (0 / 12 / 37 / 62 / 100, see `COMMITS_PER_LEVEL` in `src/graph.js`). GitHub shades each day relative to your busiest day that year, so the counts are high to outweigh existing activity. If your real days are busier than ~100 commits, raise them. A full dark year is ~36,000 commits (about a 12 MB zip).
- Layout: `src/graph.js` (grid and dates), `src/git.js` (builds git objects with SHA-1 + zlib from browser APIs), `src/main.js` (UI).
