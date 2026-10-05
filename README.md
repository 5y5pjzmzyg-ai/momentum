# Momentum

A mobile-first, installable work tracker with a restrained arcade feel. Plain HTML, CSS and JavaScript; no build step, dependencies, account, cloud sync, analytics or backend. A new installation starts empty. All task and activity names are user-created.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Use a web server, not a file:// URL: JavaScript modules, IndexedDB and service workers require a proper origin. For rule checks, install/use Node.js and run `node tests.mjs` (or `npm test`). No package installation is needed.

## Publish on GitHub Pages

1. Create a public GitHub repository for free Pages hosting.
2. Copy the **contents** of this `worklog` folder into the repository root, including `.nojekyll` (not an enclosing `worklog` folder). Commit and push to `main`.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main**, **/(root)** and **Save**.
4. Wait for GitHub's Pages deployment to complete and use the URL shown in Pages settings. Relative asset URLs and hash navigation work under a repository subpath.
5. Open that HTTPS URL in iPhone Safari, then **Share → Add to Home Screen**.

These steps follow [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). You can instead use a `/docs` folder and select it as the publishing source. No paid server is needed. Source repository: https://github.com/5y5pjzmzyg-ai/momentum.

For updates, replace the app files, change the cache version in `sw.js`, commit and push. Finish an active timer before applying an app update. Close all app windows and reopen to activate a waiting service worker. Ordinary reloads fetch the latest assets when online. A successful first load caches the app shell for offline use. Keep all files together; there is no remote font or other external asset.

## Using the app

- **Activities:** create Core, Important or Normal activities; set weekly minutes, weekly touches, daily minimum, target and credit cap. Edit or archive whenever needed. Delete permanently removes that activity's sessions, so back up first.
- **Today:** each Start asks what you are working on and offers previous descriptions for that activity. Pause, resume and finish a single count-up timer. Finish commits sessions and updates progress. The timer is saved immediately on start and pause/resume, with persisted timestamps rather than relying on background JavaScript.
- **Manual log:** use a duration and working-day date, or local start/end date-times. Start/end entries automatically split at working-day boundaries; their separate date field is ignored in this method. Edit and delete completed sessions in Review.
- **Recommendation:** an explicit, deterministic explanation of the next activity and useful duration. Activities at their daily credit cap are omitted. Focus suspends recommendations.
- **Focus:** enter it from Activities or Recommendation, choose a concrete task and work as long as needed. End Focus saves the current timer and resumes balancing. Finishing a timer alone keeps Focus enabled, allowing another session. A Focus period can cross midnight and rollover.
- **Settings:** configure finish and rollover, all-activity holiday periods, and JSON backups. Import validates first and asks before replacing all device data. Backup includes an active timer and Focus state.
- **Review:** current and past weekly actual/credited time, goal percentages, touches, spacing, priority totals, daily results, Focus periods, previous-week comparison, weekly/monthly trends and editable full session history.

## Storage and recovery

IndexedDB holds the version-1 state in one atomic transaction. UUIDs and created/updated timestamps provide a starting point for future sync, but v1 has no sync. The app requests persistent browser storage when starting work; the browser may decline. Closing the app, browser or restarting the device does not erase IndexedDB, but clearing website data, deleting the installed app, storage eviction or changing the site origin can. Safari and an installed home-screen app may also use distinct storage containers. Keep regular JSON exports. Export on the old origin and import on the new origin when moving hosts. An imported running timer continues from its saved timestamp, including elapsed time since export; finish or pause before backing up if that is unwanted.

Only one browser tab can write when the Web Locks API is available. A second tab shows an instruction to close the first. Browsers without Web Locks should use one app window. Storage failures are surfaced; do not close the app until you have exported any work that could not be saved.

## Rules and deliberate v1 choices

