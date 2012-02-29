/**
 * Usage run_bots.js --url http://servername/path/to/swarmfight/ --api-keys 1h2g3j2h13g --color red
 * 
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */

var parseCommandLineOptions = function() {
    var filenames = [];
    var options = {};
    var next_is_option = false;
    var next_option_key = null;
    var everything_is_file = false;

    for (var i = 2; i < process.argv.length; i++) {
        var parameter = process.argv[i];
        if (!everything_is_file) {
            if (next_is_option) {
                options[next_option_key] = parameter;
                next_is_option = false;
            } else {
                if (parameter === '--') {
                    everything_is_file = true;
                } else {
                    if (parameter.substr(0, 2) === '--') {
                        next_is_option = true;
                        next_option_key = parameter.substr(2);
                    } else {
                        filenames.push(parameter);
                    }
                }
            }
        } else {
            filenames.push(parameter);
        }
    }

    return options;
};

var commandline_options = parseCommandLineOptions();

var api_keys = commandline_options['api-keys'].split(',');
var HttpClient = require("./NodeJsHttpClient").HttpClient;
var SwarmFightBot = require("./SwarmFightBot").SwarmFightBot;

api_keys.forEach(function(api_key, i)
{
    setTimeout(function() {
        new SwarmFightBot({
            "client": new HttpClient({"base_url": commandline_options.url}),
            "color": commandline_options.color,
            "number": i + 1,
            "api_key": api_key
        }).run();
    }, i * 100);
});

