#!/bin/bash

DOCKER_CONTAINER=sitespeedio/sitespeed.io:10.0.0-alpha.1
DOCKER_SETUP="--cap-add=NET_ADMIN  --shm-size=2g --rm --env-file /config/env -v /config:/config -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 "
CONFIG="--config /sitespeed.io/config"
BROWSERS=(chrome firefox)
WPT_LOCATION=us-east-test

# We loop through all directories we have
# We run many tests to verify the functionality of sitespeed.io and you can simplify this by
# removing things you don't need!

for url in tests/$SERVER/desktop/urls/*.txt ; do
  [ -e "$url" ] || continue
  for browser in "${BROWSERS[@]}"
    do
      # Note: If you use dots in your name you need to replace them before sending to Graphite
      # GRAPHITE_NAMESPACE=${GRAPHITE_NAMESPACE//[-.]/_}
      NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
      docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/desktop.json -b $browser $url
      control
    done
done

for script in tests/$SERVER/desktop/scripts/*.js ; do
    [ -e "$script" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
        docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/desktop.json --multi -b $browser --spa $script
        control
      done
done

for url in tests/$SERVER/emulatedMobile/urls/*.txt ; do
    [ -e "$url" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/emulatedMobile.json $url
    control
done

for script in tests/$SERVER/emulatedMobile/scripts/*.js ; do
    [ -e "$script" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/emulatedMobile.json --multi --spa $script
    control
done

# We run WebPageReplay just to verify that it works
for url in tests/$SERVER/replay/desktop/*.txt ; do
    [ -e "$url" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
        docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=100 $DOCKER_CONTAINER $NAMESPACE $CONFIG/replay.json -b $browser $url
        control
      done
done

for url in tests/$SERVER/replay/emulatedMobile/*.txt ; do
    [ -e "$url" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=100 $DOCKER_CONTAINER $NAMESPACE $CONFIG/replayEmulatedMobile.json $url
    control
done

for url in tests/$SERVER/webpagetest/desktop/urls/*.txt ; do
    [ -e "$url" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
        docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetest.json --webpagetest.location "$WPT_LOCATION:$browser" $url
        control
      done
done

for url in tests/$SERVER/webpagetest/emulatedMobile/urls/*.txt ; do
    [ -e "$url" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetestEmulatedMobile.json $url
    control
done

for script in tests/$SERVER/webpagetest/desktop/scripts/* ; do
    [ -e "$script" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetest.json --plugins.remove browsertime --webpagetest.file $script https://www.example.org/
    control
done

sleep 20
