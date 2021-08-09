#!/bin/bash
VERSION=18.0.1
DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION
WPT_DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION-webpagetest
DOCKER_SETUP="--cap-add=NET_ADMIN  --shm-size=2g --rm -v /config:/config -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 --name sitespeedio"

for file in tests/$TEST/*.{txt,js} ; do
    [ -e "$file" ] || continue
    if [[ $TEST == *"Mobile"* ]]; then
        BROWSERS=(chrome)
    else
        BROWSERS=(chrome firefox)
    fi
    for browser in "${BROWSERS[@]}" ; do
        FILENAME=$(basename -- "$file")
        FILENAME_WITHOUT_EXTENSION="${FILENAME%.*}"
        POTENTIAL_CONFIG_FILE="config/$TEST/$FILENAME_WITHOUT_EXTENSION.json"
        [[ -f "$POTENTIAL_CONFIG_FILE" ]] && CONFIG_FILE="$POTENTIAL_CONFIG_FILE" || CONFIG_FILE="config/$TEST/$TEST.json"
        [[ -f "$CONFIG_FILE" ]] && echo "Using config file $CONFIG_FILE" for $file || (echo "Missing config file $CONFIG_FILE for $file" && exit 1)
        docker run $DOCKER_SETUP $DOCKER_CONTAINER --config $CONFIG_FILE -b $browser $file
        control
    done
done

for file in tests/$TEST/*.wpr; do
    [ -e "$file" ] || continue
    if [[ $TEST == *"Mobile"* ]]; then
        BROWSERS=(chrome)
    else
        BROWSERS=(chrome firefox)
    fi
    for browser in "${BROWSERS[@]}"
    do
        FILENAME=$(basename -- "$file")
        FILENAME_WITHOUT_EXTENSION="${FILENAME%.*}"
        POTENTIAL_CONFIG_FILE="config/$TEST/$FILENAME_WITHOUT_EXTENSION.json"
        [[ -f "$POTENTIAL_CONFIG_FILE" ]] && CONFIG_FILE="$POTENTIAL_CONFIG_FILE" || CONFIG_FILE="config/$TEST/$TEST.json"
        [[ -f "$CONFIG_FILE" ]] && echo "Using config file $CONFIG_FILE" for $file || (echo "Missing config file $CONFIG_FILE for $file" && exit 1)
        # See https://phabricator.wikimedia.org/T282517
        if [ "$browser" = "firefox" ]; then
            LATENCY=100
        elif [[ $TEST == *"Mobile"* ]]; then
            LATENCY=220
        else
            LATENCY=180
        fi
        docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=$LATENCY $DOCKER_CONTAINER $NAMESPACE --config $CONFIG_FILE -b $browser $file
        control
    done
done
for file in tests/$TEST/*.wpt ; do
    [ -e "$file" ] || continue
    if [[ $TEST == *"Mobile"* ]]; then
        BROWSERS=(Chrome)
    else
        BROWSERS=(Chrome Firefox)
    fi
    for browser in "${BROWSERS[@]}"
    do
        FILENAME=$(basename -- "$file")
        FILENAME_WITHOUT_EXTENSION="${FILENAME%.*}"
        POTENTIAL_CONFIG_FILE="config/$TEST/$FILENAME_WITHOUT_EXTENSION.json"
        [[ -f "$POTENTIAL_CONFIG_FILE" ]] && CONFIG_FILE="$POTENTIAL_CONFIG_FILE" || CONFIG_FILE="config/$TEST/$TEST-$browser.json"
        [[ -f "$CONFIG_FILE" ]] && echo "Using config file $CONFIG_FILE" for $file || (echo "Missing config file $CONFIG_FILE for $file"  && exit 1)
        docker run $DOCKER_SETUP $WPT_DOCKER_CONTAINER $NAMESPACE --config $CONFIG_FILE --webpagetest.location us-east:$browser --browsertime.video false --plugins.add /webpagetest $file
        control
    done
done

docker volume prune -f
sleep 20
