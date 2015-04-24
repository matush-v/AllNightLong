/******************************************************************************
*
*                            SCHEDULING
*
******************************************************************************/

/* draw colored circle based off minute at the passed in depth */
function draw_event(color, minute, depth) {
    var minutes_in_hour = 60, rads_in_circle = 2 * Math.PI;
    /* Moves the dots of 0 depth slightly inward so they
        aren't right on the edge of the clock */
    var initial_offset = 0.5;
    var spacing_factor = 2; /* Determines space between depth levels */
    var top_z_index = 1001; /* So dots appear on top of inner face */
    angle = (minute / minutes_in_hour) * rads_in_circle - Math.PI / 2;
    radius = ($('.outer_face').width()) / 2;
    new_top = (($('.outer_face').height() / 2) + radius * Math.sin(angle));
    new_left = (($('.outer_face').width() / 2) + radius * Math.cos(angle));

    var dot_width = parseInt(get_css('width', 'dot'));
    var dot_height = parseInt(get_css('height', 'dot'));

    /* Distance to move toward center of circle */
    var dist = (depth + initial_offset) * dot_width * spacing_factor;
    var x_offset = dist * Math.cos(Math.PI - angle);
    var y_offset = dist * Math.sin(Math.PI + angle);

    /* Center dots at point on circle border, and then add offset
        needed to bring them closer to the center. */
    new_left = new_left - dot_height / 2 + x_offset;
    new_top = new_top - dot_height / 2 + y_offset;
    $('.outer_face').append('<div class="dot" style="left:' + new_left + 'px;top:' + new_top + 'px; background-color: ' + color + '"></div>');
    $('.dot').css('z-index', top_z_index);
}




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

    window.location.replace('clock.html');

    params = {'wake_up_time': toString(wake_up_time), 'end_time': toString(end_time)};


    $.post('/schedule', params, function(data) {
        // TODO
        // Events are drawn on the clock and saved in local storage
        // If user completes an event
            // completed tag is added to event with user rating
        // Else
            // incomplete tag is added
        console.log(data);
    });
});


/******************************************************************************
*
*                            NOTIFICATIONS
*
******************************************************************************/

$(document).ready(function() {
    // setTimeout(notify_user, 2000, "title!", "http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png", "message")
});

// TEST ICON: http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png
function notify_user(title, icon, message) {
    if (!Notification) {
        alert('Please upgrade to a modern version of Chrome, Firefox, Opera or Firefox.');
        return;
    }

    if (Notification.permission !== 'granted')
        // TODO add unique way to tell user why we want this functionality
        Notification.requestPermission();

    var notification = new Notification(title, {
        // TODO change icon based on event
        icon: icon,
        body: message
    });

    notification.onclick = function() {
        window.focus();
    };
}



/******************************************************************************
*
*                            HELPERS
*
******************************************************************************/


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
