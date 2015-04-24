# AllNightLong
_____________________________________________________________________________________
###WHAT
AllNightLong is a ~~dating site~~ tool for those who need to stay up all night 
to get work done. We incorporate multiple studies and tips found throughout the web. 
_____________________________________________________________________________________
###IDEAS
* Sexual innuendos
* Review raizlabs slides
* Red: Nap, Blue: Water, Black: Exercise, Yellow: Food
_____________________________________________________________________________________
###TODO

* ALWAYS USE UNDERSCORE CASING
* Sexy graphics (clock) - M
 + Landing page
  * Input will be saved as cookies that expire in 12 hours
  * Copyright and small hr needs to be shifted to the bottom - S
  * Needs larger space between the two inputs - S
  * “Lets do this!” button needs to be bigger - S
 + Clock page
  * I’M DONE!! button
  * I’m too tired! button
   + Anything user does is added to the localstorage 
  * Very nice clock with hour and minute hand (optional second hand)
    * Make Hour and Minute hand pointed like in luxury watches
  * Should be able to put colored dots between hours in clock
  * Quote box that gives a new quote every hour
    * Also displays event info onmouseover
* Creating a schedule
  * sexy graphics and JS 
    * Dot schedule for the current hour in outtermost rim
    * Faded dot schedule for the next hour in inner rim
    * Most faded dot schedule for the next next hour in innermost rim
  * EC: Scroll down to see later events, scroll up to see recent events
* Notifications
  * change notification icon TODO exists
  * modals for each event
    * Every time a user does not complete an event, add it to localstorage and adjust schedule
    * If completed, ask for user feedback
  * EC: yelling to get off Facebook, Twitter, etc. - M, S
    * Might have issues with privacy
* Schedule Adjustment - M, S
  * events known about previous event completion (e.g. you didn't walk last time)
  * “UNCLE!” button - make it a sexual safety word (pineapple,  bananaanana)
    * uncle changes to other sex safety words randomly
  * based off science and user feedback from notifications
* Extreme Motivation
  * fun surprises (motivational quotes n stuff)
* Prettify
  * Optional minute hand
  * Add unique way to tell user why we want desktop notifications TODO exists
  * Info box parts like curtains to show event info onmouseover and animates back after
  * Have progress bar to let person know how close they are to finishing the all nighter
    * Bar is along clock based on hour hand and goes from light green to dark green with % next to it
* Eyes Hurt?
  * Recommend F.lux
* Ergonomic Recommendations under tips
* YSLOW and Audit
* Optimization!
* Restrict CORS access

_____________________________________________________________________________________
###DISCLAIMERS
* This site is not intended for consecutive use as sleep deprivation is a serious issue. If you can, please try to get sleep rather than stay up all night.
* The tips and research used on the site are found from credible sources online, but are not clinically proven. Please use your discretion when utilizing this tool.


_____________________________________________________________________________________
###Notes
* [Google Doc](https://docs.google.com/document/d/1HefTgwVjsmFp0Rb51QlaaActSngOeAcsKkvKXkPsM9g/edit)
* Example circular icons for our dots around clock: http://stackoverflow.com/questions/12813573/position-icons-into-circle 
    - JS fiddle generalizing example above that might be even more useful: http://jsfiddle.net/sajjansarkar/zgcgq8cg/
