EVENTS_LIST = 'events'; // Const name of schedule item in localStorage
LS_RATINGS_KEY = 'ratings';
LS_CUR_EVENT_KEY = 'cur_event';
LS_END_TIME_KEY = 'end_time';

$(document).ready(function() {

    if (top.location.pathname == '/clock.html') {
        document.documentElement.style.overflowX = 'hidden';
        // added here so it can be removed later so confetti shows and
        //  reap reward button works
        $("#expander").css("position", "absolute");

        // Vertically center clock based on screen size
        center_clock();

        // Quotes/info box
        set_up_quotes();

        // Icons for notifications
        set_up_icons();

        $("#end_time").text("All Nighter End Time: " + to_ampm(new Date(localStorage.getItem(LS_END_TIME_KEY))));

        // Initialize ratings array in localStorage
        if (!localStorage.getItem(LS_RATINGS_KEY)) {
            localStorage.setItem(LS_RATINGS_KEY, '[]');
        }

        var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
        var today = new Date();
        
        cur_event = localStorage.getItem(LS_CUR_EVENT_KEY);
        if (cur_event === null) {
            // No events have been completed yet, so start at the first event
            cur_event = 0; // Global counter for event list index
            localStorage.setItem(LS_CUR_EVENT_KEY, 0);
        }

        // Notification is set for first event in the queue
        set_up_notification();

        draw_events(events);

        // Mousing over events will change the box info
        set_up_event_mouseover();

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
    var offset = get_offset_to_UTC(); // get difference in hours between local timezone and UTC timezone
    // Set seconds and milliseconds to 0 so any events created are based off the minute and not sec or ms
    cur_time.setSeconds(0);
    cur_time.setMilliseconds(0);

    if (validate_times(wake_up_time, end_time)) {

        if (end_hour_min.hour <= cur_time.getHours()) {
            end_date.setDate(end_date.getDate() + 1);
        }

        end_date.setHours(end_hour_min.hour);
        end_date.setMinutes(end_hour_min.min);
        localStorage.setItem(LS_END_TIME_KEY, end_date); // Save end time to local storage

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
        draw_event('yellow', i, new Date(events[i].datetime));
    }

    draw_depth_rings();
}


/* Given a CSS color, index of the event, and the JS date of the event,
/* draw colored circle based off minute at depth based off hour */
function draw_event(color, index, date) {
    var minutes_in_hour = 60, rads_in_circle = 2 * Math.PI;
    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));
    var now = new Date();
    var dist = null;
    var x_offset, y_offset = null;
    var minute = null;
    var depth;

    if (date < now) {
        return; // event is in the past
    }

    // depth is difference in hours
    depth = find_depth(date);

    // depth can be 0, 1, 2 for max depth of 3... so use >=
    if (depth >= MAX_DEPTH) {
        return; // don't draw events that close to the center, they are too far in the future
    }

    // calculate angle of dot on clock given which minute it is at
    minute = date.getMinutes();
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


// Given the JS date of an event, calculate its depth, by finding the difference between the 
// event time and the current time in hours (solely based off hour values)
function find_depth(date) {
    var now = new Date();
    var date_stamp = new Date(date);
    
    // Remove minutes, seconds, and millseconds so there is no rounding error when subtracting later
    date_stamp.setMinutes(0);
    date_stamp.setSeconds(0);
    date_stamp.setMilliseconds(0);
    now.setMinutes(0);
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    return Math.floor((date_stamp - now) / (1000 * 60 * 60)); // converting milliseconds difference to hours difference
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
            var date = new Date(events_list[event_index].datetime);
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
            change_quote(true);
            
        });
    });
}

/* Handles post request to get event schedule based on input times */
function get_schedule(params) {
    $.post('/schedule', params, function(data) {
        events = JSON.parse(data);
        // Run through given datetimes and convert to milliseconds before storing in localStorage
        var num_events = events.length;
        for (var i = 0; i < num_events; i++) {
            // datetime is a unix timestamp (in seconds), converting to milliseconds for easy conversion to JS Date later
            // with the line: new Date(events[i].datetime)
            events[i].datetime = events[i].datetime * 1000;
        }

        localStorage.setItem(EVENTS_LIST, JSON.stringify(events));
        window.location.href = 'clock.html';
    });
}

