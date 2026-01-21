/**
 * Users List API Handler
 * Users are stored in WordPress, so this is a proxy endpoint
 */
const auth = require('/opt/nodejs/auth');

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (!auth.hasPermission(user, 'ADMIN')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    // This endpoint proxies to WordPress plugin
    const queryParams = event.queryStringParameters || {};

    return auth.createResponse(200, {
      message: 'This endpoint should be proxied to WordPress plugin',
      queryParams,
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
