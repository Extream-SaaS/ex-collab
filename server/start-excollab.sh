#!/bin/bash

# change workdir
cd /home/owt

# bash ./bin/init-all.sh --deps

# bash ./bin/start-all.sh

# per server type startup commands here
# format the parameters
set -- $(getopt -u -l db,management-api,cluster-manager,portal,conference-agent,webrtc-agent,streaming-agent,recording-agent,audio-agent,video-agent,analytics-agent,sip-agent,sip-portal,management-console: -- -- "$@")
# get the parameters
while [ -n "$1" ]
do
    case "$1" in
        management-api ) bash ./bin/daemon.sh start management-api; shift; shift ;;
        cluster-manager ) bash ./bin/daemon.sh start cluster-manager; shift; shift ;;
        portal ) bash ./bin/daemon.sh start portal; shift; shift ;;
        conference-agent ) bash ./bin/daemon.sh start conference-agent; shift; shift ;;
        webrtc-agent ) bash ./bin/daemon.sh start webrtc-agent; shift; shift ;;
        streaming-agent ) bash ./bin/daemon.sh start streaming-agent; shift; shift ;;
        recording-agent ) bash ./bin/daemon.sh start recording-agent; shift; shift ;;
        audio-agent ) bash ./bin/daemon.sh start audio-agent; shift; shift ;;
        video-agent ) bash ./bin/daemon.sh start video-agent; shift; shift ;;
        analytics-agent ) bash ./bin/daemon.sh start analytics-agent; shift; shift ;;
        sip-agent ) bash ./bin/daemon.sh start sip-agent; shift; shift ;;
        sip-portal ) bash ./bin/daemon.sh start sip-portal; shift; shift ;;
        management-console ) bash ./bin/daemon.sh start management-console; shift; shift ;;
        * ) break;;
    esac
done

sleep infinity