/******************************************************************************
*
*                               RATINGS
*
******************************************************************************/

/* Retrieves the number of stars currently filled out to find the rating for event in the modal,
 * and then adds the rating to localstorage in array with the key as event index and a rating/time
 * object as the value
 * It also sends an AJAX post request to the server to save the rating
 * NOTE: event_index is an optional parameter, if it is set, then the event is from the schedule, otherwise
 * it must be from the extra events list. So, only set localstorage if the index exists
 */
function add_rating(event_index) {
    // Get ratings list and events list from localStorage
    var ratings = JSON.parse(localStorage.getItem(LS_RATINGS_KEY));
    var events = JSON.parse(localStorage.getItem(EVENTS_LIST));
    // Get rating from modal radio input
    var rating = $('input[name="event_rating"]:checked').val();

    if (rating === undefined) {
        // no rating, return
        return;
    }

    event_name = $(".modal-title").text();

    var rating_dict = {
        event_name : event_name,
        rating : rating, // integer value 1-5
        event_time : new Date()  // timestamp (ms) of event completion for statistics collection
    };

    // If event_index exists, update localstorage 
    if (event_index !== undefined) {
        ratings[event_index] = rating_dict;
        // Update localStorage with new rating
        localStorage.setItem(LS_RATINGS_KEY, JSON.stringify(ratings));
    }

    // Send rating to server asynchronously to save to DB
    var post_params = rating_dict;
    post_params['utc_offset'] = get_offset_to_UTC();
    $.post('/add_rating', post_params)
        .fail(function () {
            console.log("Rating failed to save");
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
    var milli_till_event = new Date(event_to_notify.datetime) - now;

    if (milli_till_event <= 0) {
        // console.log("bad time for event: " + event_to_notify.name);
        return;
    } else {
        setTimeout(notify_user, milli_till_event, 'BREAK TIME!', event_to_notify);
    }
}

function set_up_icons() {
    // Const, global icon file locations
    ICONS = {'exercise': 'img/exercise_icon.png',
             'hydration': 'img/water_icon.png',
             'food': 'img/food_icon.png',
             'walk': 'img/walk_icon.png',
             'nap': 'img/nap_icon.png',
             'caffeine': 'img/caffeine_icon.png',
             'extra': 'img/quick_burst_icon.jpg'};
}

function notify_user(title, event) {
    // This event is done, move on to next one
    cur_event++;
    localStorage.setItem(LS_CUR_EVENT_KEY, cur_event);

    var icon = ICONS[event.type];

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
        body: event.name +  " (" + to_ampm(new Date(event.datetime)) + ")"
    });

    notification.onclick = function() {
        window.focus();
        // The index of the event is always cur_event - 1 since that counter is incremented every time
        // a notification is set up to occur. Since this event's notification already went off (hence removal from clock),
        // the counter must have been incremented to the next event already
        var event_index = cur_event - 1;
        show_modal('event_modal', icon, event.name, event.description, event_index);
        // Event is over, so remove from clock
        $("#event_" + event_index).remove();

    };
    
    // Notification is set for next event in the queue
    set_up_notification();
}

function show_modal(modal_name, event_icon, event_name, event_description, event_index) {
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
        // Add the user's rating
        add_rating(event_index);
        $('#event_modal').modal('hide');
    });
}

