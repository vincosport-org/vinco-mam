/**
 * Athletes Update API Handler
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

    // Check permissions - only admins/editors/content team can update athletes
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const athleteId = event.pathParameters?.athleteId;
    if (!athleteId) {
      return auth.createErrorResponse(400, 'Athlete ID is required', 'VALIDATION_ERROR');
    }

    // Get existing athlete
    const existingAthlete = await db.getItem(ATHLETES_TABLE, { athleteId });
    if (!existingAthlete) {
      return auth.createErrorResponse(404, 'Athlete not found', 'NOT_FOUND');
    }

    const body = JSON.parse(event.body || '{}');

    // Build updates object
    const updates = {};

    // Handle name field (split into firstName/lastName if provided as single field)
    let firstName = body.firstName;
    let lastName = body.lastName;

    if (body.name && (!firstName || !lastName)) {
      // Split name into firstName and lastName
      const nameParts = body.name.trim().split(/\s+/);
      if (nameParts.length === 1) {
        firstName = firstName || nameParts[0];
        lastName = lastName || '';
      } else {
        firstName = firstName || nameParts[0];
        lastName = lastName || nameParts.slice(1).join(' ');
      }
    }

    if (firstName !== undefined) {
      updates.firstName = firstName;
    }
    if (lastName !== undefined) {
      updates.lastName = lastName;
    }
    if (firstName !== undefined || lastName !== undefined) {
      const finalFirstName = firstName || existingAthlete.firstName || '';
      const finalLastName = lastName || existingAthlete.lastName || '';
      updates.displayName = `${finalFirstName} ${finalLastName}`.trim();
      updates.name = updates.displayName; // Also update name field for compatibility
      // Update GSI keys for name search
      if (finalLastName) {
        updates.lastNameFirstChar = finalLastName.charAt(0).toUpperCase();
        updates.lastNameFirstName = `${finalLastName.toLowerCase()}#${finalFirstName.toLowerCase()}`;
      }
    }
    if (body.nationality !== undefined) {
      updates.nationality = body.nationality?.toUpperCase() || null;
    }
    if (body.dateOfBirth !== undefined) {
      updates.dateOfBirth = body.dateOfBirth;
    }
    if (body.gender !== undefined) {
      updates.gender = body.gender;
    }
    if (body.disciplines !== undefined) {
      updates.disciplines = body.disciplines;
    }
    if (body.team !== undefined) {
      updates.team = body.team;
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    // Handle external IDs updates
    if (body.externalIds !== undefined) {
      const currentExternalIds = existingAthlete.externalIds || {};
      Object.entries(body.externalIds).forEach(([source, data]) => {
        if (data === null) {
          // Remove external ID
          delete currentExternalIds[source];
        } else {
          // Add/update external ID
          currentExternalIds[source] = {
            externalId: data.externalId,
            verified: data.verified || false,
            createdAt: currentExternalIds[source]?.createdAt || new Date().toISOString(),
          };
        }
      });
      updates.externalIds = currentExternalIds;
    }

    if (Object.keys(updates).length === 0) {
      return auth.createErrorResponse(400, 'No valid updates provided', 'VALIDATION_ERROR');
    }

    // Update in DynamoDB
    const updatedAthlete = await db.updateItem(
      ATHLETES_TABLE,
      { athleteId },
      updates
    );

    return auth.createResponse(200, {
      message: 'Athlete updated successfully',
      athlete: {
        athleteId: updatedAthlete.athleteId,
        name: updatedAthlete.displayName,
        firstName: updatedAthlete.firstName,
        lastName: updatedAthlete.lastName,
        nationality: updatedAthlete.nationality,
        dateOfBirth: updatedAthlete.dateOfBirth,
        gender: updatedAthlete.gender,
        disciplines: updatedAthlete.disciplines,
        team: updatedAthlete.team,
        updatedAt: updatedAthlete.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating athlete:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
