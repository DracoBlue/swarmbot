/**
 * Usage swarmfight-bot.js --url http://servername/path/to/swarmfight/ --api-keys 1h2g3j2h13g --color red
 * 
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */

HttpClient = function(options)
{
    this.options = options;
    this.options.base_url = this.options.base_url || null;
    this.cookies = null;
    
    this.initializeNodeJsRequests();
};

HttpClient.prototype.initializeNodeJsRequests = function()
{
    this.http_module = require('http');
    this.querystring_module = require('querystring');
    this.url_module = require('url');
    
    this.rawRequest = this.rawNodeJsRequest;
};

HttpClient.prototype.rawNodeJsRequest = function(method, url, params, cb)
{
    var that = this;
    var raw_body = this.querystring_module.stringify(params);

    var url_parts = this.url_module.parse((this.options.base_url || '') + url);
    
    var options = {
        "host": url_parts.host,
        "port": parseInt(url_parts.port || (url_parts.protocol === 'https' ? 443 : 80), 10),
        "path": url_parts.path,
        "headers": {
            'Content-Length': raw_body.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        "method": method
    };

    if (this.cookies)
    {
        options.headers['Cookie'] = that.cookies;
    }

    var req = this.http_module.request(options, function(res)
    {
        res.setEncoding('utf8');
        var response = [];
        res.on('data', function(chunk)
        {
            response.push(chunk);
        });

        res.on('end', function()
        {
            var headers = res.headers;
            if (headers['set-cookie'])
            {
                that.cookies = headers['set-cookie'].join('').split(';')[0];
            }
            
            cb(response.join(''));
        });
    });
    req.write(raw_body);
    req.end();    
};

HttpClient.prototype.get = function(url, params, cb)
{
    this.rawRequest('GET', url, params, cb);
};

HttpClient.prototype.post = function(url, params, cb)
{
    this.rawRequest('POST', url, params, cb);
};

exports.HttpClient = HttpClient;