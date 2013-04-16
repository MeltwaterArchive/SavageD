// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs = require("fs");

// our third-party includes
var _ = require("underscore");

function ProcessStatusParser() {
	// does nothing
}
module.exports = ProcessStatusParser;

ProcessStatusParser.prototype.retrieveStats = function(filename) {
	// self-reference
	var self = this;

	// this will hold the processed contents of the file
	var results = {};

	// does the path exist
	if (!fs.existsSync(filename)) {
		throw new Error("Cannot find file " + filename);
	}

	// this will hold the raw contents of the status file
	var content = fs.readFileSync(filename, "ascii");

	// put the raw contents of the file into our data structure
	_.each(content.trim().split("\n"), function(line){
		var parsed = line.match(/^([A-Za-z0-9_]+):\s+(.*)$/);

		// did the line parse?
		if (!parsed) {
			// no - we want to know why
			console.log(line);
		}
		else {
			results[parsed[1]] = parsed[2];
		}

	});

	// we're going to be doing a bit of line parsing
	var parsed = [];

	// handle the individual lines that need further finessing

	// Thread group ID
	results.Tgid = parseInt(results.Tgid, 10);

	// process ID
	results.Pid = parseInt(results.Pid, 10);

	// parent process ID
	results.PPid = parseInt(results.PPid, 10);

	// tracer process ID
	results.TracerPid = parseInt(results.TracerPid, 10);

	// user ID data
	parsed = results.Uid.split(/\t/);
	results.real_uid = parseInt(parsed[0], 10);
	results.effective_uid = parseInt(parsed[1], 10);
	results.saved_set_uid = parseInt(parsed[2], 10);
	results.file_system_uid = parseInt(parsed[3], 10);

	// group ID data
	parsed = results.Gid.split(/\t/);
	results.real_gid = parseInt(parsed[0], 10);
	results.effective_gid = parseInt(parsed[1], 10);
	results.saved_set_gid = parseInt(parsed[2], 10);
	results.file_system_gid = parseInt(parsed[3], 10);

	// file descriptor slots
	results.FDSize = parseInt(results.FDSize, 10);

	// groups list
	if (results.Groups.trim().length > 0) {
		results.groups_list = results.Groups.trim().split(/\s/);
	}
	else {
		results.groups_list = [];
	}

	// memory
	_.each(["VmPeak", "VmSize", "VmLck", "VmPin", "VmHWM", "VmRSS", "VmData", "VmStk", "VmExe", "VmLib", "VmPTE", "VmSwap"], function(name) {
		// not every line appears in every kernel
		if (results[name] !== undefined) {
			var parsed = results[name].split(/\s/);
			results[name] = parseInt(parsed[0], 10) * 1024;
		}
	});

	// threads
	results.Threads = parseInt(results.Threads, 10);

	// signals queued
	parsed = results.SigQ.split('/');
	results.signals_queued = parseInt(parsed[0], 10);
	results.max_signal_queue = parseInt(parsed[1], 10);

	// context switches
	if (results.voluntary_ctxt_switches !== undefined) {
		results.voluntary_ctxt_switches = parseInt(results.voluntary_ctxt_switches, 10);
	}

	if (results.nonvoluntary_ctxt_switches !== undefined) {
		results.nonvoluntary_ctxt_switches = parseInt(results.nonvoluntary_ctxt_switches, 10);
	}

	// all done
	return results;
};