const _ = require('lodash');
const config = require('./test.config');
const Koa = require('koa');
const app = new Koa();

const morgan = require('koa-morgan');
const winston = require('../lib/winston')('server');
app.use(morgan('tiny', { stream: winston.stream }));

const moment = require('moment');
const data = require('./testData.json');
const adapter = require('../index');
app.use(adapter({
  authRealm: config.authRealm,
  caldavRoot: 'caldav',
  domain: 'testServer',
  proId: { company: 'TestCompany', product: 'Calendar', language: 'EN' },
  authMethod: async (user, pass) => {
    winston.debug(`user: ${user}, pass: ${pass}`);
    if (pass === 'pass') {
      return {
        user: user
      };
    }
  },
  getCalendar: async (userId, calendarId) => {
    return data.calendars[calendarId];
  },
  getCalendarsForUser: async (userId) => {
    return _.filter(data.calendars, { ownerId: userId });
  },
  updateCalendar: async (userId, calendarId, val) => {
    const keys = Object.keys(val);
    keys.forEach((key) => {
      if (key === 'calendar-color') {
        data.calendars[calendarId].color = val[key];
      }
    });
  },
  getEventsForCalendar: async (userId, calendarId) => {
    return _.filter(data.events, (v) => {
      return v.calendarId === calendarId;
    });
  },
  getEventsByDate: async (userId, calendarId, start, end) => {
    return _.filter(data.events, (v) => {
      return v.calendarId === calendarId &&
        v.startDate >= start &&
        v.endDate <= end;
    });
  },
  getEvent: async (userId, eventId) => {
    return data.events[eventId];
  },
  createEvent: async (userId, event) => {
    event.lastUpdatedOn = moment().unix();
    data.events[event.eventId] = event;
    data.calendars[event.calendarId].syncToken++;
    return event;
  },
  updateEvent: async (userId, event) => {
    event.lastUpdatedOn = moment().unix();
    data.events[event.eventId] = event;
    data.calendars[event.calendarId].syncToken++;
    return event;
  },
  deleteEvent: async (userId, eventId) => {
    const event = data.events[eventId];
    data.events[eventId] = null;
    if (event) {
      data.calendars[event.calendarId].syncToken++;
    }
    return event;
  },
}));

app.use((ctx) => {
  ctx.body = 'outside caldav server';
});

app.listen(config.port, () => winston.debug('Server started'));
