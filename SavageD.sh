#!/bin/bash
#
# savaged.sh
#	start | stop SavageD

function die() {
	echo "$@"
	exit 1
}

# special case - CentOS 5.ancient
PYTHON=python
if which python26 > /dev/null 2>&1 ; then
	PYTHON=python26
fi

# special case, for when we start via vagrant / ansible
if [[ `id -un` == "vagrant" ]]; then
	cd $HOME/SavageD
fi

# special case - if we have no node_modules, go and get them
if [[ ! -d ./node_modules ]] ; then
	echo "Installing our dependencies first"
	PYTHON=$PYTHON npm install || die "npm install failed :("
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
function restart() {
	local pid=`get_pid`

	if [[ -n $pid ]] ; then
		stop
	fi

	start
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

function monitor() {
	local pid=`get_pid`

	if [[ -z $pid ]] ; then
		echo "SavageD is not running"
		exit 1
	fi

	screen -rd SavageD
}

function selfMonitor() {
	local pid=`get_pid`
	local did_start=

	# do we need to start SavageD first?
	if [[ -z $pid ]] ; then
		# yes - so start it
		start
		sleep 1

		# remember that we started the daemon
		did_start=

		# what is the PID now?
		pid=`get_pid`
	fi

	# is SavageD running?
	if [[ -z $pid ]] ; then
		echo "SavageD is not running; cannot self-monitor"
		return 1
	fi

	# what alias do we want to use for ourselves?
	local proc_alias="SavageD.self"
	local serv_alias="SavageD.host"

	# use CURL to monitor ourselves
	#
	# setup the alias first
	curl -X POST http://localhost:8091/process/$proc_alias/pid -d "pid=$pid"

	# activate all known process plugins
	curl -X POST http://localhost:8091/process/$proc_alias/memory
	curl -X POST http://localhost:8091/process/$proc_alias/cpu
	curl -X POST http://localhost:8091/process/$proc_alias/threads

	# activate all known server plugins
	curl -X POST http://localhost:8091/server/$serv_alias/loadavg
	curl -X POST http://localhost:8091/server/$serv_alias/cpu

	# switch on monitoring, in case it was switched off
	curl -X POST http://localhost:8091/stats/monitoring -d 'monitoring=true'

	# if we started it, switch to the screen
	if [[ -n $did_start ]] ; then
		screen -rd SavageD
	else
		echo "SavageD is now monitoring itself as 'qa.$proc_alias' in Graphite"
	fi
}

function stopSelfMonitor() {
	local pid=`get_pid`
	local did_start=

	# is SavageD running?
	if [[ -z $pid ]] ; then
		echo "SavageD is not running; nothing to stop"
		return 1
	fi

	# what alias do we want to use for ourselves?
	local proc_alias="SavageD.self"
	local serv_alias="SavageD.host"

	# use CURL to stop monitor ourselves
	#
	# setup the alias first
	curl -X POST http://localhost:8091/process/$proc_alias/pid -d "pid=$pid"

	# activate all known process plugins
	curl -X POST http://localhost:8091/process/$proc_alias/memory

	# stop all known server plugins
	curl -X DELETE http://localhost:8091/server/$serv_alias/loadavg
	curl -X DELETE http://localhost:8091/server/$serv_alias/cpu

	# switch off monitoring
	curl -X POST http://localhost:8091/stats/monitoring -d 'monitoring=false'

	# all done
	echo "SavageD is no longer monitoring itself"
}

function usage() {
	echo "usage: SavageD.sh <start|stop|restart|status|rebuild|self-monitor"
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
	"restart")
		restart
		;;
	"rebuild")
		rebuild
		;;
	"start")
		start
		;;
	"self-monitor")
		selfMonitor
		;;
	"stop-self-monitor")
		stopSelfMonitor
		;;
	"monitor")
		monitor
		;;
	*)
		usage
		;;
esac