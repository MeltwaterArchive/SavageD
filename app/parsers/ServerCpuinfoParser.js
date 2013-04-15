// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

var fs = require("fs");
var _ = require("underscore");

function ServerCpuinfoParser()
{
	// does nothing
}
module.exports = ServerCpuinfoParser;

ServerCpuinfoParser.prototype.retrieveStats = function(filename) {
	// self-reference
	var self = this;

	// does the file exist?
	if (!fs.existsSync(filename)) {
		throw new Error("cannot find file " + filename + " for parsing");
	}

	// this will hold the processed contents of the stat file
	var results = [];

	// this will hold the raw contents of the stat file
	var content = fs.readFileSync(filename, "ascii");

	// which processor are we going to add data about?
	var processor = 0;
	results[0] = {};

	// now we have to convert the split data into our results
	_.each(content.split("\n"), function(line) {
		// console.log(line);

		// break the line up
		var parsed = line.match(/^([^:]+):\s*(.*)$/);

		// console.log(parsed);

		if (parsed && parsed.length > 2) {
			var fieldName = parsed[1].trim();
			var rawValue  = parsed[2].trim();

			// are we switching processors?
			if (fieldName === "processor") {
				// yes, we are
				processor = parseInt(rawValue, 10);
				results[processor] = {};
			}

			// add the data to the results
			results[processor][fieldName] = rawValue;
		}

	});

	// all done
	return results;
};