// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

// our parser
var ServerStatParser = require("../parsers/ServerStatParser");

function ServerCpu(appServer) {
	// call our parent constructor
	ServerCpu.super_.call(this, appServer, {
		name: "ServerCpu"
	});

	// this is the file that we want to monitor
	this.filename = "/proc/stat";

	// tell the appServer to start monitoring the stat file
	appServer.startMonitoring(this.filename, new ServerStatParser());

	// add ourselves to the list of available plugins
	appServer.serverMonitor.addPlugin("cpu", this);
}
module.exports = ServerCpu;
util.inherits(ServerCpu, dsCommon.dsFeature);

ServerCpu.prototype.getFilenameToMonitor = function() {
	// can we see the /proc/stat file?
	if (!fs.existsSync(this.filename)) {
		return null;
	}

	return this.filename;
};

ServerCpu.prototype.reportUsage = function(alias) {
	// self-reference
	var self = this;

	// get the parsed stats
	var stats = self.appServer.getLatestDataFor(self.filename);

	// do we have anything to report?
	//
	// the CPU percentages are calculated by sampling; we need at least
	// two data points to achieve this
	if (stats.percentages.length === 0) {
		// nothing to report
		return;
	}

	// at this point, we have data to send to statsd
	_.each(stats.percentages, function(cpu, cpuName) {
		_.each(cpu, function(value, fieldName) {
			self.appServer.statsManager.count(alias + ".cpu." + cpuName + "." + fieldName, value);
		});
	});
};