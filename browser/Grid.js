/**
 * Copyright 2012 by DracoBlue. Licensed under the terms of MIT License.
 */

GridParticipant = function(grid, options)
{
    this.options = options;

    this.dom_element = jQuery(document.createElement('li'));
    this.dom_element.addClass(options.type);
    this.refreshImage();
};

GridParticipant.prototype.refreshImage = function()
{
    var img_element = jQuery(document.createElement('img'));
    img_element.attr('alt', '');

    if (this.options.type === 'item')
    {
        img_element.attr('src', 'http://swarmfight.com/static/images/item_' + this.options.item_type + '.png');
    }
    else
    {
        bot.client.get('user_data.php', {
            "user_id": this.options.id
        }, function(raw_user)
        {
            var user = JSON.parse(raw_user);

            if (user.avatar_image_url.substr(0, 7) === 'static/')
            {
                user.avatar_image_url = 'http://swarmfight.com/' + user.avatar_image_url;
            }

            img_element.attr('src', user.avatar_image_url);
        });
    }

    this.dom_element.append(img_element);
};

GridParticipant.prototype.toElement = function()
{
    return this.dom_element;
};

GridParticipant.prototype.getId = function()
{
    return this.options.id;
};

GridParticipant.prototype.updateValues = function(values)
{
    if (!this.dom_element.hasClass(values.color))
    {
        this.dom_element.removeClass('B').removeClass('R').removeClass('G').addClass(values.color);
    }

    this.dom_element.stop().animate({
        'left': values.x * 20 - 20,
        'top': values.y * 20 - 20
    });
};

Grid = function(dom_element, options)
{
    var that = this;

    this.dom_element = jQuery(dom_element);
    this.bot = options.bot;
    this.participants_by_id = {};
    this.participants = [];

    setInterval(function()
    {
        if (that.bot.field)
        {
            try
            {
                var participants = that.bot.field.getParticipants();
            }
            catch (error)
            {
                return;
            }

            that.updateGridParticipants(participants);
        }
    }, 1000);
};

Grid.prototype.updateGridParticipants = function(participants)
{
    var remove_ids = [];
    var participants_on_the_grid_by_id = {};
    var participants_on_the_grid = [];

    var participants_length = participants.length;
    for ( var i = 0; i < participants_length; i++)
    {
        var participant = participants[i];
        var participant_id = participant.user_id || participant.item_id;

        if (typeof this.participants_by_id[participant_id] === 'undefined')
        {
            var grid_participant = new GridParticipant(this, {
                'type': participant.item_id ? 'item' : 'user',
                'id': participant_id,
                'item_type': participant.item_type || null
            });
            this.participants.push(grid_participant);
            this.participants_by_id[participant_id] = grid_participant;

            this.dom_element.find('.participants').append(grid_participant.toElement());
        }

        this.participants_by_id[participant_id].updateValues({
            'x': participant.x,
            'y': participant.y,
            'color': participant.color
        });

        participants_on_the_grid_by_id[participant_id] = this.participants_by_id[participant_id];
        participants_on_the_grid.push(participants_on_the_grid_by_id[participant_id]);
    }

    for ( var i = 0; i < this.participants.length; i++)
    {
        var participant_to_be_removed_id = this.participants[i].getId();
        
        if (!participants_on_the_grid_by_id[participant_to_be_removed_id])
        {
            this.participants[i].toElement().remove();
        }
    }

    this.participants_by_id = participants_on_the_grid_by_id;
    this.participants = participants_on_the_grid;
};