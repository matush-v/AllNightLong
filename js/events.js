$(document).ready(function() {
    EVENTS_LIST = 'events'; // Const name of schedule item in localStorage

    if (top.location.pathname == '/clock.html') {
        document.documentElement.style.overflowX = 'hidden';

        QUOTES = ['With the new day comes new strength and new thoughts.',
                  'In the middle of every difficulty lies opportunity.',
                  'All we have to decide is what to do with the time that is given us.',
                  'Don&#39;t let the muggles get you down.',
                  'Good things come to people who wait, but better things come to those who go out and get them.',
                  'If you do what you always did, you will get what you always got.',
                  'If you&#39;re going through hell keep going.',
                  'No masterpiece was ever created by a lazy artist.'];

        ICONS = {'exercise': 'img/exercise_icon.png', 
                 'hydration': 'img/water_icon.png', 
                 'food': 'img/food_icon.png', 
                 'walk': 'img/walk_icon.png', 
                 'nap': 'img/nap_icon.png', 
                 'caffeine': 'img/caffeine_icon.png'}; // Const icon locations

        var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
        var len = events.length;
        var today = new Date();
        cur_event = 0; // Global counter for event list index
        cur_quote = 0; // Global counter for quote list index

        $('#motivate_box').append('<p>' + QUOTES[cur_quote] + '</p>');

        // Drawing events from localStorage
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
        set_up_notification();

        // For fancy end animation
        document.getElementById("expander").addEventListener( 
         'webkitTransitionEnd', function( e ) { 
            if (event.propertyName == 'height') {
                $("#finish_text").text('Congratulations champ! You nailed it!');
                $("#expander").append('<button id="reward_btn" class="btn btn-info">Reap your reward</button>');
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
    var end_hour_min = get_hour_min(end_time);
    var cur_time = new Date();
    var offset = cur_time.getTimezoneOffset() / 60 // get difference in hours between local timezone and UTC timezone

    if (validate_times(wake_up_time, end_time)) {

        if (end_hour_min.hour <= cur_time.getHours()) {
            end_date.setDate(end_date.getDate() + 1);
        }

        end_date.setHours(end_hour_min.hour);
        end_date.setMinutes(end_hour_min.min);

        create_cookie('wake_up_time', wake_up_time, expires_in);
        create_cookie('end_time', end_date, expires_in);
        create_cookie('start_time', cur_time);

        // send timestamp to server
        end_time = Math.floor(end_date.getTime() / 1000);
        cur_time = Math.floor(cur_time.getTime() / 1000);



        params = {'wake_up_time': wake_up_time, 'end_time': end_time, 'cur_time': cur_time, 'utc_offset': offset};

        get_schedule(params);
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
    // Moves the dots of 0 depth slightly inward so they
    //  aren't right on the edge of the clock
    var initial_offset = 0.5;
    var spacing_factor = 2.5; // Determines space between depth levels
    var fade_factor = 0.1; // Lower = more faded
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var max_depth = 3;
    var now = new Date();
    var dist = null;
    var x_offset = null;
    var y_offset = null;

    if (datetime < now) {
        return; // event is in the past
    }
    // depth is difference in hours
    var depth = Math.abs(datetime.getHours() - now.getHours());

    if (depth > max_depth - 1) {
        return; // don't draw events that close to the center
    } else if (depth < 0) {
        return; // don't draw past events
    }

    var hour = datetime.getHours();
    var minute = datetime.getMinutes();

    angle = (minute / minutes_in_hour) * rads_in_circle - Math.PI / 2;

    // Distance to move toward center of circle
    dist = (depth + initial_offset) * dot_width * spacing_factor;
    x_offset = dist * Math.cos(Math.PI - angle);
    y_offset = dist * Math.sin(Math.PI + angle);

    radius = ($('.outer_face').width()) / 2;
    new_top = (($('.outer_face').height() / 2) + radius * Math.sin(angle));
    new_left = (($('.outer_face').width() / 2) + radius * Math.cos(angle));

    // Center dots at point on circle border, and then add offset
    //  needed to bring them closer to the center.
    new_left = new_left - dot_height / 2 + x_offset;
    new_top = new_top - dot_height / 2 + y_offset;
    $('.outer_face').append('<div id="event_' + index + '" class="dot" style="left:' + new_left + 'px;top:' + new_top + 'px; background-color: ' + color + '"></div>');
    $('#event_' + index).css('opacity', (max_depth - depth + fade_factor) / (max_depth + fade_factor)); // faded based on depth: 1.0 opacity is fully visible, and 0.0 is fully transparent
}

/* Sets up mouseover for events */
function set_up_event_mouseover() {
    $('.dot').each(function() {
        var ID_LENGTH = 6; // length of unnecessary chars in "event_#"
        var events_list = JSON.parse(localStorage.getItem(EVENTS_LIST));

        $(this).mouseover(function() {
            var event_index = $(this).attr('id').slice(ID_LENGTH);
            var date = (new Date(events_list[event_index].datetime * 1000));
            var hour = date.getHours();
            var minutes = date.getMinutes();
            am_pm = 'am';

            if (hour > 12) {
                hour -= 12;
                am_pm = 'pm';
            }

            if (minutes < 10) {
                minutes = '0' + minutes;
            }

            var time = 'Time: ' + hour + ':' + minutes + am_pm;
            $('#motivate_box').empty();
            $('#motivate_box').append('<p>' + events_list[event_index].description + '</p>');
            $('#motivate_box').append('<p>' + time + '</p>');
        });

        $(this).mouseleave(function() {
            var start_time = new Date(get_cookie('start_time'));
            var num = (new Date()) - start_time;
            var den = (new Date(get_cookie('end_time'))) - start_time;

            // Update quote based on how far into all nighter the user is
            cur_quote = Math.floor(num / den * QUOTES.length);
            $('#motivate_box').empty();
            $('#motivate_box').append('<p>' + QUOTES[cur_quote] + '</p>');
        });
    });
}

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
function set_up_notification() {
    var events_list = JSON.parse(localStorage.getItem(EVENTS_LIST));
    var events_len = events_list.length;

    if (cur_event >= events_len)
        return; // all events completed

    var event_to_notify = events_list[cur_event];
    var event_type = event_to_notify.type;
    var now = new Date();
    var milli_till_event = new Date(event_to_notify.datetime * 1000);
    milli_till_event -= now;

    if (milli_till_event < 0) 
        // console.log("bad time for event: " + event_to_notify.name);
        return;
    else
        setTimeout(notify_user, milli_till_event, 'BREAK TIME!', ICONS[event_type], event_to_notify.name, event_to_notify.description);

    cur_event++;
}


function notify_user(title, icon, short_message, long_description) {
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
        body: short_message
    });

    notification.onclick = function() {
        window.focus();

        // Remove default modal dismissal
        $('#event_modal').modal({
            backdrop: 'static',
            keyboard: false
        });


        $('#event_modal').find('#modal-image').empty()
        $('#event_modal').find('#modal-image').append("<div class='modal-icon'><img src='" + icon + "' alt='event icon'>");
        $('#event_modal').find('.modal-title').text(title);
        $('#event_modal').find('.modal-body').append(long_description);
        $('#event_modal').modal('show');

        $("#event_done_btn").click(function () {
            $('#event_modal').modal('dismiss');            
        });
    };

    // Notification is set for next event in the queue
    set_up_notification(); 
}


/******************************************************************************
*
*                          BUTTONS
*
******************************************************************************/

$('#done_btn').mousedown(function() {
        $('body').css('user-select', 'none').prop('unselectable', 'on').on('selectstart', false);
        expand();
}).bind('mouseup mouseleave', function() {
        minimize();
});

/* Expansion screen for I'm Done button */
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

/* Revert expansion for I'm Done button */
function minimize () {
    var expander = $("#expander");
    expander.addClass('notransition'); // Disable transitions

    $("#expander").css('visibility', 'hidden');

    expander[0].offsetHeight; // Trigger a reflow, flushing the CSS changes
    expander.removeClass('notransition'); // Re-enable transitions
}

$('#tired_btn').click(function() {
    var extras = [{"name": "Quick Spark" , "description": "Splash yourself with cold water", "icon": "img/discomfort_icon.jpg"}, 
    {"name": "Why you hittin’ yourself?", "description": "Pinch your thigh, eyebrow, or cheek", "icon": "img/discomfort_icon.jpg"}, 
    {"name": "Get your jam on", "description": "Put some rousing tunes on and pump yourself up for an intense night", "icon": "img/music_icon.jpg"}];
    var rand = Math.random();
    rand *= extras.length;
    rand = Math.floor(rand);
    var choice = extras[rand];

    $('#event_modal').find('#modal-image').empty()
    $('#event_modal').find('#modal-image').append("<div class='modal-icon'><img src='" + choice.icon + "' alt='event icon'></div>");
    $('#event_modal').find('.modal-title').text(choice.name);
    $('#event_modal').find('.modal-body').append(choice.description);
    $('#event_modal').modal('show');
});


/******************************************************************************
*
*                            HELPERS
*
******************************************************************************/

Date.prototype.stdTimezoneOffset = function() {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.dst = function() {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
};

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
    var max_age = null;

    if (days) {
        max_age = '; max-age=' + 24 * 60 * 60;
    }
    else max_age = '';

    document.cookie = name + '=' + value + max_age + '; path=/';
}

function get_cookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');

    if (parts.length == 2) return parts.pop().split(';').shift();
}
