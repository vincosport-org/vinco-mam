/**
 * Athletes Create API Handler
 * Athletes are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ATHLETES_TABLE = process.env.ATHLETES_TABLE;

/**
 * Generate a unique athlete ID
 */
function generateAthleteId() {
  return `ath_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only admins/editors/content team can create athletes
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.firstName && !body.lastName && !body.name) {
      return auth.createErrorResponse(400, 'Name is required (firstName/lastName or name)', 'VALIDATION_ERROR');
    }

    // Parse name if only full name provided
    let firstName = body.firstName;
    let lastName = body.lastName;
    if (!firstName && !lastName && body.name) {
      const nameParts = body.name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || firstName;
    }

    const now = new Date().toISOString();
    const athleteId = generateAthleteId();

    // Build the athlete record
    const athlete = {
      athleteId,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      nationality: body.nationality?.toUpperCase() || null,
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      disciplines: body.disciplines || [],
      team: body.team || null,
      headshots: [],
      externalIds: {},
      rekognitionCollectionId: 'vinco-athletes',
      faceCount: 0,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
      // GSI keys for name search
      lastNameFirstChar: lastName.charAt(0).toUpperCase(),
      lastNameFirstName: `${lastName.toLowerCase()}#${firstName.toLowerCase()}`,
    };

    // Save to DynamoDB
    await db.putItem(ATHLETES_TABLE, athlete);

    return auth.createResponse(201, {
      message: 'Athlete created successfully',
      athlete: {
        athleteId: athlete.athleteId,
        name: athlete.displayName,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        nationality: athlete.nationality,
        dateOfBirth: athlete.dateOfBirth,
        gender: athlete.gender,
        disciplines: athlete.disciplines,
        team: athlete.team,
        createdAt: athlete.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating athlete:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
