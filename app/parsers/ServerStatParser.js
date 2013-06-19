// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");
var util = require("util");

// our third-party includes
var _        = require("underscore");

// a parser that we are going to rely on :)
var ServerCpuinfoParser = require("./ServerCpuinfoParser");

function ServerStatParser(appServer) {
	// remember the appServer
	this.appServer = appServer;

	// our absolute CPU stats
	this.cpuStats = {};

	// how many CPUs do we have in this server?
	//
	// this doesn't support hotswapping CPUs, but if you do that,
	// then the stats are all messed up anyways
	this.cpuCount = this.getNumberOfCpus();
}
module.exports = ServerStatParser;

ServerStatParser.prototype.retrieveStats = function(filename) {
	// get the current CPU stats
	var stats = this.retrieveLatestStats(filename);

	// is this the first time?
	if (this.cpuStats.cpu === undefined) {
		// special case - first time we've grabbed the stats
		this.cpuStats = stats;

		// nothing to report this time around, as we have no CPU stats
		// to compare against
		// this.logInfo("No CPU stats to diff yet");
		return { raw: {}, diff: {}, percentages: {} };
	}

	// if we get here, then we can diff the stats
	var diff = this.diffCpuStats(this.cpuStats, stats);

	// convert the numbers to percentages
	var percentages = this.statsToPercent(diff);

	// remember these stats for next time
	this.cpuStats = stats;

	// all done - return the results
	return { raw: this.cpuStats, diff: diff, percentages: percentages };
};

ServerStatParser.prototype.retrieveLatestStats = function(filename) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report server cpu usage");

	// this will hold the processed contents of the stat file
	var results = {};

	// does the path exist?
	if (!fs.existsSync(filename)) {
		throw new Error("Cannot find file " + filename);
	}

	// this will hold the raw contents of the status file
	var content = fs.readFileSync(filename, "ascii");
	var parsed = null;

	_.each(content.split("\n"), function(line) {
		// peak size of the virtual memory of the process
		if (line.match(/^cpu[0-9]{0,3} /)) {
			// get the individual fields
			// parsed = line.split(/^([a-z][0-9]+)[ ]{1,4}([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+).*/);
			parsed = line.split(/\s+/);

			// break them out
			results[parsed[0]] = {
				user:       parseInt(parsed[1], 10),
				nice:       parseInt(parsed[2], 10),
				system:     parseInt(parsed[3], 10),
				idle:       parseInt(parsed[4], 10),
				iowait:     parseInt(parsed[5], 10),
				irq:        parseInt(parsed[6], 10),
				softirq:    parseInt(parsed[7], 10),
				steal:      parseInt(parsed[8], 10)
			};

			if (parsed[9] !== undefined) {
				results[parsed[0]].guest_nice = parseInt(parsed[9], 10);
			}

			if (parsed[10] !== undefined) {
				results[parsed[0]].guest_nice = parseInt(parsed[10], 10);
			}

			// we need a total, to make any sense of them
			results[parsed[0]].total = _.reduce(results[parsed[0]], function(previousValue, currentValue, index, array) { return previousValue + currentValue; }, 0);
		}
	});

	// all done
	return results;
};

ServerStatParser.prototype.diffCpuStats = function(oldStats, newStats) {
	var results = {};

	// work out the number of jiffies that have occured
	// between our two sample points
	_.each(oldStats, function(cpu, cpuName) {
		results[cpuName] = {};
		_.each(cpu, function(value, fieldName) {
			results[cpuName][fieldName] = (newStats[cpuName][fieldName] - value);
		});
	});

	// all done
	return results;
};

ServerStatParser.prototype.statsToPercent = function(stats) {
	// self-reference
	var self = this;

	// this will hold our results
	var results = {};

	// use that 'total' field we created for ourselves to convert
	// the jiffies into a percentage for each CPU
	_.each(stats, function(cpu, cpuName) {
		results[cpuName] = {};

		// are we looking at per-cpu stats?
		var multiplier = 1.0;
		if (cpuName === "cpu") {
			// the 'total' should be in terms of the number of CPUs
			// on the box
			multiplier = parseFloat(self.cpuCount);
		}

		_.each(cpu, function(value, fieldName) {
			// calculate the percentage, to 2 decimal places
			results[cpuName][fieldName] = Math.round((parseFloat(value) / parseFloat(stats[cpuName].total)) * 10000.0) / 100.0 * multiplier;
		});
	});

	// all done
	return results;
};

ServerStatParser.prototype.getNumberOfCpus = function() {
	// get the CPU info stats
	var parser = new ServerCpuinfoParser();
	var stats  = parser.retrieveStats("/proc/cpuinfo");

	// how many CPUs are there?
	return stats.length;
};