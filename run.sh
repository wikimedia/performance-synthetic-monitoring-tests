#!/bin/bash
VERSION=27.3.0
DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION
DOCKER_SETUP="--cap-add=NET_ADMIN  --shm-size=2g --rm -v /config:/config -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 --name sitespeedio"

for file in tests/$TEST/*.{txt,cjs} ; do
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
         if [ "$browser" = "firefox" ]; then
            EXTRAS="--browsertime.videoParams.framerate 10"
        else
            EXTRAS=""
        fi
        docker run $DOCKER_SETUP $DOCKER_CONTAINER --config $CONFIG_FILE -b $browser $EXTRAS $file 
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
        if [[ $TEST == *"Mobile"* ]]; then
            LATENCY=220
        else
            LATENCY=180
        fi
        docker run $DOCKER_SETUP -e REPLAY=true -e LATENCY=$LATENCY $DOCKER_CONTAINER $NAMESPACE --config $CONFIG_FILE -b $browser $file
        control
    done
done

docker volume prune -f
sleep 20
