// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

function ServerLoadavg(appServer) {
	// call our parent constructor
	ServerLoadavg.super_.call(this, appServer, {
		name: "ServerLoadavg"
	});

	// add ourselves to the list of available plugins
	appServer.serverMonitor.addPlugin("loadavg", this);
}
module.exports = ServerLoadavg;
util.inherits(ServerLoadavg, dsCommon.dsFeature);

ServerLoadavg.prototype.canMonitorServer = function() {
	// can we see the /proc/loadavg file?
	if (!fs.existsSync("/proc/loadavg")) {
		return false;
	}

	return true;
};

ServerLoadavg.prototype.reportUsage = function(alias) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report server load averages");

	// we can get the information we need from the server's loadavg file
	var filename = "/proc/loadavg";

	// this will hold the processed contents of the loadavg file
	var results = {};

	// does the path exist?
	if (!fs.existsSync(filename)) {
			throw new Error("Cannot find file " + filename);
	}

	// this will hold the raw contents of the status file
	var content = fs.readFileSync(filename, "ascii");

	// extract the data from the file
	var parsed = content.split(/([0-9.]+) ([0-9.]+) ([0-9.]+) ([0-9]+)\/([0-9]+).*/);

	results['01min']     = parsed[1];
	results['05mins']    = parsed[2];
	results['15mins']    = parsed[3];
	results['executing'] = parsed[4];
	results['total']     = parsed[5];

	// at this point, we have data to send to statsd
	_.each(results, function(value, name) {
		self.appServer.statsManager.count(alias + ".loadavg." + name, value);
	});
};