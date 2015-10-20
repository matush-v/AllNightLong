/***********************************************
* CSS3 Analog Clock- by JavaScript Kit (www.javascriptkit.com)
* Visit JavaScript Kit at http://www.javascriptkit.com/ for this
* script and 100s more
***********************************************/

/*var $hands = $('#liveclock div.hand');

window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               function(f){setTimeout(f, 60)};

function updateclock() {
    var curdate = new Date();
    var hour_as_degree = (curdate.getHours() + curdate.getMinutes() / 60) / 12 * 360;
    var minute_as_degree = curdate.getMinutes() / 60 * 360;
    var second_as_degree = (curdate.getSeconds() + curdate.getMilliseconds() / 1000) / 60 * 360;

    $hands.filter('.hour').css({transform: 'rotate(' + hour_as_degree + 'deg)' });
    $hands.filter('.minute').css({transform: 'rotate(' + minute_as_degree + 'deg)' });
    $hands.filter('.second').css({transform: 'rotate(' + second_as_degree + 'deg)' });

    requestAnimationFrame(updateclock);
}

$(document).ready(function() {
  requestAnimationFrame(updateclock);
});
*/


/**********************************************************************
*
*                              NEW CLOCK JS
*
***********************************************************************/
window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               function(f) { f; };

function updateclock() {
    var animation_delay = 3 // seconds based on drawing of clock, hour, min, and second hand
    var curdate = new Date();
    var hour_as_degree = (curdate.getHours() + curdate.getMinutes() / 60) / 12 * 360;
    var minute_as_degree = curdate.getMinutes() / 60 * 360;
    var second_as_degree = (curdate.getSeconds() + animation_delay) / 60 * 360;

    $('.hour').css({transform: 'rotate(' + hour_as_degree + 'deg)' });
    $('.minute').css({transform: 'rotate(' + minute_as_degree + 'deg)' });
    $('.second').css({transform: 'rotate(' + second_as_degree + 'deg)' });
}

$(document).ready(function() {
  requestAnimationFrame(updateclock);
});
