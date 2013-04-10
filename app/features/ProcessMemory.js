// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

function ProcessMemory(appServer) {
	// call our parent constructor
	ProcessMemory.super_.call(this, appServer, {
		name: "ProcessMemory"
	});

	// add ourselves to the list of available plugins
	appServer.processMonitor.addPlugin("memory", this);
}
module.exports = ProcessMemory;
util.inherits(ProcessMemory, dsCommon.dsFeature);

ProcessMemory.prototype.canMonitorPid = function(pid) {
	// does the pid refer to an existing process?
	if (!fs.existsSync("/proc/" + pid + "/status")) {
		return false;
	}

	return true;
};

ProcessMemory.prototype.reportUsage = function(pid, alias) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report memory usage of PID " + pid + " as alias " + alias);

	// we can get the information we need from the process's status file
	var filename = "/proc/" + pid + "/status";

	// this will hold the raw contents of the status file
	var content = "";

	// this will hold the processed contents of the status file
	var status = {};

	// does the path exist?
	if (!fs.existsSync(filename)) {
			throw new Error("Cannot find file " + filename + " for process ID " + pid);
	}

	content = fs.readFileSync(filename, "ascii");

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

	// at this point, we have data to send to statsd
	_.each(status, function(value, name) {
		self.appServer.statsManager.count(alias + "." + name, value);
	});
};