// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

// our parser
var ProcessStatParser = require("../parsers/ProcessStatParser");

function ProcessThreads(appServer) {
	// call our parent constructor
	ProcessThreads.super_.call(this, appServer, {
		name: "ProcessThreads"
	});

	// add ourselves to the list of available plugins
	appServer.processMonitor.addPlugin("threads", this);
}
module.exports = ProcessThreads;
util.inherits(ProcessThreads, dsCommon.dsFeature);

ProcessThreads.prototype.getFilenamesToMonitor = function(pid) {
	return [
		{
			filename: "/proc/" + pid + "/stat",
			parser:   new ProcessStatParser()
		}
	];
};

ProcessThreads.prototype.reportUsage = function(pid, alias) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report memory usage of PID " + pid + " as alias " + alias);

	// we can get the information we need from the process's status file
	var filename = "/proc/" + pid + "/stat";

	// get the process CPU data now
	var processStats = self.appServer.getLatestDataFor(filename);

	// at this point, we have data to send to statsd
	self.appServer.statsManager.count(alias + ".process.threads", processStats.num_threads);

	// all done
};