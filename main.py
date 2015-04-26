'''
GAE server for All Night Long
'''

import webapp2
import logging
import jinja2
import json
import os
import time
import calendar
import random
from google.appengine.ext import db
from datetime import datetime, date, timedelta


'''
DATABASE
'''
class Events(db.Model):
    name = db.StringProperty()
    event_type = db.StringProperty() # water, food, or exercise
    description = db.StringProperty()
    ratings = db.StringListProperty() # list of {"rating": x, "time": y} objects as strings


'''
HANDLERS
'''
JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainHandler(webapp2.RequestHandler):
    '''
    Main handler for splash page
    '''
    def get(self):
        '''
        User get request for rendering index.html
        '''
        template_values = {}
        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

class Clock(webapp2.RequestHandler):
    '''
    Handler for clock and events page
    '''
    def get(self):
        '''
        User get request for rendering clock.html
        '''
        template_values = {}
        template = JINJA_ENVIRONMENT.get_template('clock.html')
        self.response.write(template.render(template_values))

class Schedule(webapp2.RequestHandler):
    def post(self):
        '''
        API for adding an event, getting a schedule, or adding a rating
        rating must be an integer 
        '''
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'

        wake_up_time = self.request.get("wake_up_time")
        end_time = int(self.request.get("end_time"))
        cur_time = int(self.request.get("cur_time"))

        name = self.request.get("name")
        event_type = self.request.get("event_type")
        description = self.request.get("description")
        
        rating = self.request.get("rating") # assumed to be {"rating": x, "time": y}
        rating = int(rating) if rating else rating # convert to int

        if name and event_type and description:
            # adds event
            if self.add_event(name, event_type, description):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Event!")

        elif wake_up_time and end_time and cur_time:
            # creates schedule for user
            schedule = self.get_schedule(wake_up_time, end_time, cur_time)

            self.response.out.write(json.dumps(schedule))

        elif name and rating:
            # adds rating
            if self.add_rating(name, rating):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Rating!")
        else:
            self.response.out.write("Please provide correct parameters")

    def add_event(self, name, event_type, description):
        '''
        Adds a new event to the database
        Event cannot exist already
        Returns True if successful, False if failed
        '''
        try:
            all_events = Events.all()
            all_events.filter("name =", name) # query event

            if all_events.count():
                logging.error("Event already exists")
                raise

            Events(name=name, event_type=event_type, description=description, ratings=[]).put()
        except Exception:
            return False

        return True

    def get_schedule(self, wake_up_time, end_time, cur_time):
        '''
        Returns list of times and events that should be done at those times
        '''
        # TODO run algorithm and create array of event objects
        # TODO get cur_time from client
        # TODO F with timezones

        events = []

        cur_time = datetime.fromtimestamp(cur_time)
        cur_time = cur_time - timedelta(hours=4)

        end_time = datetime.fromtimestamp(end_time)
        end_time = end_time - timedelta(hours=4) 

        halfway_time = cur_time + (end_time - cur_time) / 2

        ###################### WATER ##########################
        event_type = "hydration"
        event_name = "Is It In You"
        description = "Drink a glass of water."
        water_time = cur_time + timedelta(minutes=45)
        
        while water_time < end_time:
            logging.warn("WATER TIME ================= " + str(water_time))
            logging.warn("END TIME ================= " + str(end_time))
            events.append({'name': event_name, 'type': event_type, 'description': description, 'datetime': calendar.timegm((water_time + timedelta(hours=4)).timetuple())})
            water_time += timedelta(hours=1)

        #######################################################


        ####################### NAP ############################
        event_type = "nap"
        event_name = "Siesta"
        description = "Rest easy with a 20 minute nap."
        best_nap_time_shift = (int(wake_up_time[0:2]) / 2) - 1.5 # slice to get the hour
        best_nap_time = cur_time
        
        if (cur_time.hour >= 12): # PM so we need to add a day for nap
            best_nap_time = best_nap_time.replace(day=best_nap_time.day + 1)

        best_nap_time = best_nap_time.replace(hour=int(best_nap_time_shift))
        
        if best_nap_time_shift % 1 != 0: # has .5 so we need to add 30 min
            half_hour = 30
            best_nap_time = best_nap_time.replace(minute=half_hour)

        best_nap_time = best_nap_time + timedelta(hours=4)
        
        events.append({'name': event_name, 'type': event_type, 'description': description, 'datetime': calendar.timegm((best_nap_time + timedelta(hours=4)).timetuple())})

        # TODO: Check to make sure there is no water break overlap with the nap

        #######################################################

        ########################### WALK ######################
        event_type = "walk"
        event_name = "Freshen Up"
        description = "Go for a 10 minute walk"

        if end_time.hour < 5 and cur_time.hour <= 23: # end_time is before 5 AM and it's currently before midnight
            # walk should be set to near beginning
            best_walk_time = cur_time + timedelta(hours=1)
            rand_min = random.randrange(0, 60)
            # TODO add while loop to catch for time collisions
            best_walk_time = best_walk_time + timedelta(minutes=rand_min)
        else:
            # walk should be set to near end
            best_walk_time = end_time - timedelta(hours=1)
            rand_min = random.randrange(0, 60)
            best_walk_time = best_walk_time - timedelta(minutes=rand_min)

        events.append({'name': event_name, 'type': event_type, 'description': description, 'datetime': calendar.timegm((best_walk_time + timedelta(hours=4)).timetuple())})

        ######################################################


        ################### CAFFEINE #########################
        # Put it right before nap so it kicks in as they wake up
        event_type = "caffeine"
        event_name = "CAFFEINE!"
        description = "Get hyped up with the world's favorite chemical. It takes about 20 minutes, so this is the perfect time to nap."

        best_caffeine_time = best_nap_time - timedelta(minutes=5)

        events.append({'name': event_name, 'type': event_type, 'description': description, 'datetime': calendar.timegm((best_caffeine_time + timedelta(hours=4)).timetuple())})

        ######################################################


        ####################### FOOD #########################
        # Every two hours until halfway point, then every hour
        event_type = "food"
        event_name = "Feast"
        description = "Bulk up with some protein and eat something nutritious. Carbs are evil."

        food_time = cur_time + timedelta(hours=1)

        while food_time < end_time:
            events.append({'name': event_name, 'type': event_type, 'description': description, 'datetime': calendar.timegm((food_time + timedelta(hours=4)).timetuple())})

            if food_time >= halfway_time:
                food_time += timedelta(hours=1)
            else:
                food_time += timedelta(hours=2)

        ######################################################

        ####################### EXERCISE #####################
        # Ever-y two hours until halfway point, then every hour

        # TODO get stretching pics
        exercises = [{'name': 'Pump It', 'description': "Let's get old-fashioned with ten pushups."},
                     {'name': 'Jumper', 'description': "Bet you can't do twenty."},
                     {'name': 'Bend That Body', 'description': "Get flexible. Try these easy stretches."}]
        event_type = "exercise"
        event_name = "Feast"
        description = "Bulk up with some protein and eat something nutritious. Carbs are evil."

        exercise_time = cur_time + timedelta(hours=1) + timedelta(minutes=15)


        while exercise_time < end_time:
            exercise = random.choice(exercises)
            events.append({'name': exercise['name'], 'type': event_type, 'description': exercise['description'], 'datetime': calendar.timegm((exercise_time + timedelta(hours=4)).timetuple())})

            if exercise_time >= halfway_time:
                exercise_time += timedelta(hours=1)
            else:
                exercise_time += timedelta(hours=2)

        ######################################################

        events = sorted(events, key=lambda k: k['datetime'])

        return events

    def add_rating(self, name, rating):
        '''
        Adds rating to specified event
        Event must exist
        Rating must be 1 - 5
        Returns True if successful, False if failed
        '''

        try:
            if rating > 5 or rating < 1:
                logging.error("Rating " + str(rating) + " is out of range")
                raise

            all_events = Events.all()
            all_events.filter("name =", name) # query event
            specific_event = all_events.get() # get event instance

            if specific_event:
                specific_event.ratings.append(str(rating)) # add rating
                specific_event.put() # update event
            else:
                logging.error("Event does not exist")
                raise
        except Exception:
            return False

        return True

dthandler = lambda obj: (
    obj.isoformat()
    if isinstance(obj, datetime)
    or isinstance(obj, date)
    else None)

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/clock.html', Clock),
    ('/schedule', Schedule)
    ], debug=True)
