/**
 * Authentication and authorization utilities
 */

/**
 * Parse JWT token from Authorization header or X-Vinco-Auth header
 */
exports.parseToken = (headers) => {
  // Check standard Authorization header first
  const authHeader = headers.Authorization || headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-Vinco-Auth header (used by WordPress plugin)
  const vincoAuthHeader = headers['X-Vinco-Auth'] || headers['x-vinco-auth'];
  if (vincoAuthHeader) {
    // WordPress sends JWT directly without Bearer prefix
    if (vincoAuthHeader.startsWith('Bearer ')) {
      return vincoAuthHeader.substring(7);
    }
    return vincoAuthHeader;
  }

  return null;
};

/**
 * Decode JWT payload (without verification - verification should be done in Lambda authorizer)
 */
exports.decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload;
  } catch (e) {
    return null;
  }
};

/**
 * Extract user info from request
 */
exports.getUserFromRequest = (event) => {
  // Try to get from JWT in headers
  const token = exports.parseToken(event.headers || {});
  if (token) {
    const payload = exports.decodeJWT(token);
    if (payload) {
      return {
        userId: payload.sub || payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        username: payload.username || payload.name || payload.email?.split('@')[0] || 'unknown',
      };
    }
  }
  
  // Try to get from request context (if using Lambda authorizer)
  if (event.requestContext && event.requestContext.authorizer) {
    const auth = event.requestContext.authorizer;
    return {
      userId: auth.userId || auth.sub,
      email: auth.email,
      name: auth.name,
      role: auth.role,
      username: auth.username || auth.name || auth.email?.split('@')[0] || 'unknown',
    };
  }
  
  return null;
};

/**
 * Check if user has required role/permission
 */
exports.hasPermission = (user, requiredRole) => {
  if (!user) return false;
  
  const roleHierarchy = {
    ADMIN: ['ADMIN', 'EDITOR', 'CONTENT_TEAM', 'PHOTOGRAPHER', 'VIEWER'],
    EDITOR: ['EDITOR', 'CONTENT_TEAM', 'VIEWER'],
    CONTENT_TEAM: ['CONTENT_TEAM', 'VIEWER'],
    PHOTOGRAPHER: ['PHOTOGRAPHER', 'VIEWER'],
    VIEWER: ['VIEWER'],
  };
  
  const userRole = user.role || 'VIEWER';
  const allowedRoles = roleHierarchy[userRole] || [];
  return allowedRoles.includes(requiredRole);
};

/**
 * Standard CORS headers
 */
exports.corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Vinco-Auth',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Create API Gateway response
 */
exports.createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      ...exports.corsHeaders,
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Create error response
 */
exports.createErrorResponse = (statusCode, message, code = null) => {
  return exports.createResponse(statusCode, {
    error: {
      code: code || 'ERROR',
      message,
    },
  });
};

module.exports = exports;
