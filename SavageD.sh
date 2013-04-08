#!/bin/bash
#
# savaged.sh
#	start | stop SavageD

function start() {
	if ! is_running ; then
		# start the process
		echo "Starting SavageD in a screen"
		screen -d -m -S SavageD node ./server.js ./config.js

		# did it start?
		sleep 1
		is_running
	fi
}

function stop() {
	local pid=`get_pid`

	if [[ -z $pid ]] ; then
		echo "SavageD was not running"
		return 0
	fi

	kill $pid
	pid=`get_pid`
	if [[ -n $pid ]] ; then
		sleep 2
		pid=`get_pid`
	fi

	if [[ -n $pid ]] ; then
		kill -9 $pid
		pid=`get_pid`
	fi

	if [[ -n $pid ]] ; then
		echo "SavageD is running as pid $pid, and has ignored attempts to terminate"
		return 1
	fi

	echo "SavageD has been stopped"
}

function is_running() {
	local pid=`get_pid`

	if [[ -n $pid ]] ; then
		echo "SavageD is running as pid $pid"
		return 0
	fi

	echo "SavageD is not running"
	return 1
}

function get_pid() {
	# get the pid of our daemon
	local pid=`ps -ef | grep "[S]avageD daemon" | awk {' print $2 '}`

	if [[ -n $pid ]] ; then
		echo "$pid"
	fi
}

case "$1" in
	"status")
		is_running
		;;
	"stop")
		stop
		;;
	*)
		start
		;;
esac