# Synthetic testing infrastructure

How the servers run the tests in this repository, and how to debug them. Wikitech has the full setup guides; this file describes the setup as it is now and links to them.

## Servers

All test servers are at Hetzner in Europe.

| Server | Kind | Runs |
|---|---|---|
| hetzner-1 | Bare metal | WebPageReplay, Chrome desktop, enwiki (`desktopReplayChromeEnwiki`) |
| hetzner-2 | Bare metal | WebPageReplay, Chrome desktop, group0 + group1 (`desktopReplayChromeGroups`) |
| hetzner-3 | Bare metal | WebPageReplay, Firefox desktop (`desktopReplayFirefox`) |
| hetzner-4 | Bare metal | WebPageReplay, emulated mobile (`emulatedMobileReplay`) |
| Test runner server | Bare metal | Test runner for the on-demand setup. Runs all direct tests (monitoring and one-off) |
| Queue and database servers | WMCS VPS | On-demand queue (KeyDB) and database + GUI (PostgreSQL, wikiperformance.wmcloud.org) |
| Result storage server | Bare metal | Result storage (nginx) |

Addresses and access are on wikitech, not in this public repository: <https://wikitech.wikimedia.org/wiki/WebPageReplay> (replay servers) and the OnDemandTesting and Result storage pages. The server-to-folder mapping was confirmed in October 2026. It can change, so check on the server (`ps -ef | grep loop.sh`) before you act on it.

## How a server runs the tests

- The repository is cloned in the home directory of the user that runs the tests.
- The loop runs as `./loop.sh <testFolder> ...` in the background. It writes all output to `/tmp/sitespeed.io.log` (`tail -f /tmp/sitespeed.io.log`).
- `loop.sh` creates `sitespeed.run` in the clone. It refuses to start when the file exists.
- **Stop gracefully:** `rm sitespeed.run`. The loop finishes the current test, prunes Docker and exits. Wait until `docker ps` shows no `sitespeedio` container before you run anything else on the server; parallel tests destroy the metrics.
- `loop.sh` loads the `ifb` kernel module for throttling on every start.

## Direct tests

`run.sh` runs `sitespeed.io --config config/<folder>/<file>.json --xvfb --browsertime.browser <browser> <url or script>`. The secrets file gives the API settings (`api.hostname`, `api.location`, `api.key`), so the command does not test anything itself: it sends the test to the on-demand server and waits for the result (`--api.action addAndGetResult`, the default). For a `.cjs` file it sends the script too.

The test runner server takes the job from the queue and runs it. Its configuration (useDocker and the sitespeed.io container, or the sitespeed.io in the test runner image) decides the sitespeed.io and browser versions. One-off tests from the GUI go first in the same queue, so they delay the monitoring tests.

How the API works: <https://www.sitespeed.io/documentation/onlinetest/>.

## WebPageReplay tests

`run.sh` starts one container per URL:

```
docker run --cap-add=NET_ADMIN --shm-size=2g --rm -v /config:/config -v /baseline/:/baseline \
  -v "$(pwd)":/sitespeed.io -e REPLAY=true --name sitespeedio sitespeedio/sitespeed.io:<VERSION> \
  --config config/<folder>/<folder>.json <url>
```

The container start script (`/start.sh` in the image):

