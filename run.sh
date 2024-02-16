#!/bin/bash
VERSION=33.0.0
DOCKER_CONTAINER=sitespeedio/sitespeed.io:$VERSION
DOCKER_SETUP="--cap-add=NET_ADMIN  --shm-size=2g --rm -v /config:/config -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 --name sitespeedio"
DOCKER_SETUP_WPR="--cap-add=NET_ADMIN  --shm-size=2g --rm -v /config:/config -v /baseline/:/baseline -v "$(pwd)":/sitespeed.io -v /etc/localtime:/etc/localtime:ro -e MAX_OLD_SPACE_SIZE=3072 --name sitespeedio"

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
        # On the new Hetzner cloud instances we use the same framrate for the video
        # for both Chrome/Firefox and emulated mobile
        EXTRAS="--browsertime.videoParams.framerate 10"
        docker run $DOCKER_SETUP $DOCKER_CONTAINER --config $CONFIG_FILE -b $browser $EXTRAS $file 
        control
    done
done

if [[ "$TEST" == *"Replay"* ]]; then
    for file in tests/$TEST/*.{wpr,cjs}; do
        [ -e "$file" ] || continue
        EXTRAS=""
        FILENAME=$(basename -- "$file")
        FILENAME_WITHOUT_EXTENSION="${FILENAME%.*}"
        POTENTIAL_CONFIG_FILE="config/$TEST/$FILENAME_WITHOUT_EXTENSION.json"
        [[ -f "$POTENTIAL_CONFIG_FILE" ]] && CONFIG_FILE="$POTENTIAL_CONFIG_FILE" || CONFIG_FILE="config/$TEST/$TEST.json"
        [[ -f "$CONFIG_FILE" ]] && echo "Using config file $CONFIG_FILE" for $file || (echo "Missing config file $CONFIG_FILE for $file" && exit 1)
        # All WebPageReplay tests use baseline, 
        # and on Sundays we re-baseline!
        DOW=$(date +"%a")
        if [[ $DOW == "Sun" ]]; then
            EXTRAS="--compare.saveBaseline true"
        fi

        while IFS= read -r url || [ -n "$url" ]
        do
            docker run $DOCKER_SETUP_WPR -e REPLAY=true $DOCKER_CONTAINER $NAMESPACE --config $CONFIG_FILE $EXTRAS $url
            control
        done < "$file" 
    done
fi
docker volume prune -f
sleep 20