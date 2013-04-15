// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");
var dsCommon = require("dsCommon");

// our parsers
var ServerStatParser  = require("../parsers/ServerStatParser");
var ProcessStatParser = require("../parsers/ProcessStatParser");

function ProcessCpu(appServer) {
	// call our parent constructor
	ProcessCpu.super_.call(this, appServer, {
		name: "ProcessCpu"
	});

	// our list of stats that we've seen before, for sampling purposes
	this.stats = {};

	// add ourselves to the list of available plugins
	appServer.processMonitor.addPlugin("cpu", this);
}
module.exports = ProcessCpu;
util.inherits(ProcessCpu, dsCommon.dsFeature);

ProcessCpu.prototype.getFilenamesToMonitor = function(pid) {
	return [
		{
			filename: "/proc/stat",
			parser: new ServerStatParser()
		},
		{
			filename: "/proc/" + pid + "/stat",
			parser: new ProcessStatParser()
		}
	];
};

ProcessCpu.prototype.reportUsage = function(pid, alias) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report cpu usage of PID " + pid + " as alias " + alias);

	// get the server CPU data first
	var serverCpuStats = self.appServer.getLatestDataFor("/proc/stat");

	// console.log(serverCpuStats.diff);

	// we can get the information we need from the process's status file
	var filename = "/proc/" + pid + "/stat";

	// get the process CPU data now
	var processStats = self.appServer.getLatestDataFor(filename);

	// we need to sample the data to work out CPU usage
	if (this.stats[filename] === undefined) {
		// remember the stats for next time
		this.stats[filename] = { raw: extractedCpuStats, diff: {}, percentages: {} };

		// can't do anything else yet
		return;
	}

	// how many total CPU jiffies have occurred, on a single CPU?
	var totalJiffies = 0;
	_.each(serverCpuStats.diff, function(cpu, cpuName) {
		if (cpuName !== 'cpu') {
			if (cpu.total > totalJiffies) {
				totalJiffies = cpu.total;
			}
		}
	});

	// extract just the CPU data that we want
	var extractedCpuStats = {
		user: processStats.utime,
		system: processStats.stime
	};

	// work out how much CPU the process has used this interval
	var processDiff = this.diffCpuStats(this.stats[filename].raw, extractedCpuStats);

	// convert the diff into a percentage
	var percentageStats = this.statsToPercent(processDiff, totalJiffies);

	// remember the stats for next time
	this.stats[filename] = { raw: extractedCpuStats, diff: processDiff, percentages: percentageStats };

	// at this point, we have data to send to statsd
	_.each(percentageStats, function(value, name) {
		self.appServer.statsManager.count(alias + ".cpu." + name, value);
	});
};

ProcessCpu.prototype.diffCpuStats = function(oldStats, newStats) {
	var results = {};

	// work out the number of jiffies that have occured
	// between our two sample points
	_.each(oldStats, function(value, fieldName) {
		results[fieldName] = newStats[fieldName] - value;
	});

	// all done
	return results;
};

ProcessCpu.prototype.statsToPercent = function(stats, totalJiffies) {
	var results = {};

	_.each(stats, function(value, fieldName) {
		// calculate the percentage, to 2 decimal places
		results[fieldName] = Math.round((parseFloat(value) / parseFloat(totalJiffies)) * 10000.0) / 100.0;
	});

	// all done
	return results;
};