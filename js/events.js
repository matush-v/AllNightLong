// Data for each event on the server
// Based on times send in, server returns events and times
// Events are drawn on the clock and saved in local storage
// If user completes an event
    // completed tag is added to event with user rating
// Else
    // incomplete tag is added

function draw_event(color, minute, depth) {
    var min_in_hour = 60, degrees_in_clock = 2 * Math.PI;
    var radius = parseInt($('.outer_face').css('border-radius'));
    var origin = $('.inner_face').position();
    var angle = (minute / min_in_hour) * degrees_in_clock;
    console.log(angle);

    var new_x = origin.left + (radius * Math.cos(angle));
    var new_y = origin.top + (radius * Math.sin(angle));

    console.log(origin.left, origin.top, new_x, new_y);
    // draw colored circle at that point at the passed in depth
    $('.outer_face').append('<img src="/img/dot.jpg" style="width:auto;height:auto;position:absolute;left:' + new_x + ';top:' + new_y + '"/>');

}
