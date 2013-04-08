// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// our includes
var util = require("util");
var dsCommon = require("dsCommon");

// our main app server
function AppServer() {
	// call our parent constructor
	AppServer.super_.call(this, {
		name: "proc2statsd"
	});
}
module.exports = AppServer;
util.inherits(AppServer, dsCommon.dsAppServer);