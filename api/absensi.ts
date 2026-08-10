import { connect } from '@tidbcloud/serverless';

type AbsenStatus = 'MASUK' | 'PULANG';

export default {
  async fetch(request: Request) {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      const appsScriptUrl = process.env.APPS_SCRIPT_URL;

      if (!databaseUrl) {
        return Response.json(
          {
            status: 'error',
            message: 'DATABASE_URL belum ditemukan di Vercel',
          },
          { status: 500 }
        );
      }

      const conn = connect({
        url: databaseUrl,
      });

      const url = new URL(request.url);

      // ==================================================
      // GET - MEMBACA DATA ABSENSI
      // ==================================================

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

        return Response.json(data);
      }


      // ==================================================
      // POST - MENYIMPAN ABSENSI
      // ==================================================

      if (request.method === 'POST') {

        if (!appsScriptUrl) {
          return Response.json(
            {
              status: 'error',
              message:
                'APPS_SCRIPT_URL belum ditemukan di Vercel',
            },
            { status: 500 }
          );
        }


        // ----------------------------------------------
        // BACA BODY
        // ----------------------------------------------

        const body = await request.json();

        const idUser =
          String(body.id_user || '').trim();

        const tanggal =
          String(body.date || '').trim();

        let jam =
          String(body.time || '').trim();

        const status =
          String(body.status || '').trim()
            .toUpperCase() as AbsenStatus;

        const photo =
          String(body.photo || '');

        const keterangan =
          String(
            body.note ||
            body.keterangan ||
            '-'
          ).trim() || '-';


        // ----------------------------------------------
        // NORMALISASI JAM
        // ----------------------------------------------

        jam = jam.replace(/\./g, ':');


        // ----------------------------------------------
        // VALIDASI DASAR
        // ----------------------------------------------

        if (
          !idUser ||
          !tanggal ||
          !jam ||
          !status ||
          !photo
        ) {
          return Response.json(
            {
              status: 'error',
              message:
                'Data absensi belum lengkap.',
            },
            { status: 400 }
          );
        }


        // ----------------------------------------------
        // VALIDASI STATUS
        // ----------------------------------------------

        if (
          status !== 'MASUK' &&
          status !== 'PULANG'
        ) {
          return Response.json(
            {
              status: 'error',
              message:
                'Status absensi tidak valid.',
            },
            { status: 400 }
          );
        }


        // ----------------------------------------------
        // VALIDASI FORMAT TANGGAL
        // ----------------------------------------------

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            tanggal
          )
        ) {
          return Response.json(
            {
              status: 'error',
              message:
                'Format tanggal tidak valid.',
            },
            { status: 400 }
          );
        }


        // ----------------------------------------------
        // VALIDASI FORMAT JAM
        // ----------------------------------------------

        if (
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            jam
          )
        ) {
          return Response.json(
            {
              status: 'error',
              message:
                'Format jam tidak valid.',
            },
            { status: 400 }
          );
        }


        // ----------------------------------------------
        // CEK GURU
        // ----------------------------------------------

        const guruRows =
          await conn.execute(
            `
              SELECT
                id_user,
                nama,
                aktif
              FROM guru
              WHERE id_user = ?
                AND aktif = 1
              LIMIT 1
            `,
            [idUser]
          ) as any[];


        if (guruRows.length === 0) {
          return Response.json(
            {
              status: 'error',
              message:
                'Data guru tidak ditemukan.',
            },
            { status: 404 }
          );
        }


        const guru = guruRows[0];

        const namaGuru =
          String(guru.nama);


        // ----------------------------------------------
        // CEK ABSENSI HARI INI
        // ----------------------------------------------

        const absenRows =
          await conn.execute(
            `
              SELECT
                id,
                jam_masuk,
                jam_pulang,
                status,
                foto_masuk_file_id,
                foto_pulang_file_id

              FROM absensi

              WHERE id_user = ?
                AND tanggal = ?

              LIMIT 1
            `,
            [
              idUser,
              tanggal
            ]
          ) as any[];


        const absenHariIni =
          absenRows.length > 0
            ? absenRows[0]
            : null;


        // ==================================================
        // ABSEN MASUK
        // ==================================================

        if (status === 'MASUK') {

          if (
            absenHariIni &&
            absenHariIni.jam_masuk
          ) {
            return Response.json(
              {
                status: 'error',
                message:
                  'Anda sudah melakukan absen MASUK hari ini.',
              },
              { status: 409 }
            );
          }


          // --------------------------------------------
          // UPLOAD FOTO MASUK KE GOOGLE DRIVE
          // --------------------------------------------

          const hasilFoto =
            await uploadFoto(
              appsScriptUrl,
              {
                id_user: idUser,
                name: namaGuru,
                date: tanggal,
                status: 'MASUK',
                photo,
              }
            );


          if (
            hasilFoto.status !== 'success' ||
            !hasilFoto.file_id
          ) {
            return Response.json(
              {
                status: 'error',
                message:
                  hasilFoto.message ||
                  'Foto masuk gagal disimpan.',
              },
              { status: 500 }
            );
          }


          // --------------------------------------------
          // SIMPAN KE TIDB
          // --------------------------------------------

          await conn.execute(
            `
              INSERT INTO absensi
              (
                id_user,
                tanggal,
                jam_masuk,
                status,
                keterangan,
                foto_masuk_file_id
              )
              VALUES
              (
                ?,
                ?,
                ?,
                'MASUK',
                ?,
                ?
              )
            `,
            [
              idUser,
              tanggal,
              jam,
              keterangan,
              hasilFoto.file_id
            ]
          );


          return Response.json({
            status: 'success',

            message:
              'Absensi MASUK berhasil disimpan.',

            data: {
              id_user: idUser,
              name: namaGuru,
              date: tanggal,
              time: jam,
              status: 'MASUK',
              foto_masuk_file_id:
                hasilFoto.file_id
            }
          });
        }


        // ==================================================
        // ABSEN PULANG
        // ==================================================

        if (status === 'PULANG') {

          // Harus sudah absen masuk
          if (
            !absenHariIni ||
            !absenHariIni.jam_masuk
          ) {
            return Response.json(
              {
                status: 'error',
                message:
                  'Anda belum melakukan absen MASUK hari ini.',
              },
              { status: 409 }
            );
          }


          // Cegah pulang dua kali
          if (
            absenHariIni.jam_pulang
          ) {
            return Response.json(
              {
                status: 'error',
                message:
                  'Anda sudah melakukan absen PULANG hari ini.',
              },
              { status: 409 }
            );
          }


          // --------------------------------------------
          // UPLOAD FOTO PULANG KE GOOGLE DRIVE
          // --------------------------------------------

          const hasilFoto =
            await uploadFoto(
              appsScriptUrl,
              {
                id_user: idUser,
                name: namaGuru,
                date: tanggal,
                status: 'PULANG',
                photo,
              }
            );


          if (
            hasilFoto.status !== 'success' ||
            !hasilFoto.file_id
          ) {
            return Response.json(
              {
                status: 'error',
                message:
                  hasilFoto.message ||
                  'Foto pulang gagal disimpan.',
              },
              { status: 500 }
            );
          }


          // --------------------------------------------
          // UPDATE TIDB
          // --------------------------------------------

          await conn.execute(
            `
              UPDATE absensi

              SET
                jam_pulang = ?,
                status = 'MASUK & PULANG',
                foto_pulang_file_id = ?,
                updated_at = CURRENT_TIMESTAMP

              WHERE id_user = ?
                AND tanggal = ?
            `,
            [
              jam,
              hasilFoto.file_id,
              idUser,
              tanggal
            ]
          );


          return Response.json({
            status: 'success',

            message:
              'Absensi PULANG berhasil disimpan.',

            data: {
              id_user: idUser,
              name: namaGuru,
              date: tanggal,

              time:
                formatJam(
                  absenHariIni.jam_masuk
                ) +
                ' - ' +
                jam,

              status:
                'MASUK & PULANG',

              foto_masuk_file_id:
                absenHariIni
                  .foto_masuk_file_id,

              foto_pulang_file_id:
                hasilFoto.file_id
            }
          });
        }
      }


      // ==================================================
      // METHOD LAIN
      // ==================================================

      return Response.json(
        {
          status: 'error',
          message:
            'Method tidak didukung.',
        },
        { status: 405 }
      );


    } catch (error) {

      console.error(
        'API ABSENSI ERROR:',
        error
      );

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


// ======================================================
// UPLOAD FOTO KE GOOGLE APPS SCRIPT
// ======================================================

async function uploadFoto(
  appsScriptUrl: string,
  data: {
    id_user: string;
    name: string;
    date: string;
    status: AbsenStatus;
    photo: string;
  }
) {

  try {

    const response =
      await fetch(
        appsScriptUrl,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8',
          },

          body: JSON.stringify({
            action:
              'upload_photo_only',

            id_user:
              data.id_user,

            name:
              data.name,

            date:
              data.date,

            status:
              data.status,

            photo:
              data.photo,
          }),
        }
      );


    const text =
      await response.text();


    let result: any;

    try {
      result =
        JSON.parse(text);
    } catch {
      return {
        status: 'error',
        message:
          'Response Apps Script bukan JSON.',
      };
    }


    return result;


  } catch (error) {

    return {
      status: 'error',

      message:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}


// ======================================================
// FORMAT NILAI TIME DARI DATABASE
// ======================================================

function formatJam(
  value: unknown
) {

  if (!value) {
    return '';
  }

  const text =
    String(value);

  if (
    /^\d{2}:\d{2}/.test(text)
  ) {
    return text.substring(0, 5);
  }

  return text;
}
