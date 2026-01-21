/**
 * Search API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const IMAGES_TABLE = process.env.IMAGES_TABLE;
const ALBUMS_TABLE = process.env.ALBUMS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const query = queryParams.q || queryParams.query || '';
    const type = queryParams.type || 'all'; // 'all', 'images', 'albums'
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    if (!query || query.trim().length === 0) {
      return auth.createErrorResponse(400, 'Missing search query', 'BAD_REQUEST');
    }

    const results = {
      query,
      images: [],
      albums: [],
      total: 0,
    };

    // Search images
    if (type === 'all' || type === 'images') {
      const imagesResult = await db.scan(IMAGES_TABLE);
      const allImages = imagesResult.items || [];

      // Simple text search in title, description, keywords
      const searchLower = query.toLowerCase();
      const matchingImages = allImages.filter((img) => {
        const title = (img.title || '').toLowerCase();
        const description = (img.description || '').toLowerCase();
        const keywords = (img.keywords || []).join(' ').toLowerCase();

        return title.includes(searchLower) ||
               description.includes(searchLower) ||
               keywords.includes(searchLower);
      });

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      results.images = matchingImages.slice(startIndex, endIndex);
      results.total += matchingImages.length;
    }

    // Search albums
    if (type === 'all' || type === 'albums') {
      const albumsResult = await db.scan(ALBUMS_TABLE);
      const allAlbums = albumsResult.items || [];

      const searchLower = query.toLowerCase();
      const matchingAlbums = allAlbums.filter((album) => {
        const title = (album.title || '').toLowerCase();
        const description = (album.description || '').toLowerCase();

        return title.includes(searchLower) || description.includes(searchLower);
      });

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      results.albums = matchingAlbums.slice(startIndex, endIndex);
      results.total += matchingAlbums.length;
    }

    return auth.createResponse(200, {
      ...results,
      page,
      totalPages: Math.ceil(results.total / limit),
    });
  } catch (error) {
    console.error('Error searching:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
