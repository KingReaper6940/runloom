# Runloom

[Open runloom](https://runloom-bice.vercel.app)

**A little more room to run.**

A local run-of-show planner for workshops, meetups, and small events. Build a running order, assign an owner and cue to each segment, and see whether the program fits its hard stop. Test an overrun without rewriting your original durations.

## Features

- **Cascading timing:** change a duration or reorder a segment and every downstream start updates.
- **Reversible overrun scenarios:** add up to 120 minutes to one segment; see both baseline and projected times.
- **Hard-stop budget:** see spare minutes or an explicit overrun, plus total runtime and planned breaks.
- **Crew handoff:** keep owners and cue notes beside each segment; missing owners are flagged.
- **Local project files:** save JSON and reopen it later. No account, upload, or cloud storage.
- **Portable exports:** inspect CSV or JSON before downloading; print a crew sheet through your browser.
- **CLI deadline checks:** use the same scheduling engine from Node with meaningful exit codes.

## Quick start

Node.js 20 or newer is required. There are no dependencies to install.

```sh
git clone https://github.com/KingReaper6940/runloom.git
cd runloom
npm run dev
```

Open **http://127.0.0.1:4181**. The included fictional workshop is ready to edit.

1. Set your event name, start time, and hard stop.
2. Add segments with durations, owners, and cue notes. Use **Move up / Move down** to reorder them.
3. Choose a segment under **What if a segment runs long?** and enter extra minutes.
4. Review the changed times and hard-stop budget. **Reset overrun** restores the baseline projection.
5. **Save project** to keep your work. **Open project** restores that downloaded JSON later.

**Work is not saved automatically.** Reloading the page starts the example again. Loading an example or creating a new rundown replaces the current in-memory workspace; it does not change any downloaded file. Save your project first if you want to retain edits.

### Try a scenario

The example starts at **09:00**, runs for **110 minutes**, and finishes at **10:50**, with a hard stop of **11:00**. Adding **15 minutes** to *Build something small* changes its end from **09:55** to **10:10**, pushes every later segment back, and finishes at **11:05**: **5 minutes over**.

Planned durations stay unchanged. Breaks are never shortened automatically. Removing the selected overrun segment clears the scenario.

## Files and exports

| Format | Purpose |
| --- | --- |
| Project JSON | Reopen the event, segment order, notes, and current scenario |
| Timing CSV | Share baseline/projected start and end times, planned/added minutes, owner, and cue |
| Print crew sheet | Browser print layout with event title, scenario label, timing budget, owners, and notes |

**Inspect export** shows the exact CSV/JSON content before download. CSV fields are quoted, embedded quotes are escaped, and formula-like user fields are prefixed with an apostrophe. Spreadsheet import behavior varies; review the result before sharing. Exported files include the event's names and notes and are not encrypted.

The print button uses the browser's native print dialog. Choose **Save as PDF** if your browser offers it. CSS hides editors and controls in print and keeps timing rows together where the printer allows; this is not a dedicated PDF generator.

See the included [baseline project](examples/workshop.json), [overrun project](examples/overrun.json), and [overrun CSV](examples/overrun.csv). Regenerate these fictional examples with `node scripts/examples.mjs`.

## Command line

```sh
node scripts/check.mjs examples/workshop.json
node scripts/check.mjs examples/overrun.json
node scripts/check.mjs examples/overrun.json --csv > timing.csv
```

The default output is a JSON timing report. The sample overrun intentionally exits with code `1` and reports a projected finish of `11:05` against an `11:00` hard stop.

| Exit code | Meaning |
| --- | --- |
| `0` | Valid project, projected finish at or before the hard stop |
| `1` | Valid project, projected finish after the hard stop |
| `2` | Invalid arguments, unreadable project, invalid schema, or size limit |

Missing owners are informational and do not change the CLI exit code. The CLI does not watch files or operate a live event.

## Timing rules and limits

- One sequential track; no parallel rooms, fixed intermediate anchors, or live timers.
- Minute precision and 24-hour **local wall-clock** times. No dates, timezone conversion, or daylight-saving adjustments.
- If the hard stop is earlier than the start, it means the following day. Equal start/stop is rejected instead of assuming a 24-hour window.
- Times after midnight show a day offset, for example `01:20 (+1d)`.
- From **1 to 60 segments**; each duration is a whole number from **1 to 240 minutes**. Total planned duration cannot exceed **1,440 minutes**.
- One selected overrun of **0 to 120 minutes**. It adds time; it never cuts breaks or redistributes durations.
- Event and segment names: 80 characters; owner: 60; cue: 240. Project JSON: at most 100,000 JavaScript string characters, with an additional approximately 400 KB file-read cap.
- Project files require version 1, unique segment IDs, valid segment types, and complete scenario fields. Unknown metadata is discarded on import/export.

Invalid edits hide timing and disable export/print until corrected. An invalid imported file leaves the existing workspace intact. Do not treat spare minutes as a guarantee that a real event will finish on time.

## Privacy and architecture

Runloom is static HTML/CSS and native JavaScript modules. The browser makes no data requests after loading its static assets; Content Security Policy blocks connections. There are no analytics, cookies, storage APIs, or backend. Event details remain in page memory and the files you choose to download. Your browser, extensions, operating system, and any deployment host remain outside the app's control.

`src/core.mjs` validates projects and computes both timelines. `src/files.mjs` handles normalized JSON and CSV. The browser and CLI share these modules. Imported text is rendered through DOM text/value properties, not inserted as HTML.

## Test and build

```sh
npm test
npm run build
```

The 15 tests cover baseline and scenario calculations, midnight rollover, validation, input bounds, immutability, JSON round trips, CSV quoting/formula prefixes, fixtures, and CLI exits/errors. GitHub Actions runs tests and static builds on Node 20/22 on Windows/Linux. The build checks module syntax and emits the site to `dist/`.

Browser interactions checked the sample, overrun shift, reorder behavior, selected-segment removal, overnight timing, invalid duration handling, and export previews. DOM width checks at 390px and 1280px found no page-level horizontal overflow. Native file chooser/download flows and printer/PDF output have not been verified end-to-end. Screenshot capture was unavailable during verification; no mockup is presented as an application screenshot.

## Manual Vercel deployment

Import the repository in your Vercel dashboard with:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Root directory | `./` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | Empty; no dependencies |

These build/output settings are included in `vercel.json`. No environment variables, database, server functions, or paid APIs are needed. Other static hosts work if they serve `.mjs` files as JavaScript.

## Related approaches

[LiveFocus's run-of-show guide](https://livefocus.net/guides/event-run-of-show-template) describes operational cues and transition planning. [Runsheet's template guide](https://runsheet.show/guides/free-run-of-show-template) explains explicit buffer rows and hard stops. Runloom keeps this workflow in a bounded local planner; it does not provide their production services or hosted collaboration features.

MIT licensed. See [LICENSE](LICENSE).
