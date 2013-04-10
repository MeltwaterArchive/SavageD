// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our includes
var util = require("util");
var dsCommon = require("dsCommon");
var ProcessMonitor = require("./ProcessMonitor");

// our main app server
function AppServer() {
	// call our parent constructor
	AppServer.super_.call(this, {
		name: "proc2statsd"
	});

	// our framework for monitoring individual processes
	this.processMonitor = new ProcessMonitor(this);
}
module.exports = AppServer;
util.inherits(AppServer, dsCommon.dsAppServer);