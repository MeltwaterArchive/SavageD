// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

var fs = require("fs");
var _ = require("underscore");

function PidStatParser()
{
	// does nothing
}
module.exports = PidStatParser;

PidStatParser.prototype.retrieveStats = function(filename) {
	// self-reference
	var self = this;

	// does the file exist?
	if (!fs.existsSync(filename)) {
		throw new Error("cannot find file " + filename + " for parsing");
	}

	// this will hold the processed contents of the stat file
	var results = {};

	// this will hold the raw contents of the stat file
	var content = fs.readFileSync(filename, "ascii");

	// let's split up the file
	var parsed = content.split(/\s/);

	// now we have to convert the split data into our results
	//
	// this is made slightly more complicated because the 'tcomm' field
	// can contain spaces

	// field 1: process id
	results.pid = parsed.shift();

	// field 2: filename of the executable
	results.tcomm = parsed.shift();
	while (results.tcomm.charAt(results.tcomm.length - 1) !== ')') {
		results.tcomm = results.tcomm + " " + parsed.shift();
	}

	// the remaining fields can just be left-shifted
	var fieldNames = [
		"state",
		"ppid",
		"pgrp",
		"sid",
		"tty_nr",
		"tty_pgrp",
		"flags",
		"min_flt",
		"cmin_flt",
		"maj_flt",
		"cmaj_flt",
		"utime",
		"stime",
		"cutime",
		"cstime",
		"priority",
		"nice",
		"num_threads",
		"it_real_value",
		"start_time",
		"vsize",
		"rss",
		"rsslim",
		"start_code",
		"end_code",
		"start_stack",
		"esp",
		"eip",
		"pending",
		"blocked",
		"sigign",
		"sigcatch",
		"wchan",
		"placeholder1",
		"placeholder2",
		"exit_signal",
		"task_cpu",
		"rt_priority",
		"policy",
		"blkio_ticks",
		"gtime",
		"cgtime",
		"start_data",
		"end_data",
		"start_brk",
		"arg_start",
		"arg_end",
		"env_start",
		"env_end",
		"exit_code"
	];

	_.each(fieldNames, function(fieldName) {
		if (parsed.length > 0) {
			results[fieldName] = parsed.shift();
		}
		else {
			results[fieldName] = null;
		}
	});

	// all done
	return results;
};