1. Starts `wpr record`, loads the URL once with Browsertime through the proxy and stops recording. The archive is new for every URL in every iteration, so live page changes reach the replay within one loop.
2. Starts `wpr replay` with the WebPageReplay inject script (`deterministic.js`, which fixes `Date` and `Math.random`).
3. Runs sitespeed.io against the replay with throttling on localhost: `--connectivity.engine throttle --connectivity.throttle.localhost --connectivity.rtt $LATENCY` (default 100 ms). Since sitespeed.io 42.9.0 (Browsertime 28.4.0) throttle also sets the loopback MTU to 1500.
4. Compares the result with the baseline in `/baseline` (Mann-Whitney U, Cliff's delta) and sends metrics and the comparison to Graphite.

On Sundays `run.sh` adds `--compare.saveBaseline true`: each test compares with the old baseline and then replaces it, so the last test of each URL on Sunday is the baseline for the week. What that means for alerts: see "WebPageReplay baselines" in [SKILL.md](../SKILL.md).

## Server files outside the repository

- `/config/secrets.json`: Graphite host, result upload (scp) settings and the test user. Every config extends it. Copy it from another server when you set up a new one.
- `/baseline`: compare baselines for the replay tests.
- `/root/cpu.sh`: CPU tuning, run from root's crontab with `@reboot /root/cpu.sh`.
- A Slack error reporter (`tail-slack.sh`) tails `/tmp/sitespeed.io.log` and posts lines with `ERROR:` to the error reporting Slack channel.

## CPU tuning on bare metal

The wikitech setup page says that the CPU is pinned to 1 GHz. That is out of date. All four replay servers (hetzner-1 to hetzner-4) use the same tuning (October 2026):

- `/root/cpu.sh` sets the `performance` governor and pins all cores to the max frequency of the CPU (4.0 GHz on hetzner-1, which holds 3988 to 4000 MHz under test with no thermal throttling).
- Deep CPU idle states are disabled, also in `/root/cpu.sh`:

  ```
  # Deep idle states change network timing in tests. Keep only the fast ones.
  for s in /sys/devices/system/cpu/cpu*/cpuidle/state*; do if [ "$(cat $s/latency)" -gt 2 ]; then echo 1 > $s/disable; fi; done
  ```

  Check with `cat /sys/devices/system/cpu/cpu0/cpuidle/state*/disable`; only POLL and C1 stay enabled. Do this on bare metal only (`systemd-detect-virt` prints `none`).

The same tuning, with the reasons, is in the sitespeed.io guide: <https://www.sitespeed.io/documentation/sitespeed.io/web-performance-testing-in-practice/#running-on-bare-metal>. When you set up a new replay server, give it the same `cpu.sh`. Why these settings matter: [webpagereplay-stability.md](webpagereplay-stability.md).

## Graphite

- Separate Graphite instance for synthetic tests, metrics under `sitespeed_io.` and shown in Grafana.
- Retention depends on the path (`storage-schemas.conf`, first match wins):
  - `sitespeed_io.<x>.<y>.run.*`: 8 days at 15 s
  - `sitespeed_io.desktop.firstView`, `sitespeed_io.emulatedMobile.firstView`, `userJourneyLogin`: 400 days
  - `sitespeed_io.<desktop|emulatedMobile>.webpagereplay`: 90 days
  - any other `sitespeed_io.*` path: 33 days
- A new slug or namespace needs its own rule, or it falls into the 33-day default.
- Graphite only accepts metrics from known servers. A new test server must be added to the Graphite firewall (see the Graphite page on wikitech).
- Annotations are stored in SQLite and cleaned weekly. A very large annotation database makes annotations fail.

Setup and access: <https://wikitech.wikimedia.org/wiki/Performance/Graphite_(synthetic_instance)>.

## Debugging

Step-by-step procedures are in [runbook.md](runbook.md). Short version:

**No new metrics in Grafana**

1. Check the error reporting Slack channel.
2. Log in to the server that runs the folder and run `docker ps`. A `sitespeedio` container should be at most a few minutes old.
3. If it is hours or days old, it is stuck (usually the browser). `docker kill sitespeedio`, wait a minute, check that a new container started and watch Grafana for the next hour.
4. If containers run but nothing arrives, check Graphite.

**Results missing behind Grafana annotations:** see the result storage runbook. Occasional `Could not upload using scp` errors can be ignored; many mean an upload problem.

**Direct tests or on-demand tests missing:** the loop servers only send direct tests. Check the queue, the database and the test runner with <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing/OnDemandTesting/Runbook>.

## More on wikitech

- Overview: <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing>
- Add a test: <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing/Run_a_test>
- Bare metal setup: <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing/Bare_metal>
- WebPageReplay runbook: <https://wikitech.wikimedia.org/wiki/WebPageReplay/Runbook>
- Alert guide: <https://wikitech.wikimedia.org/wiki/Performance/Guides/WebPageReplay_alert>
- Result storage runbook: <https://wikitech.wikimedia.org/wiki/Performance/Synthetic_testing/Result_storage/Runbook>
