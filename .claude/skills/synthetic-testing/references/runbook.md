# Synthetic testing runbook

Step-by-step procedures to restart and debug the synthetic test setup. Server addresses and access are on wikitech, not here: see the links in [infrastructure.md](infrastructure.md). Which server runs which tests is in the server table in the same file.

General rules:

- Never run extra tests on a server while its loop runs. Parallel tests make the metrics useless for that period.
- Keep one SSH session open while you change SSH, sudo or firewall settings, so you can undo a mistake.
- After a change that can move metrics (restart with a new version, tuning, reboot), add a Grafana annotation.

## Test servers (WebPageReplay loop)

### Check that tests run

```bash
docker ps                      # a sitespeedio container, created a few minutes ago
tail -f /tmp/sitespeed.io.log  # new "Running test" / replay lines every few minutes
ls <clone>/sitespeed.run       # the loop's control file, in the clone of this repository
```

The container is started and removed for every URL. A container that is hours or days old is stuck.

### Stuck container

1. `docker kill sitespeedio`
2. Wait a minute and run `docker ps`. A new container should be there, because the loop continues with the next URL.
3. Watch Grafana for the next hour. The cause (usually the browser) can come back. If it happens again for the same URL, look at the log for that URL and the last result page.

### Stop the loop

1. `rm sitespeed.run` in the clone of the repository.
2. The loop finishes the current test, runs `docker system prune --all --volumes -f` and exits.
3. Wait until `docker ps` shows no `sitespeedio` container.

To stop at once instead: `rm sitespeed.run`, then `docker kill sitespeedio`.

### Start the loop

1. Go to the clone and make sure `sitespeed.run` does not exist (the loop refuses to start when it does; after a crash, remove it by hand).
2. Start the loop with the test folders of that server, in the background:

   ```bash
   nohup ./loop.sh <testFolder> [<testFolder> ...] > /dev/null 2>&1 &
   ```

   The loop writes its own output to `/tmp/sitespeed.io.log`. It loads the `ifb` module, pulls the latest master and starts testing.
3. Check with `docker ps` and the log that the first test starts.

### After a reboot

