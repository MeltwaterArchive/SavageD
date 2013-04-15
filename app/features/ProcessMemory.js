// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

// our parser
var ProcessStatusParser = require("../parsers/ProcessStatusParser");

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

ProcessMemory.prototype.getFilenamesToMonitor = function(pid) {
	return [
		{
			filename: "/proc/" + pid + "/status",
			parser:   new ProcessStatusParser()
		}
	];
};

ProcessMemory.prototype.reportUsage = function(pid, alias) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report memory usage of PID " + pid + " as alias " + alias);

	// we can get the information we need from the process's status file
	var filename = "/proc/" + pid + "/status";

	// get the parsed data
	var results = self.appServer.getLatestDataFor(filename);

	// at this point, we have data to send to statsd
	_.each(results, function(value, name) {
		if (name.match(/^Vm/)) {
			self.appServer.statsManager.count(alias + ".memory." + name, value);
		}
	});

	// all done
};