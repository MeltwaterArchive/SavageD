// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var async    = require("async");
var dsCommon = require("dsCommon");

function ServerMonitor(appServer) {
	// call our parent constructor
	ServerMonitor.super_.call(this, appServer, {
		name: "ServerMonitor"
	});

	// our routes
	appServer.httpManager.routes.ServerMonitor = {
		"get": [
			{
				route: "/server/plugins",
				handler: this.onGetPluginsList.bind(this)
			},
			{
				route: "/server/:alias/:plugin",
				handler: this.onGetServerPlugin.bind(this)
			}
		],
		"post": [
			{
				route: "/server/:alias/:plugin",
				handler: this.onPostServerPlugin.bind(this)
			}
		],
		"del": [
			{
				route: "/server/:alias/:plugin",
				handler: this.onDeleteServerPlugin.bind(this)
			}
		]
	};

	// our list of things to monitor
	this.aliases = {};

	// our list of plugins to use
	this.plugins = {};

	// listen for timer events
}
module.exports = ServerMonitor;
util.inherits(ServerMonitor, dsCommon.dsFeature);

// ========================================================================
//
// plugin list management
//
// ------------------------------------------------------------------------

ServerMonitor.prototype.addPlugin = function(name, plugin) {
	this.logInfo("Adding plugin '" + name+ "'");
	this.plugins[name] = plugin;
};

ServerMonitor.prototype.onGetPluginsList = function(req, res, next) {
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
// Plugin management
//
// ------------------------------------------------------------------------

ServerMonitor.prototype.onGetServerPlugin = function(req, res, next) {
	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "no such alias" });
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

ServerMonitor.prototype.onPostServerPlugin = function(req, res, next) {
	// self-reference
	var self = this;

	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		this.aliases[req.params.alias] = { plugins: {} };
	}

	// does this plugin exist
	if (this.plugins[req.params.plugin] === undefined) {
		res.send(404, { error: "unknown plugin" });
		return next();
	}

	// can this plugin monitor our PID?
	var filenames = this.plugins[req.params.plugin].getFilenamesToMonitor();
	if (!filenames || filenames.length === 0) {
		res.send(400, { error: "insufficient permissions to monitor"} );
		return next();
	}

	// tell the appServer to start monitoring the file(s) that the plugin needs
	_.each(filenames, function(fileDetails) {
		self.appServer.startMonitoring(fileDetails.filename, fileDetails.parser);
	});

	// remember that this plugin is now live
	this.aliases[req.params.alias].plugins[req.params.plugin] = this.plugins[req.params.plugin];

	res.send(200, { monitoring: true });
	return next();
};

ServerMonitor.prototype.onDeleteServerPlugin = function(req, res, next) {
	// self-reference
	var self = this;

	// does this alias exist?
	if (this.aliases[req.params.alias] === undefined) {
		res.send(404, { error: "unknown alias" });
		return next();
	}

	// are we using this plugin to monitor this server?
	if (this.aliases[req.params.alias].plugins[req.params.plugin] === undefined) {
		// no, we are not
		res.send(404, { error: "not monitoring"} );
		return next();
	}

	// the plugin that we're going to stop
	var plugin = this.aliases[req.params.alias].plugins[req.params.plugin];

	// stop monitoring
	this.aliases[req.params.alias].plugins[req.params.plugin] = undefined;

	// stop monitoring the underlying file too
	var filenames = plugin.getFilenamesToMonitor();
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

ServerMonitor.prototype.onTimer = function() {
	// iterate over each of the processes that we are monitoring
	_.each(this.aliases, function(details, alias) {
		if (details.plugins !== undefined) {
			_.each(details.plugins, function(plugin) {
				if (plugin !== undefined) {
					plugin.reportUsage.call(plugin, alias);
				}
			});
		}
	}, this);
};