1. Check that `/root/cpu.sh` ran (it runs from root's crontab with `@reboot`):

   ```bash
   cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor | sort | uniq -c   # all "performance"
   grep MHz /proc/cpuinfo                                                       # all at the pinned frequency
   grep . /sys/devices/system/cpu/cpu0/cpuidle/state*/name /sys/devices/system/cpu/cpu0/cpuidle/state*/disable
   ```

   Only POLL and C1 may be enabled (`disable` is 0). If not, run `/root/cpu.sh` as root and check `crontab -l` for the `@reboot` line.
2. Check if the loop started by itself (`docker ps`, `tail /tmp/sitespeed.io.log`). If not, remove a stale `sitespeed.run` and start the loop.
3. Start the Slack error reporter again if it does not start at boot (`ps -ef | grep tail-slack`):

   ```bash
   nohup nice ./tail-slack.sh "/tmp/sitespeed.io.log" "<Slack webhook URL>" "ERROR:" > /tmp/s.out 2> /tmp/s.err < /dev/null &
   ```

   The webhook URL is secret. Copy it from the same command on another server; never add it to this repository.
4. Add a Grafana annotation for the reboot.

### Disk full

1. Find what is full: `df -h`, then `sudo du -xh --max-depth=1 / /tmp 2>/dev/null | sort -h | tail -20`.
2. **Test runner working folders (on-demand test runner server):** the test runner creates a folder per test in `/tmp/<queue name>/<test id>/` (the host's `/tmp` is mapped into the test runner container) and never removes it. It holds the test config and result JSON, and the full result (video, traces, screenshots) when the upload failed. Remove old folders when they are older than a few days:

   ```bash
   sudo find /tmp/<queue name> -mindepth 1 -maxdepth 1 -type d -mtime +3 -exec rm -rf {} +
   ```

   The browsers run in Docker containers on all servers, so Chrome and Firefox temp files stay in the container and are removed with it (`--rm`).
3. **Docker data:** stop the loop, then `docker system prune --all --volumes -f` (the loop also does this on every code change).
4. **Local result folders (WebPageReplay servers):** sitespeed.io removes the local result after a successful upload (`scp.removeLocalResult` is true by default). Folders left in `sitespeed-result` in the clone are from failed uploads. Check the Slack error channel for upload errors, then remove them.
5. **The loop log:** `/tmp/sitespeed.io.log` grows while the loop runs. Truncate it with `: > /tmp/sitespeed.io.log`; do not delete it, because the loop and the Slack reporter keep it open.

## Metrics are missing in Grafana

0. Make sure you are logged in to Grafana. Without a login the synthetic test graphs are empty.
1. Check the error reporting Slack channel for errors from that server.
2. **Only one test type or server is missing:** go to that test server and follow "Check that tests run". For direct tests go to the on-demand setup instead (next section), because the loop server only sends direct tests.
3. **Everything is missing:** check Graphite (see Graphite below).
4. **Metrics are there but the annotation has no screenshot, or the result link gives 404:** see "Result storage".

## On-demand setup (direct tests and wikiperformance.wmcloud.org)

All services restart by themselves on failure. The queue is the most important part: without it, no test can be added or run.

### Queue (KeyDB)

```bash
sudo su - queue
docker ps                                   # the keydb container runs
sudo journalctl -u keydb-queue.service -n 100
docker logs queue-keydb-1
sudo systemctl restart keydb-queue          # restart through systemd, not docker
```

The queue writes to disk (append-only file), so a restart does not lose waiting tests.

### Database (PostgreSQL) and GUI

```bash
sudo su - database
docker ps                                   # the postgresql container runs
sudo journalctl -u database.service -n 100
docker logs database-postgresql-1
sudo systemctl restart database.service
```

The GUI runs on the database server:

- Quick check: open <https://wikiperformance.wmcloud.org/search/> and scroll down. Finished tests in the list mean the database works.
- If the GUI is down, check the queue and the database first. They are the usual cause.
- Log: `tail -f /var/log/sitespeed.io/server-stdout.log`
- Restart: `sudo systemctl restart sitespeedserver.service`

### Test runner

```bash
su - sitespeedio
tail -f /var/log/sitespeedio/testrunner-stdout.log   # new lines while tests run
tail -f /var/log/sitespeedio/testrunner-stderr.log   # errors, also sent to Slack
sudo systemctl restart sitespeedtestrunner.service
```

### Update the server or test runner to a new major version

Minor versions update by themselves. For a major version:

1. Read the changelog: [server](https://github.com/sitespeedio/onlinetest/blob/main/CHANGELOG.md), [test runner](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/CHANGELOG.md). A major server version can need a database migration first.
2. Edit the service file and change the major tag of the container (`sitespeedio/server:<major>` or `sitespeedio/testrunner:<major>`):
   - server: `sudo nano /etc/systemd/system/sitespeedserver.service`
   - test runner: `sudo nano /etc/systemd/system/sitespeedtestrunner.service`
3. `sudo systemctl daemon-reload`
4. `sudo systemctl restart sitespeedserver.service` (or `sitespeedtestrunner.service`).
5. Run a test from the GUI and check that it finishes.

## Result storage

Results (HTML, video, screenshots, traces) are uploaded with scp by the user `uploader` and served by nginx. Old results are deleted after 35 days by root's crontab.

- **Some results missing:** look for upload errors in the error reporting Slack channel, for example `Could not upload using scp Error: Connection lost before handshake`. A few per month can be ignored. Many mean that scp has a problem: check the disk space on the result server (`df -h`, data is in `/data` and `/home/data`) and the SSH log.
- **All results missing:** nginx is probably down.

  ```bash
  sudo systemctl status nginx
  sudo systemctl start nginx
  sudo nginx -t && sudo systemctl reload nginx   # after a config change
  ```

  The site configuration is `/etc/nginx/sites-available/wikimedia.sitespeed.io`.

## Graphite

```bash
sudo su - graphite
cd /home/graphite/settings
docker compose ps
docker compose up -d       # start
docker compose down        # stop
```

- How long metrics are kept depends on the path (8 to 400 days, see [infrastructure.md](infrastructure.md)).
- A new test server must be added to the firewall script, then run the clear script and the firewall script again. Without that, Graphite drops its metrics.
- If annotations stop working, the annotation database can be too large. A weekly cron job deletes old events and runs `VACUUM`; check that it runs (`crontab -l`).

## A WebPageReplay alert fired

The alert fires when three or more pages have a significant regression (Mann-Whitney U, Cliff's delta above 0.3) for first visual change or largest contentful paint. The cause is one of: a Wikipedia front-end regression, a browser regression or test server noise.

1. Open the alert dashboard and the page drilldown dashboard for one of the pages (device, test type `webpagereplay`, domain, page, browser). Find the time of the change, to about two hours.
2. Check all tested URLs. A change on all pages at the same time is more likely real than a change on one page.
3. **Browser regression?** Click "Show each tests" and hover the annotations before and after the change. They show `<sitespeed.io version> - <browser version>`. If the browser version changed at the same time, check the direct tests for the same change. To be sure, roll back the sitespeed.io version on one server (the sitespeed.io changelog shows which version has which browser) and see if the change goes away. Then report the regression upstream to the browser.
4. **Test server noise?** Check the CPU benchmark panel: its standard deviation should be about 1 ms, and min/median/max close together. If it is high, check the server (load, `cpu.sh` after a reboot, see "After a reboot").
5. **Wikipedia regression?** Check the direct tests and real user monitoring for the same change, and the Server Admin Log for deploys at that time. If you can confirm it, create a Phabricator task with screenshots and links, and add the team or person behind the change.

Remember that the comparison is against the last Sunday test: a change that started before Sunday is in the baseline and does not alert, and an alert stops on Sunday whether or not the cause is fixed.

Also check [webpagereplay-stability.md](webpagereplay-stability.md): some pages switch between two paint paths, and a page change can move the median by one round trip without a real regression.

## Users on the servers

Each person gets their own account with an SSH key, so the auth log shows who did what.

Add a user (as root or with sudo):

```bash
adduser --disabled-password --gecos "" <user>
mkdir -p /home/<user>/.ssh
echo "<public key>" > /home/<user>/.ssh/authorized_keys
chown -R <user>:<user> /home/<user>/.ssh
chmod 700 /home/<user>/.ssh && chmod 600 /home/<user>/.ssh/authorized_keys
echo "<user> ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/<user>
chmod 440 /etc/sudoers.d/<user>
visudo -c                       # a broken sudoers file locks everyone out of sudo
usermod -aG docker <user>       # only for users that also have sudo: docker is root access
```

Test from a second session (`ssh <user>@<server> 'sudo -n true && echo ok'`) before you log out.

Remove a user:

```bash
deluser --remove-home <user>
rm /etc/sudoers.d/<user>
```
