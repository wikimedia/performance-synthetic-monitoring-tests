# WebPageReplay metric stability

What makes replay metrics unstable on the bare metal servers, and what was tested to fix it. Most results are from hetzner-1 in October 2026: enwiki Facebook article, 21 runs per test, one fixed sitespeed.io image for all tests. Check this list before you suggest a new stability experiment.

## Fixed and shipped

| Cause | Effect | Fix |
|---|---|---|
| Loopback MTU 65536. Chrome's receive window then grows in full round-trip steps. | HTML download time in steps of 345/405/504 ms, FCP spread about 300 ms | Throttle 6.1.0 sets loopback MTU to 1500 (Browsertime 28.4.0, sitespeed.io 42.9.0) |
| Deep CPU idle states (C3 and deeper) | With them enabled: FCP median 1068 instead of 984 ms, stdev 36.6 instead of 17.9 ms, HTML arrival in 40 ms and 100 ms steps | Disable idle states with exit latency above 2 µs in `/root/cpu.sh` (see [infrastructure.md](infrastructure.md)) |
| Chrome contacting Google services and port 80 going to the internet during replay | Extra network traffic and connections in the measurement | Browsertime 28.3.1 |

With these fixes the FCP median for the test page was the same in four repeated tests (984 ms), with a stdev of about 18 ms.

## Tested, did not help

Do not suggest these again without new information:

- **Pin the container to some cores** (`--cpuset-cpus`): stdev went up and CPU pressure (PSI) went up five times.
- **tmpfs for /tmp**: no effect.
- **Constant `Math.random`** (`--constant_math_random_result`): no effect.
- **Download limit on localhost** (`--browsertime.connectivity.down 20000`): one path only, but metrics move in steps of one HTTP/2 data frame and are 70 ms later.
- **Priority write scheduler in WebPageReplay**: worse, because the replay handler writes each response from its own goroutine, so the scheduler cannot set the order.
- **Revert to the old WebPageReplay inject script**: more stable by luck only (see the next section).

The CPU frequency pinning in `/root/cpu.sh` works. There was no thermal throttling and almost no CPU pressure during tests, so CPU contention is not a noise source on these servers.

## Known remaining noise: two paint paths

Some pages paint first on one of two values, for example 936 or 984 ms (Facebook) and 620 or 720 ms (Main_Page). The median is stable as long as most runs take the same path. It jumps when the share of runs on each path gets close to 50%.

The mechanism:

- WebPageReplay sends all responses on one HTTP/2 connection and interleaves their data frames in an order that changes from run to run.
- The first paint waits for the render-blocking CSS. When the CSS is ready, Chrome styles and lays out all the DOM that is parsed at that moment. That first style and layout is the long task before first paint.
- If the CSS is ready while the parser is still in the document, the first paint is early and covers part of the page. If the whole HTML is parsed first, the style and layout cover the whole document and paint later.
- On Main_Page the difference is a full round trip: the last bytes of the CSS arrive in the same round trip as the end of the HTML or in the next one.
- On Facebook the CSS ends 2 to 5 ms after the HTML in both paths. What decides it is whether the renderer parses the last HTML chunk before or after it handles the CSS.
- A small change in the page can change the share of runs on each path. The new inject script made the HTML about 380 bytes larger and moved Facebook from mostly early to mostly late.

Real users see both paths too. Possible fixes, none built yet:

- Change WebPageReplay so it sends render-blocking CSS before the rest of the HTML.
- Report the path per run. A script injected at document start with `--browsertime.injectJs` can count DOM elements in the first `requestAnimationFrame` callback. A render-blocked page gets no animation frames, so the first frame comes just before first paint. Divide by the element count at `DOMContentLoaded` and collect the value with a `--browsertime.script` folder (one file per metric, each returns a number).

## How to measure stability

- Stop the normal loop first (`rm sitespeed.run`, wait for `docker ps` to show no container). Parallel tests make all numbers worthless.
- Use one fixed image digest for all tests in a comparison, not a moving tag.
- Run 21 runs per variant and repeat the baseline at least once. Compare the median, the stdev and the number of runs on each paint path, not only the median.
- Set the loopback MTU to 1500 with `nsenter` when you test an image older than sitespeed.io 42.9.0, or results are not comparable.
- Record host CPU pressure (`/proc/pressure/cpu`) and thermal throttle counters during the test.
- Local Docker on a laptop is fine to find a mechanism, but its network timing is much noisier than the servers'. Never use local numbers to judge stability.

## Tools for a deeper look

- **HAR `_chunks`**: each entry has the time and size of each data chunk. The times are recorded in the renderer, not when bytes reach the network, while the entry end time comes from the network.
- **Chrome NetLog** (`--browsertime.chrome.collectNetLog`): HTTP/2 data frames per stream with times, so the real byte order on the connection. The file is cut off at the end; read it one event per line.
- **Chrome trace** (`--browsertime.chrome.timeline`): ParseHTML slices, stylesheet parsing, the first style recalculation with its element count and the first paint.
