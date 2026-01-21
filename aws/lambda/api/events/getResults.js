/**
 * Events Get Results API Handler
 * Results are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const EVENT_SCHEDULES_TABLE = process.env.EVENT_SCHEDULES_TABLE;
const RESULTS_TABLE = process.env.RESULTS_TABLE;
const ATHLETES_TABLE = process.env.ATHLETES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const eventId = event.pathParameters?.eventId;
    const scheduleId = event.pathParameters?.scheduleId;

    if (!eventId || !scheduleId) {
      return auth.createErrorResponse(400, 'Event ID and Schedule ID are required', 'VALIDATION_ERROR');
    }

    // Verify schedule exists and belongs to event
    const schedule = await db.getItem(EVENT_SCHEDULES_TABLE, { eventId, scheduleId });
    if (!schedule) {
      return auth.createErrorResponse(404, 'Schedule not found', 'NOT_FOUND');
    }

    // Query results for this schedule
    const resultsResult = await db.query(
      RESULTS_TABLE,
      'scheduleId = :sid',
      { ':sid': scheduleId }
    );

    // Transform results for response, sorted by position
    const results = resultsResult.items
      .map(res => ({
        resultId: res.resultId,
        athleteId: res.athleteId,
        athleteName: res.athleteName,
        finishPosition: res.finishPosition,
        mark: res.mark,
        markNumeric: res.markNumeric,
        wind: res.wind,
        reactionTime: res.reactionTime,
        bibNumber: res.bibNumber,
        lane: res.lane,
        status: res.status,
        createdAt: res.createdAt,
      }))
      .sort((a, b) => {
        // Sort by finish position (DNF/DNS/DQ at the end)
        if (a.finishPosition === null || a.finishPosition === undefined) return 1;
        if (b.finishPosition === null || b.finishPosition === undefined) return -1;
        return a.finishPosition - b.finishPosition;
      });

    return auth.createResponse(200, {
      eventId,
      scheduleId,
      discipline: schedule.discipline,
      round: schedule.round,
      heatNumber: schedule.heatNumber,
      status: schedule.status,
      results,
    });
  } catch (error) {
    console.error('Error getting results:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
