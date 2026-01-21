/**
 * Athletes List API Handler
 * Athletes are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ATHLETES_TABLE = process.env.ATHLETES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const { search, nationality, limit: limitStr, lastKey } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    let result;

    if (search) {
      // Search by name using the name-index GSI
      const firstChar = search.charAt(0).toUpperCase();
      result = await db.query(
        ATHLETES_TABLE,
        'lastNameFirstChar = :char AND begins_with(lastNameFirstName, :prefix)',
        {
          ':char': firstChar,
          ':prefix': search.toLowerCase(),
        },
        'name-index',
        limit,
        exclusiveStartKey
      );
    } else if (nationality) {
      // Filter by nationality using the nationality-index GSI
      result = await db.query(
        ATHLETES_TABLE,
        'nationality = :nat',
        { ':nat': nationality.toUpperCase() },
        'nationality-index',
        limit,
        exclusiveStartKey
      );
    } else {
      // List all athletes (scan)
      result = await db.scan(
        ATHLETES_TABLE,
        null,
        null,
        limit,
        exclusiveStartKey
      );
    }

    // Transform athletes for response
    const athletes = result.items.map(athlete => ({
      athleteId: athlete.athleteId,
      name: athlete.displayName,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      nationality: athlete.nationality,
      dateOfBirth: athlete.dateOfBirth,
      gender: athlete.gender,
      disciplines: athlete.disciplines || [],
      team: athlete.team,
      headshotUrl: athlete.headshots?.find(h => h.isPrimary)?.s3Key
        ? `https://${process.env.IMAGES_BUCKET}.s3.amazonaws.com/${athlete.headshots.find(h => h.isPrimary).s3Key}`
        : null,
      faceCount: athlete.faceCount || 0,
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
    }));

    return auth.createResponse(200, {
      athletes,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastKey: result.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error listing athletes:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
