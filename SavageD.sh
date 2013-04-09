#!/bin/bash
#
# savaged.sh
#	start | stop SavageD

function die() {
	echo "$@"
	exit 1
}

# special case, for when we start via vagrant / ansible
if [[ `id -un` == "vagrant" ]]; then
	cd $HOME/SavageD
fi

# special case - if we have no node_modules, go and get them
if [[ ! -d ./node_modules ]] ; then
	echo "Installing our dependencies first"
	npm install || die "npm install failed :("
fi

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

function rebuild() {
	if is_running ; then
		stop
	fi

	if [[ -d ./.git ]] ; then
		echo "Updating our code base"
		git pull || die "git pull failed :("
	fi

	echo "Rebuilding our node_modules to ensure they are up to date"

	if [[ -d ./node_modules ]] ; then
		rm -rf ./node_modules
	fi

	npm install || die "npm install failed :("
}

function usage() {
	echo "usage: SavageD.sh <start|stop|status|rebuild"
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
	"rebuild")
		rebuild
		;;
	"start")
		start
		;;
	*)
		usage
		;;
esac