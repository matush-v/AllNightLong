'''
GAE server for All Night Long
'''

import webapp2
import logging
import jinja2
import json
import os
from google.appengine.ext import db

'''
DATABASE
'''
class Events(db.Model):
    name = db.StringProperty()
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
        end_time = self.request.get("end_time")
        name = self.request.get("name")
        description = self.request.get("description")
        rating = self.request.get("rating") # assumed to be {"rating": x, "time": y}
        rating = int(rating) if rating else rating # convert to int

        if name and description:
            # adds event
            if self.add_event(name, description):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Event!")

        elif wake_up_time and end_time:
            # creates schedule for user
            schedule = self.get_schedule(wake_up_time, end_time)

            self.response.out.write(json.dumps(schedule))

        elif name and rating:
            # adds rating
            if self.add_rating(name, rating):
                self.response.out.write("Successfully Added!")
            else:
                self.response.out.write("Error in Adding Rating!")
        else:
            self.response.out.write("Please provide correct parameters")

    def add_event(self, name, description):
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

            Events(name=name, description=description, ratings=[]).put()
        except Exception:
            return False

        return True

    def get_schedule(self, wake_up_time, end_time):
        '''
        Returns list of times and events that should be done at those times
        '''
        pass
        # TODO
        # run algorithm and create array of event objects
        # return array

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



app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/clock.html', Clock),
    ('/schedule', Schedule)
    ], debug=True)
