'''
Script for adding events from csv file
No row with column names should exist (e.g. ["Type", "Name", "Description", "Icon"])

usage: python add_events_script.py path/to/csv
'''

import csv
import sys
import requests

f = open(sys.argv[1], 'rt')
URL = "https://allnightlong.co/new_event"

EVENT_TYPE = 0
NAME = 1
DESCRIPTION = 2
ICON = 3

try:
    event_num = 1
    reader = csv.reader(f)
    data = {}
    for row in reader:
        data["event_type"] = row[EVENT_TYPE]
        data["name"] = row[NAME]
        data["description"] = row[DESCRIPTION]

        res = requests.post(URL, data)
        print str(event_num) + ") " + res.text
        event_num += 1
finally:
    f.close()
