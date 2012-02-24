var http = require('http');
var querystring = require('querystring');
var url_service = require("url");

SwarmFightBot = function(options)
{
    var url_parts = url_service.parse(options.url);
    options.host = options.host || url_parts.host;
    options.path = options.path || url_parts.path;
    options.port = parseInt(options.port || url_parts.port || (options.protocol === 'https' ? 443 : 80), 10);
    
    console.log(options);
    var that = this;
    this.options = options || {};

    this.cookies = null;
    this.is_logged_in = false;

    setInterval(function()
    {
        that.updateFieldData(function()
        {
            that.onTick();
        });
    }, 1000);
};

SwarmFightBot.prototype.run = function()
{
    var that = this;

    this.rawExecute('login_as_user_id.php?user_id=' + this.options.user_id, {}, function(data, res)
    {
        var headers = res.headers;
        /*
         * done
         */
        if (headers['set-cookie'])
        {
            that.cookies = headers['set-cookie'].join('').split(';')[0];
        }

        that.joinAnyField();
    });
};

SwarmFightBot.prototype.joinAnyField = function()
{
    var that = this;
    that.rawExecute('join_any_fight.php', {
        'color': that.options.color
    }, function(raw_data)
    {
        var data = JSON.parse(raw_data);
        that.field_id = data.id;
        console.log('joined', that.field_id);
        that.is_logged_in = true;
    });
};

SwarmFightBot.prototype.onTick = function()
{
    if (!this.is_logged_in)
    {
        return;
    }
//
//    var key = Math.random() > 0.5 ? 'x' : 'y';
//    var other_key = key === 'x' ? 'y' : 'x';
//
//    var params = {};
//    params[key] = Math.random() > 0.5 ? -1 : 1;
//    params[other_key] = 0;

//    this.rawExecute('move_player.php', params, function()
//    {
//    });
};

SwarmFightBot.prototype.updateFieldData = function(cb)
{
    var that = this;
    if (!this.field_id)
    {
        cb();
        return;
    }

    this.rawExecute('field_data.php?field_id=' + this.field_id, {}, function(raw_data)
    {
        var data = JSON.parse(raw_data);

        // console.log('field_data', raw_data);

        if (data.winners)
        {
            that.field_id = null;
            that.joinAnyField();
        }

        var left_padding = 1;
        var top_padding = 1;

        var field_colors = {};
        
        var user_x = null;
        var user_y = null;

        var participants = data.participants;
        for ( var i = 0; i < participants.length; i++)
        {
            if (participants[i].user_id === that.options.user_id)
            {
                user_x = participants[i].x;
                user_y = participants[i].y;
            }
            if (participants[i].color != 'G')
            {
                field_colors[participants[i].x + 'x' + participants[i].y] = participants[i].color;
            }
        }
        
        console.log(field_colors);

        var aim = data.aim;
        for ( var i = 0; i < aim.length; i++)
        {
            if (i === that.options.number)
            {
                var aim_x = aim[i].x + left_padding;
                var aim_y = aim[i].y + top_padding;
                if (typeof field_colors[aim_x + 'x' + aim_y] === 'undefined')
                {
                    var params = {};
                    if (aim_x != user_x) {
                        params['x'] = aim_x < user_x ? -1 : 1;
                        params['y'] = 0;
                    } else if (aim_y != user_y){
                        params['x'] = 0;
                        params['y'] = aim_y < user_y ? -1 : 1;
                    } else {
                        cb();
                        return ;
                    }
                    
                    console.log('moving from ', user_x, user_y, 'to', aim_x, aim_y);
                    
                    that.rawExecute('move_player.php', params, function()
                    {
                        cb();
                    });
                    return ;
                }
            }
        }

        cb();
    });
};

SwarmFightBot.prototype.rawExecute = function(function_name, params, cb)
{
    var that = this;
    var raw_body = querystring.stringify(params);

    var options = {
        "host": this.options.host,
        "port": this.options.port,
        "path": this.options.path + function_name,
        "headers": {
            'Content-Length': raw_body.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        "method": "POST"
    };

    if (this.cookies)
    {
        options.headers['Cookie'] = that.cookies;
    }

    var req = http.request(options, function(res)
    {
        res.setEncoding('utf8');
        var response = [];
        res.on('data', function(chunk)
        {
            response.push(chunk);
        });

        res.on('end', function()
        {
            // console.log('STATUS: ' + res.statusCode);
            // console.log('BODY: ' + response.join(''));
            cb(response.join(''), res);
        });
    });
    req.write(raw_body);
    req.end();
};

new SwarmFightBot({
    'url': process.argv[2],
    'api_key': '123',
    'user_id': process.argv[3],
    'color': process.argv[4],
    'number': parseInt(process.argv[5], 10)
}).run();