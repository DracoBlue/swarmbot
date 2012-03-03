/**
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */

HttpClient = function(options)
{
    this.options = options;
    this.options.base_url = this.options.base_url || null;
    this.authorization = null;
    this.http_module = require('http');
    this.querystring_module = require('querystring');
    this.url_module = require('url');
};

HttpClient.prototype.rawRequest = function(method, url, params, cb)
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

    if (this.authorization)
    {
        options.headers['Authorization'] = that.authorization;
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

HttpClient.prototype.setAuthorization = function(authorization)
{
    this.authorization = authorization;
};

exports.HttpClient = HttpClient;
