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
        throw new Error('Nobody won, yet!');
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

Field.prototype.getParticipants = function()
{
    if (!this.participants)
    {
        throw new Error('Cannot return participants, if we don\'t have any participants data, yet');
    }
    
    return this.participants;
};

SwarmFightBot = function(options)
{
    var that = this;
    this.client = options.client;
    
    options.number = parseInt(options.number, 10);
    
    this.options = options || {};

    this.is_logged_in = false;
    
    this.user_id = null;
    this.user_color = null;
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
        that.client.setAuthorization('Bearer ' + data.access_token);
        
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
        console.log(raw_data);
        var data = JSON.parse(raw_data);
        that.field_id = data.id;
        that.logDebug('joined field:', that.field_id);
        that.field = new Field(that.field_id);
        that.is_logged_in = true;
    });
};

SwarmFightBot.prototype.isTheBotDisabled = function()
{
    return (!this.is_logged_in || !this.field || this.field.areThereOnlyBots()) ? true : false;
};


/*
 * Here is where your custom code (should) happen(s).
 */

SwarmFightBot.prototype.executeStrategy = function(cb)
{
    var that = this;
    var field = this.field;
    
    var user_position = field.getUserPositionById(this.user_id);
    
    if (this.user_color != user_position.color)
    {
        this.user_color = user_position.color;
        this.calculateNewTargetPosition();
    }
    
    if (!this.hasTargetPosition() || field.isPositionOccupied(this.getTargetPosition()))
    {
        this.calculateNewTargetPosition();
    }
    
    this.moveOnStepToTargetPosition(cb);
};

SwarmFightBot.prototype.hasTargetPosition = function()
{
    return this.target_position ? true : false;
};

SwarmFightBot.prototype.getTargetPosition = function()
{
    if (!this.target_position)
    {
        throw new Error('This bot has no target position, yet!');
    }
    return this.target_position;
};

SwarmFightBot.prototype.calculateNewTargetPosition = function()
{
    var field = this.field;
    
    var user_position = field.getUserPositionById(this.user_id);
    
    var field_map = {};
    var team_mates = [];
    
    var participants = field.getParticipants();
    for (var i = 0; i < participants.length; i++)
    {
        var participant = participants[i];
        if (participant.color === user_position.color && participant.user_id != this.user_id)
        {
            /*
             * It's a player, from the same team
             */
            team_mates.push(participant);
        }
        
        if (participant.color !== 'G')
        {
            /*
             * It's no pickup!
             */
            field_map[participant.x + 'x' + participant.y] = participant.color;
        }
    }
    
    this.target_position = this.getOneFreeBestAimPositionForUserPositionAndTeamMatesAndFieldMap(user_position, team_mates, field_map);
};

SwarmFightBot.prototype.getOneFreeBestAimPositionForUserPositionAndTeamMatesAndFieldMap = function(user_position, team_mates, field_map)
{
    var aim = this.field.getAim();
    var team_mates_length = team_mates.length;
    
    var max_aim_value = 0;
    var max_aim_value_team_mate_id = null;
    var max_aim_value_position = null;
    
    for (var i = 0; i < team_mates_length; i++)
    {
        var team_mate_x = team_mates[i].x;
        var team_mate_y = team_mates[i].y;
        
        /*
         * Ok, we have "Paul" now ... let's try him at all possible aim positions
         */
        for (var a = 0; a < aim.length; a++)
        {
            /*
             * What if "Paul" is at aim position number #a?
             */
            var selected_x = aim[a].x;
            var selected_y = aim[a].y;
            
            var aim_value = 0;
            
            /*
             * Let's find out, if every other field #s (except #a) is free and within the field.
             */
            for (var s = 0; s < aim.length; s++)
            {
                if (s !== a)
                {
                    var relative_x = team_mate_x - selected_x + aim[s].x;
                    var relative_y = team_mate_y - selected_y + aim[s].y;
                    
                    if (relative_x > 0 && relative_y > 0 && relative_x < 17 && relative_y < 17)
                    {
                        if (!field_map[relative_x + 'x' + relative_y] || field_map[relative_x + 'x' + relative_y].color === 'G')
                        {
                            /*
                             * Empty or just a power up
                             */
                            aim_value++;
                        }
                        else if (field_map[relative_x + 'x' + relative_y] === user_position.color)
                        {
                            /*
                             * Same color
                             */
                            aim_value += 100;
                        }
                        else
                        {
                            /*
                             * Different color, BIG no!!
                             */
                            aim_value = -100000;
                        }
                    }
                    else
                    {
                        /*
                         * It's not even in the bounderies, BIG no!!
                         */
                        aim_value = -100000;
                    }
                }
            }
            
            if (aim_value > max_aim_value)
            {
                max_aim_value_team_mate_id = i;
                max_aim_value_position = a;
                max_aim_value = aim_value;
            }
        }
        
    }
    
    if (max_aim_value_position === null)
    {
        /*
         * Ok, ... we have a problem. All friends are blocked in such way, that they cannot
         * create an aim from their position. This means, we need to find ANY place on the map, which is free.
         * This can be anything.
         * 
         * To make it simpler ... we just use random :-).
         */
        return {
            "x": Math.random(1, 16),
            "y": Math.random(1, 16)
        };
    }
    
    
    var selected_team_mate_position_x = aim[max_aim_value_position].x;
    var selected_team_mate_position_y = aim[max_aim_value_position].y;
    var team_mate_x = team_mates[max_aim_value_team_mate_id].x;
    var team_mate_y = team_mates[max_aim_value_team_mate_id].y;
//    this.logDebug('max aim for team mate: ', max_aim_value_team_mate_id, 'at', max_aim_value_position, 'with value', max_aim_value);
//    this.logDebug('our team mate is currently at ', team_mate_x + 'x' + team_mate_y, 'and is', team_mates[max_aim_value_team_mate_id]);
    
    var nearest_field = null;
    var nearest_field_distance = 10000;
    
    var are_we_part_of_this_aim = false;
    
    for (var s = 0; s < aim.length; s++)
    {
        if (s !== max_aim_value_position)
        {
            var relative_x = team_mate_x - selected_team_mate_position_x + aim[s].x;
            var relative_y = team_mate_y - selected_team_mate_position_y + aim[s].y;
            
            /*
             * Awesome, we are already part of this aim! So let's stay there!
             */
            if (relative_x === user_position.x && relative_y === user_position.y)
            {
                return {
                    "x": relative_x,
                    "y": relative_y
                };
            }
            
            if (!field_map[relative_x + 'x' + relative_y] || field_map[relative_x + 'x' + relative_y].color === 'G')
            {
                /*
                 * Empty or just a power up .. let's calculate the distance ... 
                 */
                var distance = Math.sqrt((user_position.x + relative_x) * (user_position.x + relative_x) + (user_position.y + relative_y) * (user_position.y + relative_y));
//                this.logDebug('field', relative_x, relative_y, 'with distance', distance);
                if (distance < nearest_field_distance)
                {
                    /*
                     * It's a cheaper one: take it!
                     */
                    nearest_field_distance = distance;
                    nearest_field = {"x": relative_x, "y": relative_y};
                }
            }
        }
    }
    
//    this.logDebug('nearest_field', nearest_field, 'with distance', nearest_field_distance);
    
    return nearest_field;
};

