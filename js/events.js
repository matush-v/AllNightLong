EVENTS_LIST = 'events'; // Const name of schedule item in localStorage

$(document).ready(function() {

    if (top.location.pathname == '/clock.html') {
        document.documentElement.style.overflowX = 'hidden';

        // Quotes/info box
        set_up_quotes();

        // Icons for notifications
        set_up_icons();

        var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
        var today = new Date();
        cur_event = 0; // Global counter for event list index, TODO change to localstorage


        draw_events(events);

        // Mousing over events will change the box info
        set_up_event_mouseover();

        // Notification is set for first event in the queue
        set_up_notification();

        // For fancy end animation
        set_up_end_animation();
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

function draw_events(events) {
    // Moves the dots of 0 depth slightly inward so they
    // aren't right on the edge of the clock
    INITIAL_OFFSET = 0.5;
    SPACING_FACTOR = 2.0; // Determines space between depth levels
    FADE_FACTOR = 0.1; // Higher = more faded
    MAX_DEPTH = 3; // number of rings in clock

    // Drawing events from localStorage
    var len = events.length;
    for (i = 0; i < len; i++) {
        // datetime is a unix timestamp (in seconds), convert to JS Date object after converting to milliseconds        
        // So datetime becomes the JS Date for when the event should occur
        events[i].datetime = new Date(events[i].datetime * 1000);
        draw_event('yellow', i, events[i].datetime);
    }

    draw_depth_rings();
}



/* draw colored circle based off minute at the passed in depth */
function draw_event(color, index, datetime) {
    var minutes_in_hour = 60, rads_in_circle = 2 * Math.PI;
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var now = new Date();
    var dist = null;
    var x_offset, y_offset = null;
    var minute = null;
    var depth;

    if (datetime < now) {
        return; // event is in the past
    }

    // depth is difference in hours
    depth = find_depth(datetime);

    // depth can be 0, 1, 2 for max depth of 3... so use >=
    if (depth >= MAX_DEPTH) {
        return; // don't draw events that close to the center, they are too far in the future
    }

    // calculate angle of dot on clock given which minute it is at
    minute = datetime.getMinutes();
    angle = (minute / minutes_in_hour) * rads_in_circle - Math.PI / 2; // offset -pi/2 so minute 0 corresponds to top of clock

    // Distance to move toward center of circle
    dist = (depth + INITIAL_OFFSET) * dot_width * SPACING_FACTOR;
    x_offset = dist * Math.cos(Math.PI - angle);
    y_offset = dist * Math.sin(Math.PI + angle);

    // Find new_top and new_left to be points on circle border based on angle
    radius = ($('.clock').width()) / 2;
    new_top = (($('.clock').height() / 2) + radius * Math.sin(angle));
    new_left = (($('.clock').width() / 2) + radius * Math.cos(angle));

    // Center dots at point on circle border, and then add offset
    // needed to bring them closer to the center.
    new_left = new_left - dot_width / 2 + x_offset;
    new_top = new_top - dot_height / 2 + y_offset;

    // Add event to the DOM, at position found, with color given, and with opacity depending on depth
    $('.clock').append('<div id="event_' + index + '" class="dot" style="left:' + new_left + 'px;top:' + new_top + 'px; background-color: ' + color + '"></div>');
    $('#event_' + index).css('opacity', (MAX_DEPTH - depth) / MAX_DEPTH - FADE_FACTOR); // faded based on depth: 1.0 opacity is fully visible, and 0.0 is fully transparent
}


// Given the datetime of an event, calculate its depth, by finding the difference between the 
// event time and the current time in hours (solely based off hour values)
function find_depth(datetime) {
    var now = new Date();
    var datetime_stamp = new Date(datetime);
    
    // Remove minutes, seconds, and millseconds so there is no rounding error when subtracting later
    datetime_stamp.setMinutes(0);
    datetime_stamp.setSeconds(0);
    datetime_stamp.setMilliseconds(0);
    now.setMinutes(0);
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    return Math.floor((datetime_stamp - now) / (1000 * 60 * 60)); // converting milliseconds difference to hours difference
}


function draw_depth_rings() {
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var dist; // distance to ring from border of clock
    var ring_width;
    var ring_height;

    // Get same border radius (right now in %), as the clock so the circles are concentric
    var border_radius = parseInt($('.clock').css('border-radius'));
    var width = $('.clock').width();
    var height = $('.clock').height();
    
    // since circle is getting smaller, have to move center to keep it in the same place
    // as the clock center (i.e. keep them concentric)
    for (var depth = 0; depth < MAX_DEPTH; depth++) {
        dist = (depth + INITIAL_OFFSET) * dot_width * SPACING_FACTOR;
        // Subtract the dist from left and right sides to get width of ring, similarly for height
        ring_width = width - 2 * dist;
        ring_height = height - 2 * dist;
        $('.clock').append('<div id="ring_' + depth + '" class="ring" style="left:' + dist + 'px; top:' + dist + 'px; border-radius:' + border_radius + '%; width:' + ring_width + 'px; height:' + ring_height + 'px;"></div>');
        $('#ring_' + depth).css('opacity', (MAX_DEPTH - depth) / MAX_DEPTH - FADE_FACTOR); // faded based on depth: 1.0 opacity is fully visible, and 0.0 is fully transparent
    }
}


/* Sets up mouseover for events */
function set_up_event_mouseover() {
    $('.dot').each(function() {
        var ID_LENGTH = 6; // length of unnecessary chars in "event_#"
        var events_list = JSON.parse(localStorage.getItem(EVENTS_LIST));

        $(this).mouseover(function() {
            var event_index = $(this).attr('id').slice(ID_LENGTH);
            var date = (new Date(events_list[event_index].datetime * 1000));
            var time = 'Time: ' + to_ampm(date);
            var elements_to_display = [
                '<p>' + events_list[event_index].description + '</p>',
                '<p>' + time + '</p>'
            ];
                        
            update_motivate_box(elements_to_display);
        });

        $(this).mouseleave(function() {
            var start_time = new Date(get_cookie('start_time'));
            var num = (new Date()) - start_time;
            var den = (new Date(get_cookie('end_time'))) - start_time;
            var elements_to_display = ['<p>' + QUOTES[cur_quote] + '</p>'];
            
            update_motivate_box(elements_to_display);
        });
    });
}

/* Handles post request to get event schedule based on input times */
function get_schedule(params) {
    $.post('/schedule', params, function(data) {
        localStorage.setItem(EVENTS_LIST, data);
        window.location.href = 'clock.html';
    });
}


function remove_event_from_clock(name) {
    // Find index of event in local storage
    var index = get_event_index(name);

    // Using index, you know id of event is #event_ + index
    if (index !== null) {
        $("#event_" + index).remove();
    }
}

/******************************************************************************
*
*                               RATINGS
*
******************************************************************************/

/* Retrieves the number of stars currently filled out to find the rating for the given
 * event name, and then adds the rating to localstorage at the same index as the event.
 * It also sends an AJAX post request to the server to save the rating */
function add_rating(event_name) {
    var index = get_event_index(name);

    // TODO add rating here
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

    console.log(milli_till_event);
    if (milli_till_event <= 0) {
        // console.log("bad time for event: " + event_to_notify.name);
        return;
    } else {
        setTimeout(notify_user, milli_till_event, 'BREAK TIME!', event_to_notify);
    }

    cur_event++;
}

function set_up_icons() {
    // Const, global icon file locations
    ICONS = {'exercise': 'img/exercise_icon.png',
             'hydration': 'img/water_icon.png',
             'food': 'img/food_icon.png',
             'walk': 'img/walk_icon.png',
             'nap': 'img/nap_icon.png',
             'caffeine': 'img/caffeine_icon.png',
             'extra': 'img/discomfort_icon.jpg'};
}

function notify_user(title, event) {
    var icon = ICONS[event.type];
    var event_date = new Date(event.datetime);

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
        body: event.name +  " (" + to_ampm(event_date) + ")"
    });

    notification.onclick = function() {
        window.focus();

        show_modal('event_modal', icon, title, event.description);
    };

    // Notification is set for next event in the queue
    set_up_notification();

    // Event is over, so remove from clock
    remove_event_from_clock(event.name);
}

function show_modal(modal_name, event_icon, event_name, event_description) {
    // Remove default modal dismissal
    $('#event_modal').modal({
        backdrop: 'static',
        keyboard: false
    });

    $('#' + modal_name).find('#modal-image').empty();
    $('#' + modal_name).find('#modal-image').append("<div class='modal-icon'><img src='" + event_icon + "' alt='event icon'></div>");
    $('#' + modal_name).find('.modal-title').text(event_name);
    $('#' + modal_name).find('.modal-body').text(event_description);
    $('#' + modal_name).modal('show');

    $("#event_done_btn").click(function () {
        add_rating(event_name);
        $('#event_modal').modal('hide');
    });
}

/******************************************************************************
*
*                          QUOTES
*
******************************************************************************/
function set_up_quotes() {
    QUOTES = ['With the new day comes new strength and new thoughts.',
              'In the middle of every difficulty lies opportunity.',
              'All we have to decide is what to do with the time that is given us.',
              'Don&#39;t let the muggles get you down.',
              'Good things come to people who wait, but better things come to those who go out and get them.',
              'If you do what you always did, you will get what you always got.',
              'If you&#39;re going through hell keep going.',
              'No masterpiece was ever created by a lazy artist.'];

    cur_quote = 0; // Global counter for quote list index

    open_curtains(500);
    $('#motivate_box').append('<p>' + QUOTES[cur_quote] + '</p>');
    // Change quote every hour
    setInterval(change_quote, 1000 * 60 * 60);
}

function change_quote() {
    random_quote = Math.floor((Math.random() * QUOTES.length) + 1);

    $('#motivate_box').append('<p>' + QUOTES[random_quote] + '</p>');
}

function open_curtains(delay) {
    $('.leftcurtain').stop().animate({width: '60px'}, delay);
    $('.rightcurtain').stop().animate({width: '60px'}, delay);
}

function close_curtains(delay) {
    $('.leftcurtain').stop().animate({width: '50%'}, delay);
    $('.rightcurtain').stop().animate({width: '50%'}, delay);
}
/******************************************************************************
*
*                          BUTTONS
*
******************************************************************************/
function set_up_end_animation() {
    document.getElementById('expander').addEventListener(
        'webkitTransitionEnd', function(e) {
            if (event.propertyName == 'height') {
                $('#finish_text').text('Congratulations champ! You nailed it!');
                $('#expander').append('<button id="reward_btn" class="btn btn-info">Reap your reward</button>');
                $('#done_btn').unbind();

                $('#reward_btn').click(function() {
                    location.href = 'https://www.youtube.com/watch?v=wDajqW561KM';
                });
            }
        }, false
    );
}

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

/* Gets a random extra event from the server */
$('#tired_btn').click(function() {
    $.post('/extra', function(data) {
        if (data) {
            extra_event = JSON.parse(data);
            event_type = extra_event.type;
            show_modal('event_modal', ICONS[event_type], extra_event.name, extra_event.description);
        } else {
            // TODO handle case when no extra events
            console.log("no events");
        }
    });
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

/* Given the name of an event, finds its index in the events array in localstorage.
 * Returns null if the event is not found
 */
function get_event_index(name) {
    var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
    var len = events.length;
    var index = null;

    for (var i = 0; i < len; i++) {
        if (events[i].name == name) {
            index = i;
        }
    }

    if (index === null) {
        console.log("Could not find index of event with name: ", name);
    }
    return index;
}

/* Given an array of string DOM elements, clears motiviate box and appends the elements in it instead */
function update_motivate_box(elements) {
    var ANIMATION_TIME = 300; // const in milliseconds for how long curtains animation lasts

    close_curtains(ANIMATION_TIME);
    var num_elements = elements.length;

    setTimeout(function() {
        $('#motivate_box').empty();

        for (var i = 0; i < num_elements; i++) {
            $('#motivate_box').append(elements[i]);
        }
        open_curtains(ANIMATION_TIME);
    }, ANIMATION_TIME);
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

/* Given a 24 hr JS Date object, return 12 hr time string */
function to_ampm(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();

  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  
  return hours + ':' + minutes + ' ' + ampm;
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
