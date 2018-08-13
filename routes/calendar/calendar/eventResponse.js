const log = require('../../../lib/winston')('calendar/event-response');

const { splitPrefix } = require('../../../lib/util');
const { response, status } = require('../../../lib/xBuild');
const path = require('path');
const _ = require('lodash');

const tagActions = {
  /* https://tools.ietf.org/html/rfc4791#section-5.3.4 */
  'getetag': async (event) => {
    return { 'D:getetag': event.createdOn };
  },
  'getcontenttype': async () => {
    return { 'D:getcontenttype': 'text/calendar; charset=utf-8; component=VEVENT' };
  },
  /* https://tools.ietf.org/html/rfc4791#section-9.6 */
  // 'calendar-data': async (event) => {
  //   return {
  //     'CAL:calendar-data': event.iCalendar
  //   };
  // }
};

module.exports = function() {
  return async function(ctx, events, propTags) {
    const eventActions = _.map(events, async (event) => {
      const propActions = _.map(propTags, async (v, k) => {
        const tag = splitPrefix(k);
        const tagAction = tagActions[tag];
        log.debug(`${tagAction ? 'hit' : 'miss'}: ${tag}`);
        if (!tagAction) { return null; }
        return await tagAction(event);
      });
      const pRes = await Promise.all(propActions);
      const url = path.join(ctx.url, `${event.eventId}.ics`);
      return response(url, status[200], _.compact(pRes));
    });
    const responses = await Promise.all(eventActions);
    return { responses };
  };
};