SwarmFightBot.prototype.moveOnStepToTargetPosition = function(cb)
{
    var user_position = this.field.getUserPositionById(this.user_id);
    var target_position = this.getTargetPosition();

    var path_to_target_position = this.getPathToTargetPosition(user_position, target_position);

    if (path_to_target_position.length < 1)
    {
        cb();
        return ;
    }

    var next_position = path_to_target_position[0];

    var params = {};
    params['x'] = next_position[0] - user_position.x;
    params['y'] = next_position[1] - user_position.y;

    if (this.field.isPositionOccupied({'x': params['x'] + user_position.x, 'y': params['y'] + user_position.y}))
    {
        this.logDebug('occupied!', {'x': params['x'] + user_position.x, 'y': params['y'] + user_position.y});
    }
    
    this.logDebug('move', params);

    this.client.post('move_player.php', params, function()
    {
        cb();
    });
};

SwarmFightBot.prototype.getPathToTargetPosition = function(user_position, target_position)
{
    if (user_position.x === target_position.x && user_position.y === target_position.y)
    {
        return [];
    }

    var field = this.field;
    var participants = field.getParticipants();
    var used_fields = {};
    for (var i = 0; i < participants.length; i++)
    {
        if (participants[i].color != 'G')
        {
            used_fields[participants[i].x + 'x' + participants[i].y] = true;
        }
    }

    var paths = [[[user_position.x, user_position.y]]];

    while (paths.length > 0)
    {
        var new_paths = [];
        var new_path = null;
        var path = null;

        for (var i = 0; i < paths.length; i++)
        {
            var pos_x = paths[i][paths[i].length - 1][0];
            var pos_y = paths[i][paths[i].length - 1][1];
            var new_pos_x = pos_x;
            var new_pos_y = pos_y;

            if (pos_x === target_position.x && pos_y === target_position.y && used_fields[pos_x + 'x' + pos_y] === true)
            {
                this.logDebug('from', user_position, 'to', target_position, 'by', paths[i].slice(1, paths[i].length));
                return paths[i].slice(1, paths[i].length);
            }

            path = paths[i];

            new_pos_x = pos_x;
            new_pos_y = pos_y + 1;
            if (new_pos_y < 17 && !used_fields[new_pos_x + 'x' + new_pos_y])
            {
                used_fields[new_pos_x + 'x' + new_pos_y] = true;
                new_path = path.slice(0, path.length);
                new_path.push([new_pos_x, new_pos_y]);
                new_paths.push(new_path);
            }

            new_pos_y = pos_y;
            new_pos_x = pos_x + 1;
            if (new_pos_x < 17 && !used_fields[new_pos_x + 'x' + new_pos_y])
            {
                used_fields[new_pos_x + 'x' + new_pos_y] = true;
                new_path = path.slice(0, path.length);
                new_path.push([new_pos_x, new_pos_y]);
                new_paths.push(new_path);
            }

            new_pos_y = pos_y;
            new_pos_x = pos_x - 1;
            if (new_pos_x > 0 && !used_fields[new_pos_x + 'x' + new_pos_y])
            {
                used_fields[new_pos_x + 'x' + new_pos_y] = true;
                new_path = path.slice(0, path.length);
                new_path.push([new_pos_x, new_pos_y]);
                new_paths.push(new_path);
            }

            new_pos_x = pos_x;
            new_pos_y = pos_y - 1;
            if (new_pos_y > 0 && !used_fields[new_pos_x + 'x' + new_pos_y])
            {
                used_fields[new_pos_x + 'x' + new_pos_y] = true;
                new_path = path.slice(0, path.length);
                new_path.push([new_pos_x, new_pos_y]);
                new_paths.push(new_path);
            }
        }

        paths = new_paths;
    }

    return [];
};

exports.SwarmFightBot = SwarmFightBot;