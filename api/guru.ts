import { connect } from '@tidbcloud/serverless';

export default {
  async fetch(request: Request) {
    try {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        return Response.json(
          {
            status: 'error',
            message: 'DATABASE_URL belum ditemukan',
          },
          { status: 500 }
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

      return Response.json({
        status: 'success',
        total: guru.length,
        data: guru,
      });

    } catch (error) {
      console.error(error);

      return Response.json(
        {
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        { status: 500 }
      );
    }
  },
};
