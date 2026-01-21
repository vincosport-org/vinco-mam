/**
 * Events List API Handler
 * Events are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const EVENTS_TABLE = process.env.EVENTS_TABLE;
const VENUES_TABLE = process.env.VENUES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const {
      startDate,
      endDate,
      venueId,
      yearMonth,
      limit: limitStr,
      lastKey
    } = queryParams;

    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    let result;

    if (yearMonth || (startDate && !venueId)) {
      // Query by date range using date-index GSI
      const ym = yearMonth || startDate.substring(0, 7); // YYYY-MM
      result = await db.query(
        EVENTS_TABLE,
        'yearMonth = :ym',
        { ':ym': ym },
        'date-index',
        limit,
        exclusiveStartKey
      );

      // Filter by exact date range if provided
      if (startDate && endDate) {
        result.items = result.items.filter(e =>
          e.startDate >= startDate && e.startDate <= endDate
        );
      }
    } else if (venueId) {
      // Query by venue using venue-index GSI
      result = await db.query(
        EVENTS_TABLE,
        'venueId = :vid',
        { ':vid': venueId },
        'venue-index',
        limit,
        exclusiveStartKey
      );
    } else {
      // List all events (scan)
      result = await db.scan(
        EVENTS_TABLE,
        null,
        null,
        limit,
        exclusiveStartKey
      );
    }

    // Transform events for response
    const events = result.items.map(evt => ({
      eventId: evt.eventId,
      name: evt.name,
      shortName: evt.shortName,
      eventType: evt.eventType,
      venue: evt.venue,
      startDate: evt.startDate,
      endDate: evt.endDate,
      timezone: evt.timezone,
      scheduleCount: evt.scheduleCount || 0,
      createdAt: evt.createdAt,
      updatedAt: evt.updatedAt,
    }));

    return auth.createResponse(200, {
      events,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastKey: result.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error listing events:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