The pure functions in `js/rules.js` contain the business rules. `js/storage.js` owns persistence; `js/app.js` owns interface and user actions; UI selection options live in `js/appearance.js`; CSS theme tokens live in `style.css`.

### Duration and touches

`credited` caps the **sum** of actual minutes for each activity and working day. Every actual minute remains in session history. `touched` checks that daily sum against the activity minimum, so multiple short sessions can earn exactly one touch per day. Target completion is independent of credited weekly minutes.

### Working days and weeks

`dayKey`, `shift`, `week` and `splitSegments` use local calendar arithmetic. Rollover is 04:00 by default and finish is 22:30; both are editable. Monday at rollover begins a week. A timer crossing rollover is split using its active segments; paused time is excluded. Start/end entries follow the same rule. Day boundaries use local Date operations rather than adding 24 hours, which accounts for daylight-saving changes. Changing rollover affects future session assignments; saved working-day dates stay stable. When travelling, newly completed timer segments use the device's current timezone, so finish long timers before switching timezones.

`rolloverReports` runs on opening, day change and committed edits. It regenerates completed-week reports, including intervening empty weeks from the first activity onward. No scheduled background execution is required. Review also calculates the current week live. Future days show UPCOMING rather than failed days.

### Simple touch spacing

`spacing` uses `max(1, floor(7 / max(1, weeklyTouchGoal)))` available days as the interval. With 3 touches/week, it recommends a touch after 1 day, marks it due at 2 days, and overdue after that. No previous touch means recommended. The last valid touch is found across **all weeks**, so Monday cannot reset continuity. Holidays and days with completed Focus periods do not increase the gap. A single new valid touch resets the gap to zero; nothing accumulates or carries as touch debt. Gap values are capped by neither week nor debt, and are informational. Review's longest gap is the maximum available-day gap sampled on elapsed days in that week, including continuity from earlier weeks. Before the first touch it is zero/unknown. Change this one function to experiment with spacing.

### Expected today

`expectedToday` includes active Core activities every normal day. Important/Normal activities are included when they already have work today, their spacing needs attention and touches remain, their average remaining weekly minutes per available day reaches the minimum, or all remaining days are needed to reach the weekly touch goal. Weekly duration goals scale by nonholiday days / 7. Weekly touch goals are limited to the count of nonholiday days. There is no carryover of unmet weekly duration or touches into another week. All seven days are initially available; use holidays for excluded days. An activity is expected from its creation working day; archive preserves prior dates but exempts the archive date onward.

### Achievement ladder

`levels` enforces the ladder sequentially. Core minimum → Core plus Important minimum → Core target plus Important minimum → all expected minima while retaining Core target → all expected targets. This preserves progression and prevents losing CORE++ when reaching ALL. No Important activities means CORE+ can be achieved at the same time as CORE. Other empty priority groups can also make levels coincide. At least one expected Core activity is required to award the ladder, so Normal work cannot substitute for Core. Without Core, the dashboard asks you to add it. Only completed/saved sessions contribute to the dashboard; elapsed running time is visible separately until Finish.

### Recommendations

`recommend` ranks by priority tier, overdue/due/recommended spacing, minimum deficit, target deficit, usefulness to the next level, then remaining weekly goal fraction. Priority tiers are separated far enough that Normal cannot displace Core. Name breaks ties deterministically. Suggested minutes aim at the minimum or target while respecting the remaining daily cap. Once a daily target is complete, short additional work can still be recommended for weekly progress. The app does not claim to be AI.

### Finish and Salvage

`finishRemaining` locates the preferred finish within the working day, including finish times after midnight. `salvage` becomes prominent only when Core requirements remaining exceed both the available time before finish **and 45 minutes**. At 45 minutes or less from CORE it continues encouraging CORE. Salvage requires 45 actual minutes of Core and never equals CORE. Holidays and active Focus suppress the prompt.

### Focus and holidays

