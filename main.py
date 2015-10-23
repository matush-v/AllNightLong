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
    event_type = db.StringProperty()  # water, food, or exercise
    description = db.StringProperty()
    # Sean isn't sure if we need to store the times of ratings as well --- 10/22/2015
    # A possible reason for this is to see at what time in the night the events worked best for the user
        # it currently is implemented as a list of string integers
    ratings = db.StringListProperty()  # list of {"rating": x, "time": y} objects as strings


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
    HYDRATION = "hydration"
    NAP = "nap"
    WALK = "walk"
    CAFFEINE = "caffeine"
    FUEL = "fuel"
    EXERCISE = "exercise"

    def post(self):
        '''
        API for getting a schedule
        '''
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'

        wake_up_time = self.request.get("wake_up_time")
        end_time = self.request.get("end_time")
        end_time = int(end_time) if end_time else end_time
        cur_time = self.request.get("cur_time")
        cur_time = int(cur_time) if cur_time else cur_time
        utc_offset = self.request.get("utc_offset")
        utc_offset = int(utc_offset) if utc_offset else utc_offset
        
        
        if wake_up_time and end_time and cur_time and utc_offset:
            # creates schedule for user
            schedule = self.get_schedule(wake_up_time, end_time, cur_time, utc_offset)

            self.response.out.write(json.dumps(schedule))
        else:
            self.response.out.write("Please provide correct parameters")

    def get_hydration_events(self, cur_time, end_time, utc_offset):
        all_events = Events.all()
        all_events.filter('event_type =', self.HYDRATION)
        specific_event = all_events.get()  # assumes only one water event
        hydration_events = []

        water_time = cur_time + timedelta(minutes=45)

        while water_time < end_time:
            hydration_events.append({'name': specific_event.name,
                           'type': specific_event.event_type,
                           'description': specific_event.description,
                           'datetime': calendar.timegm((water_time + timedelta(hours=utc_offset)).timetuple())})
            water_time += timedelta(hours=1)

        return hydration_events

    def get_nap_event(self, cur_time, wake_up_time, utc_offset):
        all_events = Events.all()
        all_events.filter('event_type =', self.NAP)
        specific_event = all_events.get()
        nap_event = []

        nap_event.append({'name': specific_event.name,
                       'type': specific_event.event_type,
                       'description': specific_event.description,
                       'datetime': calendar.timegm((self.get_best_nap_time(cur_time, wake_up_time) + timedelta(hours=utc_offset)).timetuple())})

        # TODO: Check to make sure there is no water break overlap with the nap
        return nap_event

    @staticmethod
    def get_best_nap_time(cur_time, wake_up_time):
        best_nap_time = cur_time
        best_nap_time_shift = (int(wake_up_time[0:2]) / 2) - 1.5  # slice to get the hour

        if cur_time.hour >= 12:  # PM so we need to add a day for nap
            best_nap_time += timedelta(days=1)

        best_nap_time = best_nap_time.replace(hour=int(best_nap_time_shift))
        
        if best_nap_time_shift % 1 != 0: # has .5 so we need to add 30 min
            half_hour = 30
            best_nap_time = best_nap_time.replace(minute=half_hour)

        return best_nap_time

    def get_walk_event(self, cur_time, end_time, utc_offset):
        all_events = Events.all()
        all_events.filter('event_type =', self.WALK)
        specific_event = all_events.get()
        walk_event = []

        if end_time.hour < 5 and cur_time.hour <= 23:
            # end_time is before 5 AM and it's currently before midnight
            #  so walk should be set to near beginning
            best_walk_time = cur_time + timedelta(hours=1)
            rand_min = random.randrange(0, 60)
            # TODO add while loop to catch for time collisions
            best_walk_time = best_walk_time + timedelta(minutes=rand_min)
        else:
            # walk should be set to near end
            best_walk_time = end_time - timedelta(hours=1)
            rand_min = random.randrange(0, 60)
            best_walk_time = best_walk_time - timedelta(minutes=rand_min)

        walk_event.append({'name': specific_event.name,
                       'type': specific_event.event_type,
                       'description': specific_event.description,
                       'datetime': calendar.timegm((best_walk_time + timedelta(hours=utc_offset)).timetuple())})

        return walk_event

    def get_caffeine_event(self, cur_time, wake_up_time, utc_offset):
        all_events = Events.all()
        all_events.filter('event_type =', self.CAFFEINE)
        specific_event = all_events.get()
        caffeine_event = []

        # Put it right before nap so it kicks in as they wake up
        best_caffeine_time = self.get_best_nap_time(cur_time, wake_up_time) - timedelta(minutes=5)

        caffeine_event.append({'name': specific_event.name,
                       'type': specific_event.event_type,
                       'description': specific_event.description,
                       'datetime': calendar.timegm((best_caffeine_time + timedelta(hours=utc_offset)).timetuple())})

        return caffeine_event

    def get_fuel_events(self, cur_time, end_time, utc_offset):
        # Every two hours until halfway point, then every hour
        all_events = Events.all()
        all_events.filter('event_type =', self.FUEL)
        specific_event = all_events.get()
        fuel_events = []

        food_time = cur_time + timedelta(hours=1)
        halfway_time = cur_time + (end_time - cur_time) / 2

        while food_time < end_time:
            fuel_events.append({'name': specific_event.name,
                           'type': specific_event.event_type,
                           'description': specific_event.description,
                           'datetime': calendar.timegm((food_time + timedelta(hours=utc_offset)).timetuple())})

            if food_time >= halfway_time:
                food_time += timedelta(hours=1)
            else:
                food_time += timedelta(hours=2)

        return fuel_events

    def get_exercise_events(self, cur_time, end_time, utc_offset):
        # Every two hours until halfway point, then every hour
        all_events = Events.all(keys_only=True)
        all_events.filter('event_type =', self.EXERCISE)
        item_keys = all_events.fetch(1000)
        exercise_events = []

        # TODO get stretching pics
        exercise_time = cur_time + timedelta(hours=1) + timedelta(minutes=15)
        halfway_time = cur_time + (end_time - cur_time) / 2

        while exercise_time < end_time:
            exercise_key = random.choice(item_keys)
            specific_event = Events.get(exercise_key)

            exercise_events.append({'name': specific_event.name,
                           'type': specific_event.event_type,
                           'description': specific_event.description,
                           'datetime': calendar.timegm((exercise_time + timedelta(hours=utc_offset)).timetuple())})

            if exercise_time >= halfway_time:
                exercise_time += timedelta(hours=1)
            else:
                exercise_time += timedelta(hours=2)

        return exercise_events

    def get_schedule(self, wake_up_time, end_time, cur_time, utc_offset):
        '''
        Returns list of times and events that should be done at those times
        '''
        events = []

        cur_time = datetime.fromtimestamp(cur_time)
        cur_time = cur_time - timedelta(hours=utc_offset)

        end_time = datetime.fromtimestamp(end_time)
        end_time = end_time - timedelta(hours=utc_offset)


        ###################### HYDRATION ##########################
        # all_events = Events.all()
        # all_events.filter('event_type =', self.HYDRATION)
        # specific_event = all_events.get()  # assumes only one water event

        # water_time = cur_time + timedelta(minutes=45)

        # while water_time < end_time:
        #     events.append({'name': specific_event.name,
        #                    'type': specific_event.event_type,
        #                    'description': specific_event.description,
        #                    'datetime': calendar.timegm((water_time + timedelta(hours=utc_offset)).timetuple())})
        #     water_time += timedelta(hours=1)
        events += self.get_hydration_events(cur_time, end_time, utc_offset)
        #######################################################


        ####################### NAP ############################
        # all_events = Events.all()
        # all_events.filter('event_type =', self.NAP)
        # specific_event = all_events.get()

        # best_nap_time_shift = (int(wake_up_time[0:2]) / 2) - 1.5  # slice to get the hour
        # best_nap_time = cur_time

        # if cur_time.hour >= 12:  # PM so we need to add a day for nap
        #     best_nap_time += timedelta(days=1)

        # best_nap_time = best_nap_time.replace(hour=int(best_nap_time_shift))
        
        # if best_nap_time_shift % 1 != 0: # has .5 so we need to add 30 min
        #     half_hour = 30
        #     best_nap_time = best_nap_time.replace(minute=half_hour)

        # best_nap_time = best_nap_time + timedelta(hours=utc_offset) # TODO: dafaq why is here twice?
        
        # events.append({'name': specific_event.name,
        #                'type': specific_event.event_type,
        #                'description': specific_event.description,
        #                'datetime': calendar.timegm((best_nap_time + timedelta(hours=utc_offset)).timetuple())})

        # # TODO: Check to make sure there is no water break overlap with the nap
        events += self.get_nap_event(cur_time, wake_up_time, utc_offset)
        #######################################################

        ########################### WALK ######################
        # all_events = Events.all()
        # all_events.filter('event_type =', self.WALK)
        # specific_event = all_events.get()

        # if end_time.hour < 5 and cur_time.hour <= 23:
        #     # end_time is before 5 AM and it's currently before midnight
        #     #  so walk should be set to near beginning
        #     best_walk_time = cur_time + timedelta(hours=1)
        #     rand_min = random.randrange(0, 60)
        #     # TODO add while loop to catch for time collisions
        #     best_walk_time = best_walk_time + timedelta(minutes=rand_min)
        # else:
        #     # walk should be set to near end
        #     best_walk_time = end_time - timedelta(hours=1)
        #     rand_min = random.randrange(0, 60)
        #     best_walk_time = best_walk_time - timedelta(minutes=rand_min)

        # events.append({'name': specific_event.name,
        #                'type': specific_event.event_type,
        #                'description': specific_event.description,
        #                'datetime': calendar.timegm((best_walk_time + timedelta(hours=utc_offset)).timetuple())})
        events += self.get_walk_event(cur_time, end_time, utc_offset)

        ######################################################


        ################### CAFFEINE #########################
        # all_events = Events.all()
        # all_events.filter('event_type =', self.CAFFEINE)
        # specific_event = all_events.get()

        # # Put it right before nap so it kicks in as they wake up
        # best_caffeine_time = best_nap_time - timedelta(minutes=5)

        # events.append({'name': specific_event.name,
        #                'type': specific_event.event_type,
        #                'description': specific_event.description,
        #                'datetime': calendar.timegm((best_caffeine_time + timedelta(hours=utc_offset)).timetuple())})

        events += self.get_caffeine_event(cur_time, wake_up_time, utc_offset)
        ######################################################


        ####################### FUEL #########################
        # # Every two hours until halfway point, then every hour
        # all_events = Events.all()
        # all_events.filter('event_type =', self.FUEL)
        # specific_event = all_events.get()

        # food_time = cur_time + timedelta(hours=1)

        # while food_time < end_time:
        #     events.append({'name': specific_event.name,
        #                    'type': specific_event.event_type,
        #                    'description': specific_event.description,
        #                    'datetime': calendar.timegm((food_time + timedelta(hours=utc_offset)).timetuple())})

        #     if food_time >= halfway_time:
        #         food_time += timedelta(hours=1)
        #     else:
        #         food_time += timedelta(hours=2)

        events += self.get_fuel_events(cur_time, end_time, utc_offset)
        ######################################################

        ####################### EXERCISE #####################
        # # Ever-y two hours until halfway point, then every hour
        # all_events = Events.all(keys_only=True)
        # all_events.filter('event_type =', self.EXERCISE)
        # item_keys = all_events.fetch(1000)

        # # TODO get stretching pics
        # exercise_time = cur_time + timedelta(hours=1) + timedelta(minutes=15)

        # while exercise_time < end_time:
        #     exercise_key = random.choice(item_keys)
        #     specific_event = Events.get(exercise_key)

        #     events.append({'name': specific_event.name,
        #                    'type': specific_event.event_type,
        #                    'description': specific_event.description,
        #                    'datetime': calendar.timegm((exercise_time + timedelta(hours=utc_offset)).timetuple())})

        #     if exercise_time >= halfway_time:
        #         exercise_time += timedelta(hours=1)
        #     else:
        #         exercise_time += timedelta(hours=2)

        events += self.get_exercise_events(cur_time, end_time, utc_offset)
        ######################################################

        events = sorted(events, key=lambda k: k['datetime'])

        return events


