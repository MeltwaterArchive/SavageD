// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our includes
var util = require("util");
var _ = require("underscore");
var dsCommon = require("dsCommon");
var ProcessMonitor = require("./ProcessMonitor");
var ServerMonitor  = require("./ServerMonitor");

// our main app server
//
// as well as being our 'God' object, it's also responsible for handling
// the monitoring of individual /proc files, to make sure that we do not
// end up monitoring the same file twice or more!
function AppServer() {
	// call our parent constructor
	AppServer.super_.call(this, {
		name: "proc2statsd"
	});

	this.filesToMonitor = {};

	// our framework for monitoring the server
	this.serverMonitor = new ServerMonitor(this);

	// our framework for monitoring individual processes
	this.processMonitor = new ProcessMonitor(this);

	// listen to timers
	this.timer = new dsCommon.dsTimer(this.timers.every1sec, this.onTimer.bind(this));
}
module.exports = AppServer;
util.inherits(AppServer, dsCommon.dsAppServer);

// ========================================================================
//
// API for monitoring individual /proc files
//
// This API is for use by our Server* and Process* plugins
//
// ------------------------------------------------------------------------

AppServer.prototype.isMonitoring = function(filename) {
	if (this.filesToMonitor[filename] === undefined) {
		return false;
	}

	return true;
};

AppServer.prototype.startMonitoring = function(filename, parser) {
	// special case - start monitoring this file for the first time
	if (!this.isMonitoring(filename)) {
		this.filesToMonitor[filename] = {
			parser: parser,
			data: {},
			refCount: 1
		};

		// initial structure created, all done :)
		return;
	}

	// increment the reference count
	this.filesToMonitor[filename].refCount++;
};

AppServer.prototype.stopMonitoring = function(filename) {
	if (!this.isMonitoring(filename)) {
		util.log("REFCOUNT error: attempt to stop monitoring unmonitored file " + filename);
		return;
	}

	// decrement the reference count
	this.filesToMonitor[filename].refCount--;

	// is anyone still looking at this file?
	if (this.filesToMonitor[filename].refCount < 1) {
		// no-one cares any more
		this.filesToMonitor[filename] = undefined;
	}
};

AppServer.prototype.getLatestDataFor = function(filename) {
	if (!this.isMonitoring(filename)) {
		throw new Error("ERROR: request for data for an unmonitored file " + filename);
	}

	// return the data
	return this.filesToMonitor[filename].data;
};

// ========================================================================
//
// DO THE MONITORING
//
// ------------------------------------------------------------------------

AppServer.prototype.onTimer = function() {
	// self-reference
	var self = this;

	// do we have any files to monitor?
	if (this.filesToMonitor.length === 0) {
		return;
	}

	// console.log(this.filesToMonitor);

	// get the latest data from all of the files that we are tracking
	//
	// we handle this centrally to ensure that every plugin sees a
	// consistent snapshot of the state of the host
	_.each(this.filesToMonitor, function(details, filename) {
		if (details !== undefined) {
			details.data = details.parser.retrieveStats(filename);
		}
	});

	// call all of our server monitoring plugins
	this.serverMonitor.onTimer();

	// call all of our process monitoring plugins
	this.processMonitor.onTimer();

	// all done
};