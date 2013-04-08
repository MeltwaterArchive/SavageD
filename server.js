// Copyright (c) 2013 Mediasift Ltd
// All rights reserved

// who we are
process.title = "SavageD daemon";

// simplify require statements
TOP_DIR          = process.cwd();
APP_DIR          = TOP_DIR + "/app";
APP_FEATURES_DIR = APP_DIR + "/features";

// our common modules
var dsCommon = require("dsCommon");

// our server
var AppServer = require(APP_DIR + "/AppServer.js");
var myAppServer = new AppServer();

// enable debugging for now
myAppServer.debug = true;

// add our user-specific config
myAppServer.configManager.addConfigFile('config.js');

// load the config ... this will activate the daemon
myAppServer.configManager.loadAllConfig();

// at this point, the daemon will run forever