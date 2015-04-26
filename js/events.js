$(document).ready(function() {
    // Test for notification
    // setTimeout(notify_user, 2000, "title!", "http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png", "message");

    cur_event = 0; // Start with first event when doing notification
    ICONS = {"type1": "icon1", "type2": "icon2", "type3": "icon3"}; // icon locations // TODO fill this out
    EVENTS_LIST = 'events' // name of schedule item in localStorage

    /* Drawing events from localStorage */
    if (top.location.pathname == "/clock.html") {
        var events = JSON.parse(localStorage.getItem(EVENTS_LIST));


        var len = events.length;
        for (i = 0; i < len; i++) {
            // Convert from Python datetime to JS Date
            events[i].datetime = new Date(events[i].datetime);
            draw_event('red', i, events[i].datetime);
        }
        console.log(events);
        // Notification is set for first event in the queue
        // set_up_notification(cur_event); TODO uncomment

        // [{name: event1, type: water, description: info, time: 1pm}]
        // If user completes an event
            // completed tag is added to event with user rating
        // Else
            // incomplete tag is added
    }
});

/******************************************************************************
*
*                            SCHEDULING
*
******************************************************************************/

/* draw colored circle based off minute at the passed in depth */
function draw_event(color, index, datetime) {
    var minutes_in_hour = 60, rads_in_circle = 2 * Math.PI;
    /* Moves the dots of 0 depth slightly inward so they
        aren't right on the edge of the clock */
    var initial_offset = 0.5;
    var spacing_factor = 2; /* Determines space between depth levels */
    var fade_factor = 0.2; /* Lower = more faded */
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var max_depth = 3;
    var now = new Date();
    var dist = null;
    var x_offset = null;
    var y_offset = null;

    // depth is difference in hours
    var depth = Math.round((datetime - now) / (1000 * 60 * 60)); // milliseconds/sec * sec/min * min/hr
    if (depth > max_depth - 1) {
        return; // don't draw events past third level
    } else if (depth < 0) {
        console.log("Oops. Depth is negative in draw_event!");
        return;
    }

    var hour = datetime.getHours();
    var minute = datetime.getMinutes();

    angle = (minute / minutes_in_hour) * rads_in_circle - Math.PI / 2;

    /* Distance to move toward center of circle */
    dist = (depth + initial_offset) * dot_width * spacing_factor;
    x_offset = dist * Math.cos(Math.PI - angle);
    y_offset = dist * Math.sin(Math.PI + angle);

    radius = ($('.outer_face').width()) / 2;
    new_top = (($('.outer_face').height() / 2) + radius * Math.sin(angle));
    new_left = (($('.outer_face').width() / 2) + radius * Math.cos(angle));

    /* Center dots at point on circle border, and then add offset
        needed to bring them closer to the center. */
    new_left = new_left - dot_height / 2 + x_offset;
    new_top = new_top - dot_height / 2 + y_offset;
    $('.outer_face').append('<div id="event_' + index + '" class="dot" style="left:' + new_left + 'px;top:' + new_top + 'px; background-color: ' + color + '"></div>');
    $('#event_' + index).css('opacity', (max_depth - depth + fade_factor) / (max_depth + fade_factor)); // faded based on depth: 1.0 opacity is fully visible, and 0.0 is fully transparent
}


$('dot').each(function() {
    var ID_LENGTH = 6; // length of unnecessary chars in "event_#"
    var events_list = localStorage.getItem(EVENTS_LIST); // TODO name might be wrong
    
    $(this).mouseover(function() {
        var event_index = $(this).attr('id').slice(ID_LENGTH)
        
        $('#motive_box').text(events_list[event_index].description)
    });
});



/******************************************************************************
*
*                            TIMES FORM
*
******************************************************************************/

$('#times_form').submit(function(e) {
    e.preventDefault();

    var wake_up_time = $('#wake_up_time').val();
    var end_time = $('#end_time').val();
    var expires_in = 1; // days
    var params = null;

    create_cookie('wake_up_time', wake_up_time, expires_in);
    create_cookie('end_time', end_time, expires_in);

    params = {'wake_up_time': toString(wake_up_time), 'end_time': toString(end_time)};
    get_schedule(params);
});


/* Handles post request to get event schedule based on input times and
 * then calls the draw_event function */
function get_schedule(params) {
    $.post('/schedule', params, function(data) {

        var events = JSON.parse(data);

        localStorage.setItem(EVENTS_LIST, events);
        window.location.replace('clock.html');
    });
}

/******************************************************************************
*
*                            NOTIFICATIONS
*
******************************************************************************/

/* The notification for the cur_event in the queue is set up
 * based on its event time */
function set_up_notification(cur_event) {
    // TODO make sure item name is correct
    var events_list = localStorage.getItem(EVENTS_LIST);
    // TODO must catch out of bounds error (all events completed)
    var event_to_notify = events_list[cur_event];
    var now = new Date();
    // TODO must correctly deal with the time event_time gives back
    var milli_till_event = new Date(event_to_notify.time) - now;

    setTimeout(notify_user, milli_till_event, 'BREAK TIME!', ICONS.event_to_notify.type, event_to_notify.name);
    cur_event++;
}


// TEST ICON: http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png
function notify_user(title, icon, message) {
    if (!Notification) {
        alert('Please upgrade to a modern version of Chrome, Firefox, Opera or Firefox.');
        return;
    }

    if (Notification.permission !== 'granted')
        // TODO add unique way to tell user why we want this functionality
        // TODO if user says no, we must not set the notification to display
        // TODO if user says yes, notifcation must display. Right now it doesn't wait for a response
        Notification.requestPermission();

    var notification = new Notification(title, {
        // TODO change icon based on event
        icon: icon,
        body: message
    });

    notification.onclick = function() {
        window.focus();

        // TODO show modal
        $('#event_info').modal('show');
    };

    // Notification is set for next event in the queue
    set_up_notification(cur_event); 
}



/******************************************************************************
*
*                            HELPERS
*
******************************************************************************/

/* Given a 24hr time string (i.e. 19:30), return the dictionary
   with separate fields for both the hour and minute 
   ( i.e. {'hour: 19', 'minute: 30'} ) 
 */
function get_hour_min(time_string) {
    var time_arr = time_string.split(':');
    var hour = time_arr[0];
    var minute = time_arr[1];
    return {'hour': parseInt(hour), 'minute': parseInt(minute)};
}





/* Gets the CSS property of a class that hasn't been used yet in the DOM */
var get_css = function(prop, fromClass) {
    var $inspector = $('<div>').css('display', 'none').addClass(fromClass);

    $('body').append($inspector); // add to DOM, in order to read the CSS property

    try {
        return $inspector.css(prop);
    }
    finally {
        $inspector.remove(); // and remove from DOM
    }
};

function create_cookie(name, value, days) {
    var expires = null;

    if (days) {
        var date = new Date();

        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toGMTString();
    }
    else expires = '';

    document.cookie = name + '=' + value + expires + '; path=/';
}



function get_cookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');

    if (parts.length == 2) return parts.pop().split(';').shift();
}
