# Configuration files for synthetic monitoring tests

This repo contains configuration files for running Browsertime/sitespeed.io/WebPageReplay and WebPageTest.

## What is synthetic monitoring?

We run a couple of servers with Chrome & Firefox that tests a couple pages and use cases for Wikipedia and measure the performance. We store the metrics and alert on regressions.

## How does it work
We have multiple servers that run tests continuously. They pickup which tests to run using this Github repo. At the moment this repo contains the tests we run with the old setup. Adding new tests is easy. 

As a start we run the followning tests:
* One server running Firefox and Chrome tests using WebPageReplay as a replay server for desktop
* One server running Chrome tests using WebPageReplay as a replay server for emulated mobile
* One server running Firefox and Chrome testing Alexa top 10 and use cases (as a logged in user, multiple steps etc)
* The WebPageTest server triggering the WebPageTest tests (Chrome and Firefox testing a couple of URLs).

The repo setup:
* `/config/` - configuration files for different tests
* `/tests/` - contains URLs and use cases to test

## Setup a new server to collect metrics

You need to do this when you feel that it takes too long time between runs a.k.a you need to find regressions earlier. Doing it, you should consult [the performance team](https://www.mediawiki.org/wiki/Wikimedia_Performance_Team) first. 

### Server setup
1. Your server needs to run Docker
2. Add the server so it has access to the Graphite instance
3. Setup configuration: `/config/secrets.json`


### /config/secrets.json
We use Yargs for configuration and all our configuration files extends the secrets.json file. That configuration file holds the information that we do not want to have public like S3 and WebPageTest keys.

### Run
1. `git clone https://github.com/wikimedia/performance-synthetic-monitoring-tests.git`
2. `cd performance-synthetic-monitoring-tests`
3. `nohup ./loop.sh sitespeedio &`
4. `tail -f /tmp/sitespeed.io.log`

If you want to run multiple test scenarios on one server, you can do that by feeding multiple test paths to the start script. In the test folder we have *replayDesktop* , *replayEmulatedMobile*, *sitespeedio* and *webpagetest*. To run both replay tests after each other, start the script like this: `nohup ./loop.sh replayDesktop replayEmulatedMobile &`

## Add new tests

To add a new URL you need to have a [Gerrit account](https://www.mediawiki.org/wiki/Gerrit) and access our Gerrit repo so that we can review the changes.

Clone this repo:
```git clone ssh://USERNAME@gerrit.wikimedia.org:29418/performance/synthetic-monitoring-tests.git```

### Add a new URL to test
If you want the URL to be tested with a replay proxy, add your test under *tests/replayDesktop* or *tests/replayEmulatedMobile*.

If you want the URL to be tested with a replay proxy, add your test under *tests/webpagetest*. 

### Add a new user scenario to test

If you want the URL to be tested, add your test under *tests/sitespeedio/\*/scripts*. 

## Where do I find the data/metrics?
To be added when we can see the data in our Grafana instance.

