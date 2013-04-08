# README

SavageD is a realtime data-gathering daemon, initially written for Linux.  It was built to monitor software and servers that are under test, to support [storyplayer](https://datasift.github.io/storyplayer/).

* Gathers data in realtime (per-second resolution)
* Simple plugin architecture (plugins can be released as npm modules)
* REST-based interface for tests to enable & configure a plugin
* Pushes all data out to [statsd](https://github.com/etsy/statsd), to be consumed by graphite

The name _SavageD_ is a tribute to [Adam Savage](http://en.wikipedia.org/wiki/Adam_Savage) and his passion for collecting meaningful data points during experiments.