/**
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */
Field = function(id)
{
    this.id = id;
    
    this.aim = null;
    this.participants = null;
    this.winners = null;
};

Field.prototype.refresh = function(client, cb)
{
    var that = this;

    client.get('field_data.php?field_id=' + this.id, {}, function(raw_data)
    {
        var data = JSON.parse(raw_data);
        
        that.aim = data.aim;
        that.participants = data.participants;
        that.winners = data.winners;

        cb();
    });    
};

Field.prototype.getWinners = function()
{
    if (!this.winners)
    {
        throw new Exception('Nobody won, yet!');
    }
    
    return this.winners;
};

Field.prototype.hasWinners = function()
{
    return this.winners ? true : false;
};

Field.prototype.getAim = function()
{
    if (!this.aim)
    {
        throw new Error('Cannot retrieve aim, if the aim-data has not been set, yet!');
    }
    
    return this.aim;
};

Field.prototype.getAimDimensions = function()
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

Field.prototype.isPositionOccupied = function(position)
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

Field.prototype.getUserPositionById = function(user_id)
{
    var that = this;
    
    if (!this.participants)
    {
        throw new Error('Cannot calculate the position of the player, if we don\'t have any participants data, yet');
    }
    
    var participants = this.participants;
    
    for ( var i = 0; i < participants.length; i++)
    {
        if (participants[i].user_id === user_id)
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

Field.prototype.isUserOnFieldByUserId = function(user_id)
{
    var that = this;
    
    if (!this.participants)
    {
        throw new Error('Cannot calculate the position of the player, if we don\'t have any participants data, yet');
    }
    
    var participants = this.participants;
    
    for ( var i = 0; i < participants.length; i++)
    {
        if (participants[i].user_id === user_id)
        {
            return true;
        }
    }    
    
    return false;
};

Field.prototype.areThereOnlyBots = function()
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

SwarmFightBot = function(options)
{
    var that = this;
    this.client = options.client;
    
    options.number = parseInt(options.number, 10);
    
    this.options = options || {};

    this.is_logged_in = false;
    
    this.user_id = null;
    this.field_id = null;
    this.field = null;

    setInterval(function()
    {
        if (that.field) {
            var field = that.field;
            
            field.refresh(that.client, function()
            {
                if (field.hasWinners() || !field.isUserOnFieldByUserId(that.user_id))
                {
                    that.logDebug('Winner or we got kicked!');
                    /*
                     * Looks like somebody won or we got kicked form the field, let's rejoin!
                     */
                    that.field_id = null;
                    that.field = null;
                   
                    setTimeout(function() {
                        that.joinAnyField();
                    }, 3000 + Math.floor(Math.random() * 5000));
                }
                else
                {
                    if (!that.isTheBotDisabled())
                    {
                        that.logDebug('Bot is enabled');
                        that.executeStrategy(function()
                        {
                    
                        });
                    }
                    else
                    {
                        that.logDebug('Bot is disabled');
                    }
                }
            });
        }
    }, 1000);
};

SwarmFightBot.prototype.logDebug = function()
{
    if (this.options.debug)
    {
        console.log(this.user_id, arguments);
    }
};

SwarmFightBot.prototype.run = function()
{
    var that = this;

    this.client.post('login_with_api_key.php', {"api_key": this.options.api_key}, function(raw_data, res)
    {
        var data = JSON.parse(raw_data);
        
        that.user_id = data.user_id;
        
        that.joinAnyField();
    });
};

SwarmFightBot.prototype.joinAnyField = function()
{
    var that = this;
    that.logDebug('join any field');
    that.client.post('join_any_fight.php', {
        'color': that.options.color
    }, function(raw_data)
    {
        var data = JSON.parse(raw_data);
        that.field_id = data.id;
        that.logDebug('joined field:', that.field_id);
        that.field = new Field(that.field_id);
        that.is_logged_in = true;
    });
};

SwarmFightBot.prototype.getUserTargetPosition = function()
{
    if (!this.field)
    {
        throw new Error('Cannot calculate the target position of the player, if we don\'t have any field, yet');
    }
    
    var user_position = this.field.getUserPositionById(this.user_id);
    var aim = this.field.getAim();
    
    var left_padding = 1;
    var top_padding = 1;
    
    
    if (user_position.color == 'R')
    {
        var aim_dimension = this.field.getAimDimensions();
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
    
    if (aim.length <= position_in_aim)
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
        "x": aim[position_in_aim].x + left_padding,
        "y": aim[position_in_aim].y + top_padding
    };
};

SwarmFightBot.prototype.isTheBotDisabled = function()
{
    return (!this.is_logged_in || !this.field || this.field.areThereOnlyBots()) ? true : false;
};

SwarmFightBot.prototype.executeStrategy = function(cb)
{
    var that = this;
    
    var user_position = this.field.getUserPositionById(this.user_id);
    var target_position = this.getUserTargetPosition();
    
    if (this.field.isPositionOccupied(target_position))
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

    that.client.post('move_player.php', params, function()
    {
        cb();
    });
};

exports.SwarmFightBot = SwarmFightBot;