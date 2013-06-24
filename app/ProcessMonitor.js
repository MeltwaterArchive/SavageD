// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var async    = require("async");
var dsCommon = require("dsCommon");

function ProcessMonitor(appServer) {
	// call our parent constructor
	ProcessMonitor.super_.call(this, appServer, {
		name: "ProcessMonitor"
	});

	// our routes
	appServer.httpManager.routes.ProcessMonitor = {
		"get": [
			{
				route: "/processmonitor/plugins",
				handler: this.onGetPluginsList.bind(this)
			},
			{
				route: "/process/:alias/pid",
				handler: this.onGetProcessPid.bind(this)
			},
			{
				route: "/process/:alias/:plugin",
				handler: this.onGetProcessPlugin.bind(this)
			}
		],
		"post": [
			{
				route: "/process/:alias/pid",
				handler: this.onPostProcessPid.bind(this)
			},
			{
				route: "/process/:alias/:plugin",
				handler: this.onPostProcessPlugin.bind(this)
			}
		],
		"del": [
			{
				route: "/process/:alias/pid",
				handler: this.onDeleteProcessPid.bind(this)
			},
			{
				route: "/process/:alias/:plugin",
				handler: this.onDeleteProcessPlugin.bind(this)
			}
		]
	};

	// our processes to monitor
	this.aliases = {};

	// our list of plugins to use
	this.plugins = {};
}
module.exports = ProcessMonitor;
util.inherits(ProcessMonitor, dsCommon.dsFeature);

// ========================================================================
//
// plugin list management
//
// ------------------------------------------------------------------------

ProcessMonitor.prototype.addPlugin = function(name, plugin) {
	this.logInfo("Adding plugin '" + name+ "'");
	this.plugins[name] = plugin;
};

ProcessMonitor.prototype.onGetPluginsList = function(req, res, next) {
	var result = [];

	_.each(this.plugins, function(plugin, name) {
		result.push(name);
	});

	// sort the list
	result.sort();

	// return the results
	res.send(200, { plugins: result });
	return next();
};

// ========================================================================
//
// PID management
//
// ------------------------------------------------------------------------

ProcessMonitor.prototype.hasProcessPid = function(alias) {
	// do we know about this alias?
	if (this.aliases[alias] === undefined) {
		return false;
	}

	if (this.aliases[alias].pid === undefined) {
		return false;
	}

	return true;
};

ProcessMonitor.prototype.onGetProcessPid = function(req, res, next) {
	// what are we doing?
	this.logInfo("HTTP GET /process/" + req.params.alias + "/pid");

	// do we have this process currently in our list?
	if (!this.hasProcessPid(req.params.alias)) {
		res.send(404, { error: "no such alias"});
		return next();
	}

	// if we get here, we are monitoring this feature
	res.send(200, { pid: this.aliases[req.params.alias].pid });
	return next();
};

ProcessMonitor.prototype.onPostProcessPid = function(req, res, next) {
	// what are we doing?
	this.logInfo("HTTP POST /process/" + req.params.alias + "/" + req.params.pid);

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
		res.send(400, { error: "pid '" + req.params.pid + "' does not exist or insufficent permissions to monitor"});
		return next();
	}

	// if we get here, then we have a valid PID to monitor
	if (this.aliases[req.params.alias] === undefined) {
		this.aliases[req.params.alias] = { pid: req.params.pid };
	}
	else {
		this.aliases[req.params.alias].pid = req.params.pid;
	}

	// make sure we have the plugins structure too
	if (this.aliases[req.params.alias].plugins === undefined) {
		this.aliases[req.params.alias].plugins = {};
	}

	res.send(200, { pid: req.params.pid });
	return next();
};

ProcessMonitor.prototype.onDeleteProcessPid = function(req, res, next) {
	// what are we doing?
	this.logInfo("HTTP DELETE /process/" + req.params.alias + "/pid");

	// is this PID being monitored?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "no such alias" });
		return next();
	}

	// stop monitoring
	this.aliases[req.params.alias].pid = undefined;

	// all done
	res.send(200, { monitoring: false });
	return req.next();
};

// ========================================================================
//
// Plugin management
//
// ------------------------------------------------------------------------

ProcessMonitor.prototype.onGetProcessPlugin = function(req, res, next) {
	// what are we doing?
	this.logInfo("HTTP GET /process/" + req.params.alias + "/" + req.params.plugin);

	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "unknown process; you must set the pid first" });
		return next();
	}

	// are we monitoring this plugin?
	if (this.aliases[req.params.alias].plugins[req.params.plugin] === undefined) {
		res.send(404, { error: "not monitoring"} );
		return next();
	}

	// yes, we are
	res.send(200, { monitoring: true} );
};

ProcessMonitor.prototype.onPostProcessPlugin = function(req, res, next) {
	// self-reference
	var self = this;

	// what are we doing?
	this.logInfo("HTTP POST /process/" + req.params.alias + "/" + req.params.plugin);

	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "unknown process; you must set the pid first via the /process/" + req.params.alias + "/pid API endpoint" });
		return next();
	}

	// does this plugin exist
	if (this.plugins[req.params.plugin] === undefined) {
		res.send(404, { error: "unknown plugin" });
		return next();
	}

	// shorthand
	var pid = this.aliases[req.params.alias].pid;

	// can this plugin monitor our PID?
	var filenames = this.plugins[req.params.plugin].getFilenamesToMonitor(pid);
	if (!filenames || filenames.length === 0) {
		res.send(400, { error: "pid 'pid' does not exist or insufficient permissions to monitor"} );
		return next();
	}

	// tell the appServer to start monitoring the file(s) that the plugin needs
	_.each(filenames, function(fileDetails) {
		self.appServer.startMonitoring(fileDetails.filename, fileDetails.parser);
	});

	// remember that this plugin is now live
	if (this.aliases[req.params.alias].plugins === undefined) {
		this.aliases[req.params.alias].plugins = {};
	}
	this.aliases[req.params.alias].plugins[req.params.plugin] = this.plugins[req.params.plugin];

	res.send(200, { monitoring: true });
	return next();
};

ProcessMonitor.prototype.onDeleteProcessPlugin = function(req, res, next) {
	// self-reference
	var self = this;

	// what are we doing?
	this.logInfo("HTTP DELETE /process/" + req.params.alias + "/" + req.params.plugin);

	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "unknown process" });
		return next();
	}

	// are we using this plugin to monitor this process?
	if (this.aliases[req.params.alias].plugins[req.params.plugin] === undefined) {
		// no, we are not
		res.send(404, { error: "not monitoring"} );
		return next();
	}

	// shorthand
	var pid = this.aliases[req.params.alias].pid;

	// stop monitoring
	this.aliases[req.params.alias].plugins[req.params.plugin] = undefined;

	// stop monitoring the underlying file(s) too
	var filenames = plugin.getFilenamesToMonitor(pid);
	_.each(filenames, function(fileDetails) {
		self.appServer.stopMonitoring(fileDetails.filename);
	});

	// all done
	res.send(200, { monitoring: false });
	return req.next();
};

// ========================================================================
//
// Timer support
//
// ------------------------------------------------------------------------

ProcessMonitor.prototype.onTimer = function() {
	// iterate over each of the processes that we are monitoring
	_.each(this.aliases, function(details, alias) {
		if (details.pid !== undefined && details.plugins !== undefined) {
			_.each(details.plugins, function(plugin) {
				plugin.reportUsage(details.pid, alias);
			});
		}
	}, this);
};