Active Focus suppresses daily balancing and normal recommendations. Actual time, normal touch qualification and daily credit caps remain unchanged. Completed Focus time proportionally reduces remaining daily minimum/target **scoring requirements** by its share of the rollover-to-finish window, using `focusAllowance`; it does not lower the normal touch minimum. Overlapping Focus intervals count once. Other activities' weekly duration goals receive the same proportional day exclusion; the focused activity's weekly goal stays intact. Touch spacing skips completed Focus days, a deliberately generous simple rule; no touch catchup debt is created. Weekly touch counts remain normal. A Focus day with no earned level is marked FOCUS / EXCUSED, while earned levels are retained. Reports list Focus periods separately. Multi-day Focus periods list their full elapsed wall time under each affected date; this is context, not additional work time—actual work totals count only saved sessions.

Holidays exclude daily scoring, pause spacing and proportionally reduce weekly duration goals. Voluntary work on a holiday is recorded and credited normally. Holiday periods currently apply to all activities.

### Historical edits and future refinement

Activity settings and holiday edits recalculate historical reports using the current settings; goal values are not frozen as immutable historical snapshots. Archives preserve previous inclusion, but reactivating removes the archive interval. Deletes intentionally remove history. These simple v1 choices are explicit so they can be refined after real use. There is no notification system, background nagging, automatic task completion detector, recurring schedule, cloud sync, or nested task manager.

## Validation

19 automated checks cover aggregate daily caps/touches, cross-week spacing and single-touch recovery, local/Monday rollover, catch-up report generation, strict priority levels, holiday scaling, feasibility-based salvage, serialized timer elapsed time, Focus suspension and allowances, changing goals, backup validation/round trip, timer boundary splitting, invalid dates/clocks and archived historical inclusion.

Browser checks at 390 × 844 covered creation, saved activity after reload, running timer after reload, pause/resume/finish, manual logging and level advancement, activity settings edits, Focus recommendation suppression and ending Focus, holiday exclusion, session editing with report recalculation, JSON export with file-content validation, and JSON restore. Physical iPhone installation, phone restart and offline operation were not physically tested; verify those on your device using this checklist:

1. Publish to HTTPS, load once, add to the home screen and create a temporary activity.
2. Start a timer, lock the phone, reopen, then restart the phone and confirm elapsed time.
3. Pause before closing and confirm paused time does not increase.
4. Finish; confirm the session survives closing/reopening.
5. Enable airplane mode and reopen after the first load; log and save work.
6. Export, save in Files, import and confirm session details.
7. Test your preferred rollover near a boundary and Monday reporting.

## Files

- `index.html`, `style.css`, `js/app.js`: interface.
- `js/rules.js`: isolated, testable rules.
- `js/storage.js`: IndexedDB adapter.
- `manifest.webmanifest`, icons, `sw.js`: installation/offline shell.
- `tests.mjs`: dependency-free rules checks.

## v1.1 dashboard and appearance update

Today now shows Weekly Core progress, counting each active Core activity up to its own adjusted weekly goal so overworking one cannot cover another. Achieved daily levels explicitly read “CORE achieved”, “CORE+ achieved”, etc. Active tiles sort Core → Important → Normal on Today and Activities; archived activities appear last. Daily activity bars end at target, with a minimum marker and a separate text label for the credit cap. Additional time remains recorded normally. The calmer slate theme uses selected activity colours for tile accents and progress bars. Create/Edit offers 24 named emoji choices and 20 named colour swatches, plus None for either. Existing custom icons/colours remain selectable when editing.

Mobile UI verification covered priority ordering, bar endpoints, picker selection, saved appearance after reload, no-icon/no-colour options, weekly Core display, and achieved-level wording.

## v1.2 appearance update

The app now uses a light theme with white activity cards and soft blue progress surfaces, preserving activity-coloured top borders. The daily card label reads “Weekly target”; its numerator still uses daily-capped credited minutes. Browser/PWA theme colours match the light appearance.
