$(document).ready(function() {
    // Test for notification
    // setTimeout(notify_user, 2000, "title!", "http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png", "message");
    EVENTS_LIST = 'events'; // Const name of schedule item in localStorage

    if (top.location.pathname == '/clock.html') {
        var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
        var len = events.length;
        var today = new Date();

        cur_event = 0; // Global counter for event list index
        cur_msg = $('#motivate_box').text().trim(); // Global var for quote
        ICONS = {"type1": "icon1", "type2": "icon2", "type3": "icon3"}; // Const icon locations // TODO fill this out

        /* Drawing events from localStorage */
        for (i = 0; i < len; i++) {
            // Convert from Python datetime to JS Date
            // if (today.dst()) {
            //     events[i].datetime = new Date(events[i].datetime * 1000)
            //     events[i].datetime = new Date(events[i].datetime + "GMT+60");
            // }
            // else {
            //     events[i].datetime = new Date(events[i].datetime * 1000)
            //     events[i].datetime = new Date(events[i].datetime + "GMT");
            // }
            events[i].datetime = new Date(events[i].datetime * 1000);
            draw_event('red', i, events[i].datetime);
        }

        set_up_event_mouseover();
        // Notification is set for first event in the queue
        // set_up_notification(cur_event); TODO uncomment

        // [{name: event1, type: water, description: info, time: 1pm}]
        // If user completes an event
            // completed tag is added to event with user rating
        // Else
            // incomplete tag is added


    /* For fancy end animation */
    document.getElementById("expander").addEventListener( 
     'webkitTransitionEnd', function( e ) { 
        if (event.propertyName == 'height') {
            $("#finish_text").text('Congratulations champ! You nailed it!');
            $("#expander").append('<button id="reward_btn" class="btn btn-success">Reap your reward</button>');
            $("#done_btn").unbind();

            $("#reward_btn").click(function () {
                location.href = "https://www.youtube.com/watch?v=wDajqW561KM";
            })
        }
     }, false
);
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
    var spacing_factor = 2.5; /* Determines space between depth levels */
    var fade_factor = 0.1; /* Lower = more faded */
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var max_depth = 3;
    var now = new Date();
    var dist = null;
    var x_offset = null;
    var y_offset = null;

    // depth is difference in hours
    var depth = Math.abs(datetime.getHours() - now.getHours())
    if (depth > max_depth - 1) {
        return; // don't draw events that close to the center
    } else if (depth < 0) {
        return; // don't draw past events
    }
    console.log(depth);
    console.log("\n");

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

function set_up_event_mouseover() {
    $('.dot').each(function() {
        var ID_LENGTH = 6; // length of unnecessary chars in "event_#"
        var events_list = JSON.parse(localStorage.getItem(EVENTS_LIST));

        $(this).mouseover(function() {
            var event_index = $(this).attr('id').slice(ID_LENGTH);

            var text = events_list[event_index].description + "\n" + (new Date(events_list[event_index].datetime * 1000))
            $('#motivate_box').empty();
            $('#motivate_box').append('<p>' + text + '</p>');
        });

        $(this).mouseleave(function() {
            $('#motivate_box').empty()
            $('#motivate_box').append('<p>' + cur_msg + '</p>');
        });
    });
}



/******************************************************************************
*
*                            TIMES FORM
*
******************************************************************************/

/* Invariant: the end time is always the next day */
$('#times_form').submit(function(e) {
    e.preventDefault();

    var wake_up_time = $('#wake_up_time').val();
    var end_time = $('#end_time').val();
    var expires_in = 1; // days
    var params = null;
    var end_date = new Date();
    var wake_up_date = new Date();
    var wake_hour_min = get_hour_min(wake_up_time);
    var end_hour_min = get_hour_min(end_time);
    var cur_time = new Date();

    if (validate_times(wake_up_time, end_time)) {
        create_cookie('wake_up_time', wake_up_time, expires_in);
        create_cookie('end_time', end_time, expires_in);

        if (end_hour_min.hour <= cur_time.getHours()) {
            end_date.setDate(end_date.getDate() + 1);
        }
        end_date.setHours(end_hour_min.hour);
        end_date.setMinutes(end_hour_min.min);

        end_time = Math.floor(end_date.getTime() / 1000); // send timestamp to server
        cur_time = Math.floor(cur_time.getTime() / 1000);

        params = {'wake_up_time': wake_up_time, 'end_time': end_time, 'cur_time': cur_time};

        get_schedule(params);
    }
});


/* Handles post request to get event schedule based on input times and
 * then calls the draw_event function */
function get_schedule(params) {
    $.post('/schedule', params, function(data) {

        localStorage.setItem(EVENTS_LIST, data);
        window.location.href = 'clock.html';
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
    var events_list = JSON.parse(localStorage.getItem(EVENTS_LIST));
    var events_len = events_list.length();

    if (cur_event >= events_len)
        return; // all events completed

    var event_to_notify = events_list[cur_event]; 
    var now = new Date();
    var milli_till_event = new Date(event_to_notify.datetime) - now;

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
*                          INPUT BUTTONS
*
******************************************************************************/

$('#done_btn').mousedown(function() {
    expand();
}).bind('mouseup mouseleave', function() {
    minimize();
});


function expand () {
    $("#expander").addClass('notransition'); // Disable transitions
    // $("#expander").css('height', '1%');
    // $("#expander").css('width', '100%');

    var done_btn_pos = $("#done_btn").offset();
    $("#expander").css(done_btn_pos);
    $("#expander").css('width', $("#done_btn").css('width'));
    $("#expander").css('height', $("#done_btn").css('height'));
    $("#expander").css('visibility', 'visible');
    $("#expander")[0].offsetHeight; // Trigger a reflow, flushing the CSS changes
    $("#expander").removeClass('notransition'); // Re-enable transitions

    // $("#expander").css('height', '100%');

    $("#expander").css('top', 0);
    $("#expander").css('bottom', 0);
    $("#expander").css('right', 0);
    $("#expander").css('left', 0);
    $("#expander").css('width', '100%');
    $("#expander").css('height', '100%');
}

function minimize () {
    var expander = $("#expander");
    expander.addClass('notransition'); // Disable transitions

    $("#expander").css('visibility', 'hidden');

    expander[0].offsetHeight; // Trigger a reflow, flushing the CSS changes
    expander.removeClass('notransition'); // Re-enable transitions
}




/******************************************************************************
*
*                            HELPERS
*
******************************************************************************/

Date.prototype.stdTimezoneOffset = function() {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.dst = function() {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}


/* Validate that the range of wake_up_time is within 3am to 3pm */
function validate_times(wake_up_time, end_time) {
    var wake_hour_min = get_hour_min(wake_up_time);
    var end_hour_min = get_hour_min(end_time);
    var wake_err_msg = '<p class="alert alert-danger">Sorry, but All Night Long currently does not support nocturnal schedules. Please wait for the release of All Day Long. Thank you for your patience.</p>';

    $('#error').empty();
    if (wake_hour_min.hour == 15) {
        if (wake_hour_min.min > 0) {
            $('#error').append(wake_err_msg);
            return false;
        }
    } else if (wake_hour_min.hour > 15) {
        $('#error').append(wake_err_msg);
        return false;
    } else if (wake_hour_min.hour < 3) {
        $('#error').append(wake_err_msg);
        return false;
    }

    // TODO check to make sure end_time is before their standard wake_up_time

    return true;
}



/* Given a 24hr time string (i.e. 19:30), return the dictionary
   with separate fields for both the hour and minute 
   ( i.e. {'hour: 19', 'min: 30'} ) 
 */
function get_hour_min(time_string) {
    var time_arr = time_string.split(':');
    var hour = time_arr[0];
    var minute = time_arr[1];
    return {'hour': parseInt(hour), 'min': parseInt(minute)};
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