# Endpoint for adding new events to the DB
class NewEvent(webapp2.RequestHandler):
    def post(self):
        name = self.request.get("name")
        event_type = self.request.get("event_type")
        description = self.request.get("description")

        if name and event_type and description:
            # adds event
            if self.save_event(name, event_type, description):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Event!")

    def save_event(self, name, event_type, description):
        '''
        Adds a new event to the database
        Event cannot exist already
        Returns True if successful, False if failed
        '''
        try:
            all_events = Events.all()
            all_events.filter("name =", name)  # query event

            if all_events.count():
                logging.error("Event already exists")
                raise

            Events(name=name, event_type=event_type, description=description, ratings=[]).put()
        except Exception:
            return False

        return True


# Endpoint for adding new rating to the DB
class AddRating(webapp2.RequestHandler):
    def post(self):
        event_name = self.request.get("event_name")
        rating = self.request.get("rating") # assumed to be {"rating": x, "time": y} <----- why would we want to do this?? -Sean 10/22/15
        rating = int(rating) if rating else rating # convert to int

        if event_name and rating:
            # adds rating
            if self.save_rating(event_name, rating):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Rating!")
        else:
            self.response.out.write("Error: please provide the event name and rating")

    def save_rating(self, event_name, rating):
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
            all_events.filter("name =", event_name) # query event
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


# Returns a random event of type "extra", returns empty string if no extra events exist in DB
class Extra(webapp2.RequestHandler):
    EXTRA = "extra" # event type

    def post(self):
        '''
        API for quick help tips when user is tired
        '''
        all_events = Events.all(keys_only=True)
        all_events.filter('event_type =', self.EXTRA)
        item_keys = all_events.fetch(1000)

        if (not item_keys):
            self.response.out.write('')
        else:
            specific_event = Events.get(random.choice(item_keys))
            self.response.out.write(json.dumps({'name': specific_event.name,
                                                'type': specific_event.event_type,
                                                'description': specific_event.description}))



dthandler = lambda obj: (
    obj.isoformat()
    if isinstance(obj, datetime)
    or isinstance(obj, date)
    else None)

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/clock.html', Clock),
    ('/schedule', Schedule),
    ('/new_event', NewEvent),
    ('/add_rating', AddRating),
    ('/extra', Extra)
    ], debug=True)
