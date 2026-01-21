/**
 * Venues Create API Handler
 * Venues are stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const VENUES_TABLE = process.env.VENUES_TABLE;

/**
 * Generate a unique venue ID
 */
function generateVenueId() {
  return `ven_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only admins/editors/content team can create venues
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name) {
      return auth.createErrorResponse(400, 'Venue name is required', 'VALIDATION_ERROR');
    }
    if (!body.city) {
      return auth.createErrorResponse(400, 'City is required', 'VALIDATION_ERROR');
    }
    if (!body.country) {
      return auth.createErrorResponse(400, 'Country is required', 'VALIDATION_ERROR');
    }

    const now = new Date().toISOString();
    const venueId = generateVenueId();

    // Build the venue record
    const venue = {
      venueId,
      name: body.name,
      city: body.city,
      country: body.country.toUpperCase(),
      timezone: body.timezone || 'UTC',
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      createdAt: now,
    };

    // Save to DynamoDB
    await db.putItem(VENUES_TABLE, venue);

    return auth.createResponse(201, {
      message: 'Venue created successfully',
      venue,
    });
  } catch (error) {
    console.error('Error creating venue:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
