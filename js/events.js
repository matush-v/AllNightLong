// Data for each event on the server
// Based on times send in, server returns events and times
// Events are drawn on the clock and saved in local storage
// If user completes an event
    // completed tag is added to event with user rating
// Else
    // incomplete tag is added

function draw_event(color, minute, depth) {
    // draw colored circle at that point at the passed in depth
    
    radius = ($(".outer_face").width()) / 2;
    tmpTop = (($(".outer_face").height() / 2) + radius * Math.sin(1.57));
    tmpLeft = (($(".outer_face").width() / 2) + radius * Math.cos(1.57));
    
    $('.outer_face').append('<img src="/img/dot.jpg" style="width:auto;height:auto;position:absolute;left:' + tmpLeft + 'px;top:' + tmpTop + 'px"/>');
}
