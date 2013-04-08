// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our includes
var util = require("util");
var dsCommon = require("dsCommon");

function ProcessMemory(appServer) {
	// call our parent constructor
	ProcessMemory.super_.call(this, appServer, {
		name: "ProcessMemory"
	});

	// our routes
	appServer.httpManager.routes.ProcessMemory = {
		"put": [
			{
				route: "/process/:pid/memory",
				handler: this.onGetProcessMemory.bind(this)
			}
		]
	};

	// our processes to monitor
	this.pids = [];

	// listen for timer events
	appServer.on('every1sec', this.onTimer.bind(this));
}
module.exports = ProcessMemory;
util.inherits(ProcessMemory, dsCommon.dsFeature);

ProcessMemory.prototype.onGetProcessMemory = function(req, res, next) {
	this.logNotice("onGetProcessMemory() successfully called");

	res.send(200);
	return next();
};

ProcessMemory.prototype.onTimer = function() {
	// get the memory information we need
};