/******************************************************************************
*
*                          QUOTES
*
******************************************************************************/
function set_up_quotes() {
    QUOTES = [['With the new day comes new strength and new thoughts.', 'someone clever'],
              ['In the middle of every difficulty lies opportunity.', 'someone clever'],
              ['All we have to decide is what to do with the time that is given us.', 'someone clever'],
              ['Don&#39;t let the muggles get you down.', 'someone clever'],
              ['Good things come to people who wait, but better things come to those who go out and get them.', 'someone clever'],
              ['If you do what you always did, you will get what you always got.', 'someone clever'],
              ['If you&#39;re going through hell keep going.', 'someone clever'],
              ['No masterpiece was ever created by a lazy artist.', 'someone clever'],
              ['Life is about making an impact, not making an income.', 'Kevin Kruse'],
              ['Whatever the mind of man can conceive and believe, it can achieve.', 'Napoleon Hill'],
              ['Strive not to be a success, but rather to be of value.', 'Albert Einstein'],
              ['Two roads diverged in a wood, and I—I took the one less traveled by, And that has made all the difference.',  'Robert Frost'],
              ['I attribute my success to this: I never gave or took any excuse.', 'Florence Nightingale'],
              ['You miss 100% of the shots you don’t take.', 'Wayne Gretzky'],
              ['I’ve missed more than 9000 shots in my career. I’ve lost almost 300 games. 26 times I’ve been trusted to take the game winning shot and missed. I’ve failed over and over and over again in my life. And that is why I succeed.', 'Michael Jordan'],
              ['The most difficult thing is the decision to act, the rest is merely tenacity.', 'Amelia Earhart'],
              ['Every strike brings me closer to the next home run.', 'Babe Ruth'],
              ['Definiteness of purpose is the starting point of all achievement.', 'W. Clement Stone'],
              ['Life isn’t about getting and having, it’s about giving and being.', 'Kevin Kruse'],
              ['Life is what happens to you while you’re busy making other plans.', 'John Lennon'],
              ['We become what we think about.', 'Earl Nightingale'],
              ['Twenty years from now you will be more disappointed by the things that you didn’t do than by the ones you did do, so throw off bowlines, sail away from safe harbor, catch the trade winds in your sails.  Explore, Dream, Discover.', 'Mark Twain'],
              ['Life is 10% what happens to me and 90% of how I react to it.', 'Charles Swindoll'],
              ['The most common way people give up their power is by thinking they don’t have any.', 'Alice Walker'],
              ['The mind is everything. What you think you become. ', 'Buddha'],
              ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb'],
              ['An unexamined life is not worth living.', 'Socrates'],
              ['Eighty percent of success is showing up.', 'Woody Allen'],
              ['Your time is limited, so don’t waste it living someone else’s life.', 'Steve Jobs'],
              ['Winning isn’t everything, but wanting to win is.', 'Vince Lombardi'],
              ['I am not a product of my circumstances. I am a product of my decisions.', 'Stephen Covey'],
              ['Every child is an artist.  The problem is how to remain an artist once he grows up.', 'Pablo Picasso'],
              ['You can never cross the ocean until you have the courage to lose sight of the shore.', 'Christopher Columbus']
             ] ;

    change_quote();
    // Change quote every hour
    setInterval(change_quote, 1000 * 60 * 60);
}

function change_quote(use_cur) {
    if (!use_cur) {
        cur_quote = Math.floor((Math.random() * QUOTES.length) + 1);
    }
    update_motivate_box(['<p>&quot;' + QUOTES[cur_quote][0] + '&quot; - ' + QUOTES[cur_quote][1] + '</p>']);
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
                start_confetti();
                $('#finish_text').text('Congratulations champ! You nailed it!');
                $('#expander').append('<button id="reward_btn" class="btn btn-info">Reap your reward</button>');
                $('#done_btn').unbind();
                $(document).unbind("mouseup");
                localStorage.clear();
                $('#expander').css("position", ""); // allows reap reward button to work
                $('#reward_btn').click(function() {
                    location.href = 'https://www.youtube.com/watch?v=wDajqW561KM';
                });
            }
        }, false
    );
}

// Mousedown on button causes expansion of ending screen
$('#done_btn').mousedown(function() {
    $('body').css('user-select', 'none').prop('unselectable', 'on').on('selectstart', false);
    expand();
});

// Mouseup anywhere causes ending screen to be minimized
$(document).mouseup(function () {
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

// Vertically centers clock based on screen height and clock height
function center_clock() {
    var screen_height = $(document).height();
    var clock_height = parseInt($(".clock-wrapper").css("height"), 10);
    var new_top = (screen_height - clock_height) / 2;

    $(".clock-wrapper").css("top", new_top);
}

/* Given an array of string DOM elements, clears motiviate box and appends the elements in it instead */
function update_motivate_box(elements) {
    var num_elements = elements.length;

    $('#motivate_box').empty();

    for (var i = 0; i < num_elements; i++) {
        $('#motivate_box').append(elements[i]);
    }
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

/* Gets difference in hours between local timezone and UTC timezone */
function get_offset_to_UTC() {
    var d = new Date();
    return d.getTimezoneOffset() / 60;
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
