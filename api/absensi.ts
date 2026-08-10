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

      const url = new URL(request.url);

      // ============================================
      // GET - MEMBACA DATA ABSENSI
      // ============================================
      if (request.method === 'GET') {
        const bulan = url.searchParams.get('bulan');
        const tahun = url.searchParams.get('tahun');
        const idUser = url.searchParams.get('id_user');

        let sql = `
          SELECT
            a.id_user,
            g.nama AS name,

            DATE_FORMAT(
              a.tanggal,
              '%Y-%m-%d'
            ) AS date,

            CASE
              WHEN
                a.jam_masuk IS NOT NULL
                AND a.jam_pulang IS NOT NULL
              THEN CONCAT(
                TIME_FORMAT(a.jam_masuk, '%H:%i'),
                ' - ',
                TIME_FORMAT(a.jam_pulang, '%H:%i')
              )

              WHEN a.jam_masuk IS NOT NULL
              THEN TIME_FORMAT(
                a.jam_masuk,
                '%H:%i'
              )

              WHEN a.jam_pulang IS NOT NULL
              THEN TIME_FORMAT(
                a.jam_pulang,
                '%H:%i'
              )

              ELSE ''
            END AS time,

            a.status,
            a.keterangan,

            a.foto_masuk_file_id,
            a.foto_pulang_file_id,

            g.nip,
            g.nik,
            g.status_kepegawaian,
            g.golongan_ruang,
            g.jabatan,
            g.role

          FROM absensi a

          INNER JOIN guru g
            ON g.id_user = a.id_user

          WHERE g.aktif = 1
        `;

        const params: any[] = [];

        if (idUser) {
          sql += ` AND a.id_user = ?`;
          params.push(idUser);
        }

        if (bulan) {
          sql += ` AND MONTH(a.tanggal) = ?`;
          params.push(Number(bulan));
        }

        if (tahun) {
          sql += ` AND YEAR(a.tanggal) = ?`;
          params.push(Number(tahun));
        }

        sql += `
          ORDER BY
            g.nama ASC,
            a.tanggal ASC
        `;

        const data = await conn.execute(
          sql,
          params
        );

        /*
         * Sengaja mengembalikan ARRAY langsung.
         *
         * Ini dibuat agar nanti kompatibel dengan
         * struktur web lama yang sebelumnya menerima
         * array dari Apps Script.
         */
        return Response.json(data);
      }

      return Response.json(
        {
          status: 'error',
          message: 'Method tidak didukung',
        },
        { status: 405 }
      );

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
