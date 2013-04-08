// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var async    = require("async");
var dsCommon = require("dsCommon");

function ProcessMemory(appServer) {
	// call our parent constructor
	ProcessMemory.super_.call(this, appServer, {
		name: "ProcessMemory"
	});

	// our routes
	appServer.httpManager.routes.ProcessMemory = {
		"get": [
			{
				route: "/process/:alias/memory",
				handler: this.onGetProcessMemory.bind(this)
			}
		],
		"put": [
			{
				route: "/process/:alias/memory",
				handler: this.onPutProcessMemory.bind(this)
			}
		],
		"del": [
			{
				route: "/process/:alias/memory",
				handler: this.onDeleteProcessMemory.bind(this)
			}
		]
	};

	// our processes to monitor
	this.aliases = {};

	// listen for timer events
	appServer.on('every1sec', this.onTimer.bind(this));
}
module.exports = ProcessMemory;
util.inherits(ProcessMemory, dsCommon.dsFeature);

ProcessMemory.prototype.onGetProcessMemory = function(req, res, next) {
	// do we have this process currently in our list?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "not monitoring"});
		return next();
	}

	// yes, we do
	res.send(200, { montoring: true });
	return next();
};

ProcessMemory.prototype.onPutProcessMemory = function(req, res, next) {
	// do we have a pid at all?
	if (req.params.pid === undefined) {
		res.send(400, { error: "missing param 'pid'" });
		return next();
	}
	// is the pid param empty?
	if (req.params.pid.length === 0) {
		res.send(400, { error: "empty param 'pid'" });
		return next();
	}
	// does the pid refer to an existing process?
	if (!fs.existsSync("/proc/" + req.params.pid + "/status")) {
		res.send(400, { error: "pid '" + req.params.pid + '" does not exist or insufficent permissions to monitor'});
		return next();
	}

	// if we get here, then we have a valid PID to monitor

	this.logNotice("request to start monitoring memory of PID " + req.params.pid + " as alias " + req.params.alias);

	this.aliases[req.params.alias] = req.params.pid;

	res.send(200);
	return next();
};

ProcessMemory.prototype.onDeleteProcessMemory = function(req, res, next) {
	this.logNotice("request to stop monitoring memory of process alias " + req.params.alias);

	// is this PID being monitored?
	if (this.aliases[req.params.alias] === undefined) {
		this.logWarning("we've already stopped or was never monitoring memory of process alias" + req.params.alias);
		res.send(404);
		return next();
	}

	// stop monitoring
	this.aliases[req.params.alias] = undefined;

	// all done
	res.send(200);
	return req.next();
};

ProcessMemory.prototype.onTimer = function() {
	// iterate over each of the processes that we are monitoring
	_.each(this.aliases, function(pid, alias) {
		if (pid !== undefined) {
			this.reportUsage(pid, alias);
		}
	}, this);
};

ProcessMemory.prototype.reportUsage = function(pid, alias) {
	// who are we?
	var self = this;

	// what are we doing?
	// this.logInfo("report memory usage of PID " + pid + " as alias " + alias);

	// we can get the information we need from the process's status file
	var filename = "/proc/" + pid + "/status";

	// this will hold the raw contents of the status file
	var content = "";

	// this will hold the processed contents of the status file
	var status = {};

	async.series([
		// make sure the file exists
		function(callback) {
			// what are we doing?
			// self.logNotice("checking that '" + filename + "' exists");

			// does the path exist?
			fs.exists(filename, function(exists) {
				var err = null;
				if (!exists) {
					err = new Error("Cannot find file " + filename + " for process ID " + pid);
				}
				return callback(err);
			});
		},
		// read the contents of the file
		function(callback) {
			// what are we doing?
			// self.logNotice("reading contents of '" + filename + '"');

			// read the contents of the file
			fs.readFile(filename, "ascii", function(err, data) {
				if (!err) {
					content = data;
				}

				return callback(err);
			});
		},
		// extract the data that we want
		function(callback) {
			// self.logInfo("reached the status phase");

			// extract the values that we want
			_.each(content.split("\n"), function(line) {
				// peak size of the virtual memory of the process
				if (line.match(/^VmPeak/)) {
					status.vmTotalPeak = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current total size of the virtual memory of the process
				if (line.match(/^VmSize/)) {
					status.vmCurrentSize = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// total amount of 'locked' memory
				if (line.match(/^VmLck/)) {
					status.vmLocked = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// high-water mark for resident set size
				if (line.match(/^VmHWM/)) {
					status.vmRssPeak = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current resident set size
				if (line.match(/^VmRSS/)) {
					status.vmCurrentRss = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current data segment size
				if (line.match(/^VmData/)) {
					status.vmData = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current stack size
				if (line.match(/^VmStk/)) {
					status.vmStack = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current code pages size
				if (line.match(/^VmExe/)) {
					status.vmExe = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current library size
				if (line.match(/^VmLib/)) {
					status.vmLib = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current page table entries size
				if (line.match(/^VmPTE/)) {
					status.vmPTE = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
				// current swap usage
				if (line.match(/^VmSwap/)) {
					status.vmSwap = parseInt(line.split(/\s+/)[1], 10) * 1024;
				}
			}, this);

			return callback();
		}
	],
	// called when everything is done
	function(err) {
		if (err) {
			self.logError(err);
		}
		else {
			// at this point, we have data to send to statsd
			_.each(status, function(value, name) {
				self.appServer.statsManager.count(alias + "." + name, value);
			});
		}
	});
};