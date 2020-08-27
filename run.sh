#!/bin/bash
VERSION=14.4.0
DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION
WPT_DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION-slim
DOCKER_SETUP="--cap-add=NET_ADMIN  --shm-size=2g --rm -v /config:/config -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 --name sitespeedio"
CONFIG="--config /sitespeed.io/config"
BROWSERS=(chrome firefox)
WPT_LOCATION=us-east-test

for url in tests/$TEST/desktop/urls/*.txt ; do
  [ -e "$url" ] || continue
  for browser in "${BROWSERS[@]}"
    do
      # Note: If you use dots in your name you need to replace them before sending to Graphite
      # GRAPHITE_NAMESPACE=${GRAPHITE_NAMESPACE//[-.]/_}
      POTENTIAL_CONFIG="./config/$(basename ${url%%.*}).json"
      [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${url%.*}).json" || CONFIG_FILE="desktop.json"
      NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
      docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE -b $browser $url
      control
    done
done

for script in tests/$TEST/desktop/scripts/*.js ; do
    [ -e "$script" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        POTENTIAL_CONFIG="./config/$(basename ${script%%.*}).json"
        [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${script%.*}).json" || CONFIG_FILE="desktop.json"
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
        docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE --multi -b $browser --spa $script
        control
      done
done

for script in tests/$TEST/desktop/editScripts/*.js ; do
    [ -e "$script" ] || continue
    POTENTIAL_CONFIG="./config/$(basename ${script%%.*}).json"
    [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${script%.*}).json" || CONFIG_FILE="edit.json"
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE --multi -b chrome --spa $script
    control
    sleep 1800
    control
done

for url in tests/$TEST/emulatedMobile/urls/*.txt ; do
    [ -e "$url" ] || continue
    POTENTIAL_CONFIG="./config/$(basename ${url%%.*}).json"
    [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${url%.*}).json" || CONFIG_FILE="emulatedMobile.json"
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE $url
    control
done

for script in tests/$TEST/emulatedMobile/scripts/*.js ; do
    [ -e "$script" ] || continue
    POTENTIAL_CONFIG="./config/$(basename ${script%%.*}).json"
    [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${script%.*}).json" || CONFIG_FILE="emulatedMobile.json"
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
    docker run $DOCKER_SETUP $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE --multi --spa $script
    control
done

for url in tests/$TEST/replay/desktop/*.txt ; do
    [ -e "$url" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        POTENTIAL_CONFIG="./config/$(basename ${url%%.*}).json"
        [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${url%.*}).json" || CONFIG_FILE="replay-$browser.json"
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
        docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=100 $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE -b $browser $url
        control
      done
done

for url in tests/$TEST/replay/emulatedMobile/*.txt ; do
    [ -e "$url" ] || continue
    POTENTIAL_CONFIG="./config/$(basename ${url%%.*}).json"
    [[ -f "$POTENTIAL_CONFIG" ]] && CONFIG_FILE="$(basename ${url%.*}).json" || CONFIG_FILE="replayEmulatedMobile.json"
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=100 $DOCKER_CONTAINER $NAMESPACE $CONFIG/$CONFIG_FILE $url
    control
done

for url in tests/$TEST/webpagetest/desktop/urls/*.txt ; do
    [ -e "$url" ] || continue
    for browser in "${BROWSERS[@]}"
      do
        NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
        docker run $DOCKER_SETUP $WPT_DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetest-$browser.json --browsertime.video false $url
        control
      done
done

for url in tests/$TEST/webpagetest/emulatedMobile/urls/*.txt ; do
    [ -e "$url" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${url%%.*})"
    docker run $DOCKER_SETUP $WPT_DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetestEmulatedMobile.json --browsertime.video false $url
    control
done

for script in tests/$TEST/webpagetest/desktop/scripts/* ; do
    [ -e "$script" ] || continue
    NAMESPACE="--graphite.namespace sitespeed_io.$(basename ${script%%.*})"
    docker run $DOCKER_SETUP $WPT_DOCKER_CONTAINER $NAMESPACE $CONFIG/webpagetest.json --webpagetest.file $script --browsertime.video false https://www.example.org/
    control
done
docker volume prune -f
sleep 20
