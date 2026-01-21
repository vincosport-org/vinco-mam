/**
 * Photographers Create API Handler
 * Photographers are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const PHOTOGRAPHERS_TABLE = process.env.PHOTOGRAPHERS_TABLE;

/**
 * Generate a unique photographer ID
 */
function generatePhotographerId() {
  return `phot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an FTP username from display name
 */
function generateFtpUsername(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20) + '_' + Math.random().toString(36).substr(2, 4);
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only admins can create photographers
    if (!auth.hasPermission(user, 'ADMIN')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.displayName) {
      return auth.createErrorResponse(400, 'Display name is required', 'VALIDATION_ERROR');
    }

    if (!body.wpUserId && !body.email) {
      return auth.createErrorResponse(400, 'WordPress user ID or email is required', 'VALIDATION_ERROR');
    }

    const now = new Date().toISOString();
    const photographerId = generatePhotographerId();
    const ftpUsername = body.ftpUsername || generateFtpUsername(body.displayName);

    // Build the photographer record
    const photographer = {
      photographerId,
      wpUserId: body.wpUserId || null,
      displayName: body.displayName,
      email: body.email || null,
      ftpUsername,
      ftpFolderPath: body.ftpFolderPath || `/photographers/${ftpUsername}`,
      defaultCopyright: body.defaultCopyright || `© ${new Date().getFullYear()} ${body.displayName}`,
      defaultCredit: body.defaultCredit || body.displayName,
      totalUploads: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
    };

    // Save to DynamoDB
    await db.putItem(PHOTOGRAPHERS_TABLE, photographer);

    return auth.createResponse(201, {
      message: 'Photographer created successfully',
      photographer: {
        photographerId: photographer.photographerId,
        displayName: photographer.displayName,
        email: photographer.email,
        ftpUsername: photographer.ftpUsername,
        ftpFolderPath: photographer.ftpFolderPath,
        defaultCopyright: photographer.defaultCopyright,
        defaultCredit: photographer.defaultCredit,
        active: photographer.active,
        createdAt: photographer.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating photographer:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
