/**
 * Events Get Schedule API Handler
 * Schedules are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const EVENTS_TABLE = process.env.EVENTS_TABLE;
const EVENT_SCHEDULES_TABLE = process.env.EVENT_SCHEDULES_TABLE;
const START_LISTS_TABLE = process.env.START_LISTS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return auth.createErrorResponse(400, 'Event ID is required', 'VALIDATION_ERROR');
    }

    const queryParams = event.queryStringParameters || {};
    const { includeStartLists, limit: limitStr, lastKey } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    // Get event details first to verify it exists
    const eventRecord = await db.getItem(EVENTS_TABLE, { eventId });
    if (!eventRecord) {
      return auth.createErrorResponse(404, 'Event not found', 'NOT_FOUND');
    }

    // Query all schedules for this event
    const schedulesResult = await db.query(
      EVENT_SCHEDULES_TABLE,
      'eventId = :eid',
      { ':eid': eventId },
      null,
      limit,
      exclusiveStartKey
    );

    // Transform schedules for response
    let schedules = schedulesResult.items.map(sch => ({
      scheduleId: sch.scheduleId,
      discipline: sch.discipline,
      round: sch.round,
      heatNumber: sch.heatNumber,
      scheduledTime: sch.scheduledTime,
      actualStartTime: sch.actualStartTime,
      status: sch.status,
      startListCount: sch.startListCount || 0,
      createdAt: sch.createdAt,
      updatedAt: sch.updatedAt,
    }));

    // Optionally include start lists for each schedule
    if (includeStartLists === 'true' && schedules.length > 0) {
      const schedulesWithStartLists = await Promise.all(
        schedules.map(async (sch) => {
          const startListResult = await db.query(
            START_LISTS_TABLE,
            'scheduleId = :sid',
            { ':sid': sch.scheduleId }
          );

          return {
            ...sch,
            startList: startListResult.items.map(sl => ({
              startListId: sl.startListId,
              athleteId: sl.athleteId,
              athleteName: sl.athleteName,
              bibNumber: sl.bibNumber,
              lane: sl.lane,
              position: sl.position,
              seedMark: sl.seedMark,
            })).sort((a, b) => (a.position || 0) - (b.position || 0)),
          };
        })
      );
      schedules = schedulesWithStartLists;
    }

    // Sort by scheduled time
    schedules.sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return new Date(a.scheduledTime) - new Date(b.scheduledTime);
    });

    return auth.createResponse(200, {
      eventId,
      eventName: eventRecord.name,
      schedules,
      pagination: {
        limit,
        hasMore: !!schedulesResult.lastEvaluatedKey,
        lastKey: schedulesResult.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(schedulesResult.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error getting event schedule:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
