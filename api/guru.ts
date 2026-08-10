import { connect } from '@tidbcloud/serverless';

const ALLOWED_ORIGIN = 'https://yohandeku32.github.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}

export default {
  async fetch(request: Request) {

    // ================================================
    // CORS PREFLIGHT
    // ================================================
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // ================================================
    // HANYA GET
    // ================================================
    if (request.method !== 'GET') {
      return json(
        {
          status: 'error',
          message: 'Method tidak didukung.',
        },
        405
      );
    }

    try {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        return json(
          {
            status: 'error',
            message: 'DATABASE_URL belum ditemukan di Vercel.',
          },
          500
        );
      }

      const conn = connect({
        url: databaseUrl,
      });

      const guru = await conn.execute(`
        SELECT
          id_user,
          nama,
          nip,
          nik,
          status_kepegawaian,
          golongan_ruang,
          jabatan,
          role,
          aktif
        FROM guru
        WHERE aktif = 1
        ORDER BY nama ASC
      `);

      return json({
        status: 'success',
        total: Array.isArray(guru) ? guru.length : 0,
        data: guru,
      });

    } catch (error) {
      console.error('API GURU ERROR:', error);

      return json(
        {
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500
      );
    }
  },
};
