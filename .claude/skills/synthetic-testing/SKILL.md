---
name: synthetic-testing
description: How Wikimedia runs synthetic web performance tests with sitespeed.io, Browsertime and WebPageReplay from this repository. Use when you add or change a tested page, user journey or configuration, bump the sitespeed.io version, run a one-off test, read results and alerts or debug the test servers.
---

# Synthetic testing at Wikimedia

This repository holds the pages, user journeys and configuration for the synthetic performance tests of Wikipedia. The Test Platform team owns the servers and this repository. Other teams add their own tests. Background: <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing>. General advice on setting up stable synthetic tests (servers, CPU tuning, connectivity, number of runs): <https://www.sitespeed.io/documentation/sitespeed.io/web-performance-testing-in-practice/>.

## Testing principles

Follow these when you add or change tests, and push back on suggestions that break them:

- **Test in at least two browsers** (Chrome and Firefox). A regression in both is probably ours; in one, it can be the browser.
- **Use the same browser versions as our users.** Browsers update every month and regressions are often version-specific, so keep sitespeed.io (and with it the browsers) up to date.
- **Use dedicated machines.** Do not judge performance from tests on a laptop or a shared machine.
- **Test as the users with the worst performance** (75th and 95th percentile): slow CPU and slow connectivity, so regressions that hurt them show up.
- **Do not use Lighthouse.** It is Chrome only, it estimates metrics for other conditions instead of measuring them, and its video metrics come from DevTools screenshots, not from what was painted on the screen.
- **Test in the open:** open source tools, and configuration and results that everybody can see.

## How a change goes live

Each test server has a clone of this repository and runs `loop.sh <testFolder> [<testFolder> ...]` forever. Before each iteration the loop fetches `origin/master`. When master moved it runs `docker system prune --all --volumes -f` and `git pull`. So:

- A merged change runs on the servers in the next iteration. There is no separate deploy step.
- A broken config or script breaks the tests on every server that runs that folder. Lint and test locally before you send the change.

## Repository layout

```
run.sh             runs one test folder: direct tests, then WebPageReplay tests
loop.sh            runs run.sh for each folder in an endless loop
tests/<folder>/    what to test: *.txt (direct URLs), *.wpr (replay URLs), *.cjs (user journeys)
config/<folder>/   sitespeed.io JSON configuration for that folder
```

Rules that `run.sh` enforces:

- **Config lookup:** for `tests/<folder>/<name>.<ext>` it uses `config/<folder>/<name>.json` if it exists, else `config/<folder>/<folder>.json`. When neither exists, the file is skipped with "Missing config file".
- **`.txt` files:** one URL per line. Each URL is a separate test, direct against production.
- **Direct tests (`.txt` and `.cjs`) do not run on the server that runs the loop.** The `sitespeed.io` command sends them through the API of the on-demand test server (<https://wikiperformance.wmcloud.org>), and a test runner runs them. The API settings come from the server's secrets file. The loop waits for each result before it continues.
- **`.cjs` files:** user journeys (CommonJS `module.exports = async function (context, commands)`), run once per browser.
- **Browsers for direct tests:** Chrome only when the folder name contains `Mobile`, otherwise Chrome and Firefox.
- **`.wpr` files:** one URL per line, only read when the folder name contains `Replay`. Each URL runs in the sitespeed.io Docker container with `REPLAY=true` (record, then replay). The browser comes from the config.
- **Baselines:** replay tests compare against a baseline in `/baseline`. On Sundays `run.sh` adds `--compare.saveBaseline true` and saves a new one. See [WebPageReplay baselines](#webpagereplay-baselines).

| Folder | Type | Notes |
|---|---|---|
| `desktopFirstView` | Direct, cold cache | Chrome + Firefox, 4g throttle, 5 iterations, slug `firstView` |
| `emulatedMobileFirstView` | Direct, cold cache | Chrome mobile emulation, CPU throttle 7, 3 iterations |
| `desktopUserJourneys` / `emulatedMobileUserJourneys` | Direct journeys | Config per script, `multi: true`, slugs `warmCache` / `userJourneyLogin` |
| `desktopReplayChromeEnwiki` | WebPageReplay | Chrome desktop, enwiki, 21 iterations, slug `webpagereplay` |
| `desktopReplayChromeGroups` | WebPageReplay | Chrome desktop, group0 + group1 wikis |
| `desktopReplayFirefox` | WebPageReplay | Firefox desktop, enwiki + groups |
| `emulatedMobileReplay` | WebPageReplay | Chrome mobile emulation, CPU throttle 2 |

## Common tasks

### Add a page

1. Pick the folder: `*FirstView` for direct tests, a `*Replay*` folder for WebPageReplay. For front-end regressions prefer WebPageReplay: it removes network and server noise and the alerts use statistical tests on its 21 runs.
2. Add the URL on a new line in the matching file (for example `tests/desktopFirstView/enwiki.txt` or `tests/desktopReplayChromeEnwiki/enwiki.wpr`).
3. Each added URL adds test time to the loop of that server. Many URLs in one replay folder make each URL run less often.
4. Wikipedia serves mobile and desktop on the same domain. For mobile use an `emulatedMobile*` folder. Never add `.m.` URLs.
5. Do not add pages on the beta cluster. `beta.txt` in `desktopFirstView` and `emulatedMobileFirstView` and the beta URL in `wikidata.txt` test `*.beta.wmcloud.org` / `*.beta.wmflabs.org`, but the beta cluster will be removed. Those tests must change to test on another server, and the beta URLs go away.

### Add a user journey

Journeys run only as direct tests. Replay journeys are not verified ([T372525](https://phabricator.wikimedia.org/T372525)).

1. Add `tests/<journeyFolder>/<name>.cjs` and `config/<journeyFolder>/<name>.json`. The config extends the first-view config of the same platform and sets `multi: true` and a `slug`.
2. Make the script defensive. Check that elements exist before you use them, and wrap interactions in try/catch that logs with `context.log.error` and re-throws. The existing journeys show the pattern.
3. Start measurements with `commands.measure.start(...)`. Between measured pages the existing scripts blank the page (`document.body.innerHTML = ""`) and wait, so the next first visual change is not hidden by old content.
4. Test it locally **without** the config, so no metrics go to Graphite: `sitespeed.io tests/desktopUserJourneys/myJourney.cjs --multi`. Credentials come from `context.options.wikipedia.*`, which are in the server secrets only. Give them on the command line for a local test and never commit them.

### Change configuration

- Every top-level config extends `/config/secrets.json`. That file exists only on the servers and holds the Graphite host, upload credentials and test user. Never add secrets to this repository.
- Replay configs: keep `iterations: 21`. The Mann-Whitney U alerts need that many runs. Do not add network throttling: the container start script sets throttling on localhost with `LATENCY` (default 100 ms RTT).
- A new `slug` or `graphite.namespace` creates a new metric path. The synthetic Graphite keeps unknown paths only 33 days. Ask Test Platform to add a retention rule (see [references/infrastructure.md](references/infrastructure.md)).
- A new test folder also needs a server that runs it, because `loop.sh` only runs the folders it was started with.
- **Do not change the CPU or connectivity settings to make tests faster or more stable.** They are chosen to match our slow users:
  - Desktop tests: the CPU speed matches about the 90th percentile of desktop users in India (CPU benchmark about 200 ms).
  - Emulated mobile tests add Chrome CPU throttling on top (`CPUThrottlingRate` 7 for first view, 2 for replay) to reach the 90th to 95th percentile of mobile users (CPU benchmark about 420 ms).
  - Direct tests use the `4g` throttle profile.
  - The WebPageReplay servers run the CPU at max frequency, because the replay proxy runs on the same machine as the browser and needs the speed.

  A change to these settings moves every metric. If it is needed, do it in its own change and add a Grafana annotation.

### Update sitespeed.io (and with it the browsers and WebPageReplay)

Both setups follow a major version tag. Minor and patch releases (new browser versions, fixes) arrive automatically. A new major version is always a manual change.

| Tests | Minor and patch | Major |
|---|---|---|
| WebPageReplay (`*Replay*` folders) | `run.sh` uses `sitespeedio/sitespeed.io:<VERSION>` and runs `docker pull` at the end of every iteration | Change `VERSION` at the top of `run.sh` in this repository |
| Direct tests (`.txt`, `.cjs`) | The on-demand test runner runs as a Docker container on a major tag and updates itself | Change the major tag in the test runner's systemd service on the test runner server, then `daemon-reload` and restart (see the [OnDemandTesting runbook](https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing/OnDemandTesting/Runbook#Update_the_testrunner)) |

For every update:

1. Read the [sitespeed.io changelog](https://github.com/sitespeedio/sitespeed.io/blob/main/CHANGELOG.md) (and the [onlinetest changelog](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/CHANGELOG.md) for a test runner major). Chrome, Firefox, Browsertime and WebPageReplay are bundled in the sitespeed.io Docker image.
2. Expect metric changes, also from automatic minor releases (a new browser version can move metrics). Add a Grafana annotation when a new version reaches the servers, so that nobody chases a fake regression. The annotation on each test shows the sitespeed.io and browser versions that ran it.
3. A major update in `run.sh` goes live in the next loop iteration after merge, like any other change.

## One-off tests

Use <https://wikiperformance.wmcloud.org> (GUI, or the API through a local sitespeed.io with an API key from Test Platform). Tests run on dedicated hardware in Frankfurt.

- Add `--webpagereplay` to get replay stability, also useful to compare two pages that have different server time.
- To compare two versions: run the baseline with 21 iterations and `--webpagereplay --compare.saveBaseline --compare.id <id>`, then the second test with the same `--compare.id`. See the Compare tab. The default alternative hypothesis is `greater` (only "slower" is found); use `--compare.alternative two-sided` when you do not know the direction.
- Add a label in the Extras tab and search with `label:<name>`. Tests stay searchable for 30 days.

## WebPageReplay baselines

The replay alerts do not compare with yesterday or last week. Each test compares its 21 runs with a saved baseline for the same URL (`/baseline/<id>-1.json`), made by the compare plugin.

- **When a new baseline is made:** on Sundays (the server's local date, `date +%a` in `run.sh`). Every replay test on a Sunday first compares with the old baseline and then saves itself as the new one. The loop runs many times on a Sunday, so the baseline for the week is the **last test of each URL on Sunday**.
- **A regression shows until the next Sunday.** Then it becomes part of the baseline and the alert stops. That does not mean it was fixed. Look at the metric graph, not only the alert state.
- **A change that happens on a Sunday is not alerted.** It goes into the baseline the same day.
- **A new URL has no comparison until its first Sunday.** Without a baseline, nothing is compared and nothing is saved on the other days.
- **A new browser or sitespeed.io version mid-week** is compared with a baseline from the old version until Sunday, so it can fire alerts. Check the versions in the Grafana annotations before you look for a Wikipedia change.
- **Keep the number of runs.** The baseline must have the same number of runs as the test (21); the compare plugin logs a warning when they differ.

## Results and alerts

- **Log in to Grafana first.** The synthetic test metrics only show for logged-in users on <https://grafana.wikimedia.org>. Without a login the dashboards load but the graphs are empty, which looks like missing metrics.
- Metrics: Graphite under `sitespeed_io.<desktop|emulatedMobile>.<slug>`, shown in the [Page drilldown dashboard](https://grafana.wikimedia.org/d/IvAfnmLMk/page-drilldown). Run-level metrics are kept 8 days.
- Result files (HTML, video, traces, screenshots) are uploaded to the result server and deleted after 35 days. Grafana annotations link to each test.
- Replay alerts fire when Mann-Whitney U is significant, Cliff's delta is above 0.3 and three or more pages regress (first visual change, largest contentful paint).
- An alert can be a Wikipedia regression, a browser regression (compare the browser version in the annotation before and after) or server noise (check the CPU benchmark standard deviation, about 1 ms is normal). Runbook: <https://wikitech.wikimedia.org/wiki/Performance/Guides/WebPageReplay_alert>.

## Before you send a change

1. `npm ci && npm test`. ESLint with `eslint-config-wikimedia` checks the `.json` and `.cjs` files.
2. Send it to Gerrit with `git review`. Add `Bug: T<number>` when there is a task. Add a Test Platform member as reviewer.

## References

- [references/infrastructure.md](references/infrastructure.md): servers, how a server runs the loop, the replay container, baselines, Graphite, result storage, error reporting and debugging. Read it before you touch a server or debug missing metrics.
- [references/runbook.md](references/runbook.md): step-by-step procedures to restart and debug: stuck or stopped tests, after a reboot, disk full, missing metrics, the on-demand setup, result storage, Graphite, a WebPageReplay alert and server users. Read it when something is broken or an alert fired.
- [references/webpagereplay-stability.md](references/webpagereplay-stability.md): what makes WebPageReplay metrics unstable, what was tested in October 2026, what helped and what did not. Read it before you change server tuning or investigate noisy replay metrics.
