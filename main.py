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
        wake_up_time = self.request.get("wake_up_time")
        end_time = self.request.get("end_time")
        name = self.request.get("name")
        rating = self.request.get("rating") # assumed to be {"rating": x, "time": y}

        if name and rating:
            return self.add_rating(name, rating)

        elif wake_up_time and end_time:
            # returns json list of events for user
            return json.dumps(self.find_events(wake_up_time, end_time))

    def add_rating(self, name, rating):
        '''
        Adds rating to specified event
        Returns True if successful, False if failed
        '''
        try:
            all_events = Events.all()
            all_events.filter(name=name) # get event
            all_events.ratings.append(rating) # add rating
            all_events.put() # update event
        except Exception:
            return False

        return True

    def find_events(self, wake_up_time, end_time):
        '''
        Returns list of times and events that should be done at those times
        '''
        pass
        # TODO
        # run algorithm and create array of event objects
        # return array

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/clock.html', Clock)
    ], debug=True)
