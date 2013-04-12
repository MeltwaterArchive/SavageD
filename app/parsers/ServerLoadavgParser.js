// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our built-in includes
var fs   = require("fs");

// our third-party includes
var _        = require("underscore");

function ServerLoadavgParser() {
	// does nothing
}
module.exports = ServerLoadavgParser;

ServerLoadavgParser.prototype.retrieveStats = function(filename) {
	// self-reference
	var self = this;

	// what are we doing?
	// this.logInfo("report server load averages");

	// this will hold the processed contents of the loadavg file
	var results = {};

	// does the path exist?
	if (!fs.existsSync(filename)) {
			throw new Error("Cannot find file " + filename);
	}

	// this will hold the raw contents of the status file
	var content = fs.readFileSync(filename, "ascii");

	// extract the data from the file
	var parsed = content.split(/([0-9.]+) ([0-9.]+) ([0-9.]+) ([0-9]+)\/([0-9]+).*/);

	// put the data into our results structure
	results['01min']     = parsed[1];
	results['05mins']    = parsed[2];
	results['15mins']    = parsed[3];
	results['executing'] = parsed[4];
	results['total']     = parsed[5];

	// at this point, we have data to be digested by the plugins
	return results;
};