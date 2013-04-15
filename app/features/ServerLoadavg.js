// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

// our parser
var ServerLoadavgParser = require("../parsers/ServerLoadavgParser");

function ServerLoadavg(appServer) {
	// call our parent constructor
	ServerLoadavg.super_.call(this, appServer, {
		name: "ServerLoadavg"
	});

	// this is the file that we want to monitor
	this.filename = "/proc/loadavg";

	// add ourselves to the list of available plugins
	appServer.serverMonitor.addPlugin("loadavg", this);
}
module.exports = ServerLoadavg;
util.inherits(ServerLoadavg, dsCommon.dsFeature);

ServerLoadavg.prototype.getFilenameToMonitor = function() {
	return this.filename;
};

ServerLoadavg.prototype.getFileParser = function() {
	return new ServerLoadavgParser();
};

ServerLoadavg.prototype.reportUsage = function(alias) {
	// self-reference
	var self = this;

	// get the parsed data
	var results = self.appServer.getLatestDataFor(self.filename);

	// at this point, we have data to send to statsd
	_.each(results, function(value, name) {
		self.appServer.statsManager.count(alias + ".loadavg." + name, value);
	});
};