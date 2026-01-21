/**
 * Venues List API Handler
 * Venues are stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const VENUES_TABLE = process.env.VENUES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const { country, limit: limitStr, lastKey } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    let result;

    if (country) {
      // Query by country using country-index GSI
      result = await db.query(
        VENUES_TABLE,
        'country = :c',
        { ':c': country.toUpperCase() },
        'country-index',
        limit,
        exclusiveStartKey
      );
    } else {
      // Scan all venues
      result = await db.scan(
        VENUES_TABLE,
        null,
        null,
        limit,
        exclusiveStartKey
      );
    }

    // Transform venues for response
    const venues = result.items.map(v => ({
      venueId: v.venueId,
      name: v.name,
      city: v.city,
      country: v.country,
      timezone: v.timezone,
      latitude: v.latitude,
      longitude: v.longitude,
      createdAt: v.createdAt,
    }));

    return auth.createResponse(200, {
      venues,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastKey: result.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error listing venues:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
