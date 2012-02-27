/**
 * Usage swarmfight-bot.js --url http://servername/path/to/swarmfight/ --user_id 1h2g3j2h13g --color red --number 2
 * 
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */
var http = require('http');
var querystring = require('querystring');
var url_service = require("url");

SwarmFightBot = function(options)
{
    var url_parts = url_service.parse(options.url);
    options.host = options.host || url_parts.host;
    options.path = options.path || url_parts.path;
    options.port = parseInt(options.port || url_parts.port || (options.protocol === 'https' ? 443 : 80), 10);
    options.number = parseInt(options.number, 10);
    
    var that = this;
    this.options = options || {};

    this.cookies = null;
    this.is_logged_in = false;
    
    this.user_id = null;
    this.field_id = null;
    this.aim = null;
    this.participants = null;

    setInterval(function()
    {
        that.updateFieldData(function()
        {
            that.onTick(function() {
                
            });
        });
    }, 1000);
};

SwarmFightBot.prototype.run = function()
{
    var that = this;

    this.rawExecute('login_with_api_key.php', {"api_key": this.options.api_key}, function(raw_data, res)
    {
        var data = JSON.parse(raw_data);
        var headers = res.headers;
        /*
         * done
         */
        if (headers['set-cookie'])
        {
            that.cookies = headers['set-cookie'].join('').split(';')[0];
        }
        
        that.user_id = data.user_id;
        
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
        that.is_logged_in = true;
    });
};

SwarmFightBot.prototype.getAimDimensions = function()
{
    if (!this.aim)
    {
        throw new Error('Cannot retrieve aim, if the aim-data has not been set, yet!');
    }
    
    var aim = this.aim;
    
    var aim_min_x = aim[0].x;
    var aim_max_x = aim[0].x;
    var aim_min_y = aim[0].y;
    var aim_max_y = aim[0].y;

    for ( var i = 1; i < aim.length; i++)
    {
        aim_min_x = Math.min(aim_min_x, aim[i].x);
        aim_max_x = Math.max(aim_max_x, aim[i].x);
        aim_min_y = Math.min(aim_min_y, aim[i].y);
        aim_max_y = Math.max(aim_max_y, aim[i].y);
    }
    
    var aim_width = aim_max_x - aim_min_x;
    var aim_height = aim_max_y - aim_min_y;
    
    return {
        'left': aim_min_x,
        'top': aim_min_y,
        'width': aim_width,
        'height': aim_height
    };
};

SwarmFightBot.prototype.isPositionOccupied = function(position)
{
    if (!this.participants)
    {
        throw new Error('Cannot calculate if the position is occupied, if we don\'t have any participants data, yet');
    }
    
    var participants = this.participants;
    
    for ( var i = 0; i < participants.length; i++)
    {
        if (participants[i].x === position.x && participants[i].y === position.y)
        {
            if (participants[i].color == 'G')
            {
                /*
                 * It's an item, which you can pickup: is not occupied, though.
                 */
                return false;
            }
            
            return true;
        }
    }    
    
    return false;
};

SwarmFightBot.prototype.getUserPosition = function()
{
    var that = this;
    
    if (!this.participants)
    {
        throw new Error('Cannot calculate the position of the player, if we don\'t have any participants data, yet');
    }
    
    var participants = this.participants;
    
    for ( var i = 0; i < participants.length; i++)
    {
        if (participants[i].user_id === that.user_id)
        {
            return {
                'x': participants[i].x,
                'y': participants[i].y,
                'color': participants[i].color
            };
        }
    }    
    
    throw new Error('Cannot find user on field!');
};

SwarmFightBot.prototype.getUserTargetPosition = function()
{
    if (!this.aim)
    {
        throw new Error('Cannot calculate the target position of the player, if we don\'t have any aim, yet');
    }
    
    var user_position = this.getUserPosition();
    
    var left_padding = 1;
    var top_padding = 1;
    
    
    if (user_position.color == 'R')
    {
        var aim_dimension = this.getAimDimensions();
        /*
         * Downer right corner
         */
        left_padding = 16 - aim_dimension.left - aim_dimension.width - 1;
        top_padding = 16 - aim_dimension.top - aim_dimension.height - 1;
    }
    
    if (user_position.color == 'B')
    {
        /*
         * Upper left corner
         */
        left_padding = 1;
        top_padding = 1;
    }
    
    var position_in_aim = this.options.number - 1;
    
    if (this.aim.length <= position_in_aim)
    {
        /*
         * Aim is not big enough, so let's stay where we are
         */
        return {
            "x": user_position.x,
            "y": user_position.y
        };
    }
    
    return {
        "x": this.aim[position_in_aim].x + left_padding,
        "y": this.aim[position_in_aim].y + top_padding
    };
};

SwarmFightBot.prototype.areWeOnlyBots = function()
{
    if (!this.participants)
    {
        throw new Error('Cannot calculate the position of the player, if we don\'t have any participants data, yet');
    }
    
    var participants = this.participants;
    
    for ( var i = 0; i < participants.length; i++)
    {
        if (participants[i].user_id && !participants[i].is_bot)
        {
            return false;
        }
    }    
    
    return true;
};

SwarmFightBot.prototype.onTick = function(cb)
{
    var that = this;
    
    if (!this.is_logged_in || !this.aim || !this.participants)
    {
        return;
    }
    
    var participants = this.participants;
    var aim = this.aim;
    
    if (this.areWeOnlyBots())
    {
        cb();
        return ;
    }
    
    var user_position = this.getUserPosition();
    var target_position = this.getUserTargetPosition();
    
    if (this.isPositionOccupied(target_position))
    {
        cb();
        return ;
    }
    
    var params = {};
    
    if (user_position.x != target_position.x)
    {
        params['x'] = target_position.x < user_position.x ? -1 : 1;
        params['y'] = 0;
    }
    else if (user_position.y != target_position.y)
    {
        params['x'] = 0;
        params['y'] = target_position.y < user_position.y ? -1 : 1;
    }
    else
    {
        cb();
        return ;
    }

    that.rawExecute('move_player.php', params, function()
    {
        cb();
    });
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

        if (data.winners)
        {
            that.field_id = null;
            that.aim = null;
            that.participants = null;
            setTimeout(function() {
                that.joinAnyField();
            }, 3000 + Math.floor(Math.random() * 5000));
        }
        else
        {
            that.aim = data.aim;
            that.participants = data.participants;
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
            cb(response.join(''), res);
        });
    });
    req.write(raw_body);
    req.end();
};

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

api_keys.forEach(function(api_key, i)
{
    setTimeout(function() {
        new SwarmFightBot({
            "url": commandline_options.url,
            "color": commandline_options.color,
            "number": i + 1,
            "api_key": api_key
        }).run();
    }, i * 100);
});

