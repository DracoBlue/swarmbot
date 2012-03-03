/**
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */

HttpClient = function(options)
{
    this.options = options;
    this.options.base_url = this.options.base_url || null;
    this.authorization = null;
};

HttpClient.prototype.rawRequest = function(method, url, params, cb)
{
    var that = this;
    
    var options = {
        'url': (this.options.base_url || '') + url,
        'type': method,
        'dataType': 'json',
        'contentType': 'application/x-www-form-urlencoded',
        'processData': true,
        'data': params,
        'success': function(response_object, status_as_text, response) {
            cb(response.responseText);
        }
    };

    if (this.authorization)
    {
        options.headers = {};
        options.headers['Authorization'] = this.authorization;
    }
    
    $.ajax(options);
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