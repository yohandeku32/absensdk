import { connect } from '@tidbcloud/serverless';

type AbsenStatus = 'MASUK' | 'PULANG';

const ALLOWED_ORIGIN =
  'https://yohandeku32.github.io';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    ALLOWED_ORIGIN,

  'Access-Control-Allow-Methods':
    'GET, POST, OPTIONS',

  'Access-Control-Allow-Headers':
    'Content-Type',

  'Access-Control-Max-Age':
    '86400',

  'Vary':
    'Origin',
};


// ======================================================
// RESPONSE JSON + CORS
// ======================================================

function json(
  data: unknown,
  status = 200
) {
  return Response.json(
    data,
    {
      status,
      headers: corsHeaders,
    }
  );
}


// ======================================================
// API UTAMA
// ======================================================

export default {
  async fetch(request: Request) {

    // ==================================================
    // CORS PREFLIGHT
    // ==================================================

    if (request.method === 'OPTIONS') {
      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders,
        }
      );
    }


    try {

      const databaseUrl =
        process.env.DATABASE_URL;

      const appsScriptUrl =
        process.env.APPS_SCRIPT_URL;


      if (!databaseUrl) {
        return json(
          {
            status: 'error',
            message:
              'DATABASE_URL belum ditemukan di Vercel.',
          },
          500
        );
      }


      const conn = connect({
        url: databaseUrl,
      });


      const url =
        new URL(request.url);


      // ==================================================
      // GET
      // MEMBACA DATA ABSENSI DARI TIDB
      // ==================================================

      if (request.method === 'GET') {

        const bulan =
          url.searchParams.get('bulan');

        const tahun =
          url.searchParams.get('tahun');

        const idUser =
          url.searchParams.get('id_user');


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
                AND
                a.jam_pulang IS NOT NULL

              THEN CONCAT(
                TIME_FORMAT(
                  a.jam_masuk,
                  '%H:%i'
                ),
                ' - ',
                TIME_FORMAT(
                  a.jam_pulang,
                  '%H:%i'
                )
              )


              WHEN
                a.jam_masuk IS NOT NULL

              THEN
                TIME_FORMAT(
                  a.jam_masuk,
                  '%H:%i'
                )


              WHEN
                a.jam_pulang IS NOT NULL

              THEN
                TIME_FORMAT(
                  a.jam_pulang,
                  '%H:%i'
                )


              ELSE ''

            END AS time,


            TIME_FORMAT(
              a.jam_masuk,
              '%H:%i'
            ) AS jam_masuk,


            TIME_FORMAT(
              a.jam_pulang,
              '%H:%i'
            ) AS jam_pulang,


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


        // ----------------------------------------------
        // FILTER USER
        // ----------------------------------------------

        if (idUser) {

          sql += `
            AND a.id_user = ?
          `;

          params.push(idUser);
        }


        // ----------------------------------------------
        // FILTER BULAN
        // ----------------------------------------------

        if (bulan) {

          const nomorBulan =
            Number(bulan);

          if (
            !Number.isInteger(nomorBulan) ||
            nomorBulan < 1 ||
            nomorBulan > 12
          ) {
            return json(
              {
                status: 'error',
                message:
                  'Bulan tidak valid.',
              },
              400
            );
          }

          sql += `
            AND MONTH(a.tanggal) = ?
          `;

          params.push(nomorBulan);
        }


        // ----------------------------------------------
        // FILTER TAHUN
        // ----------------------------------------------

        if (tahun) {

          const nomorTahun =
            Number(tahun);

          if (
            !Number.isInteger(nomorTahun) ||
            nomorTahun < 2000 ||
            nomorTahun > 2100
          ) {
            return json(
              {
                status: 'error',
                message:
                  'Tahun tidak valid.',
              },
              400
            );
          }

          sql += `
            AND YEAR(a.tanggal) = ?
          `;

          params.push(nomorTahun);
        }


        sql += `
          ORDER BY
            g.nama ASC,
            a.tanggal ASC
        `;


        const data =
          await conn.execute(
            sql,
            params
          );


        // Tetap ARRAY agar cocok
        // dengan App.tsx lama
        return json(data);
      }



      // ==================================================
      // POST
      // MENYIMPAN ABSENSI
      // ==================================================

      if (request.method === 'POST') {


        if (!appsScriptUrl) {

          return json(
            {
              status: 'error',
              message:
                'APPS_SCRIPT_URL belum ditemukan di Vercel.',
            },
            500
          );
        }


        // ----------------------------------------------
        // BACA BODY JSON
        // ----------------------------------------------

        let body: any;

        try {

          body =
            await request.json();

        } catch {

          return json(
            {
              status: 'error',
              message:
                'Body request bukan JSON yang valid.',
            },
            400
          );
        }


        const idUser =
          String(
            body.id_user || ''
          ).trim();


        const tanggal =
          String(
            body.date || ''
          ).trim();


        let jam =
          String(
            body.time || ''
          ).trim();


        const status =
          String(
            body.status || ''
          )
            .trim()
            .toUpperCase()
            as AbsenStatus;


        const photo =
          String(
            body.photo || ''
          );


        const keterangan =
          String(
            body.note ||
            body.keterangan ||
            '-'
          ).trim() || '-';



        // ==================================================
        // NORMALISASI JAM
        // ==================================================

        jam =
          jam.replace(
            /\./g,
            ':'
          );



        // ==================================================
        // VALIDASI DATA WAJIB
        // ==================================================

        if (
          !idUser ||
          !tanggal ||
          !jam ||
          !status ||
          !photo
        ) {

          return json(
            {
              status: 'error',
              message:
                'Data absensi belum lengkap.',
            },
            400
          );
        }



        // ==================================================
        // VALIDASI STATUS
        // ==================================================

        if (
          status !== 'MASUK' &&
          status !== 'PULANG'
        ) {

          return json(
            {
              status: 'error',
              message:
                'Status absensi tidak valid.',
            },
            400
          );
        }



        // ==================================================
        // VALIDASI TANGGAL
        // ==================================================

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            tanggal
          )
        ) {

          return json(
            {
              status: 'error',
              message:
                'Format tanggal tidak valid.',
            },
            400
          );
        }



        // ==================================================
        // VALIDASI JAM
        // ==================================================

        if (
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            jam
          )
        ) {

          return json(
            {
              status: 'error',
              message:
                'Format jam tidak valid.',
            },
            400
          );
        }



        // ==================================================
        // VALIDASI FOTO BASE64
        // ==================================================

        if (
          !photo.startsWith(
            'data:image/'
          )
        ) {

          return json(
            {
              status: 'error',
              message:
                'Format foto tidak valid.',
            },
            400
          );
        }



        // ==================================================
        // CEK DATA GURU
        // ==================================================

        const guruRows =
          await conn.execute(
            `
              SELECT
                id_user,
                nama,
                aktif

              FROM guru

              WHERE
                id_user = ?
                AND aktif = 1

              LIMIT 1
            `,
            [
              idUser
            ]
          ) as any[];


        if (
          !Array.isArray(guruRows) ||
          guruRows.length === 0
        ) {

          return json(
            {
              status: 'error',
              message:
                'Data guru tidak ditemukan.',
            },
            404
          );
        }


        const guru =
          guruRows[0];


        const namaGuru =
          String(
            guru.nama
          );



        // ==================================================
        // CEK ABSENSI GURU PADA TANGGAL TERSEBUT
        // ==================================================

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


              WHERE
                id_user = ?
                AND tanggal = ?


              LIMIT 1
            `,
            [
              idUser,
              tanggal
            ]
          ) as any[];


        const absenHariIni =
          Array.isArray(absenRows) &&
          absenRows.length > 0

            ? absenRows[0]

            : null;



        // ==================================================
        // ABSEN MASUK
        // ==================================================

        if (
          status === 'MASUK'
        ) {


          // ----------------------------------------------
          // CEGAH MASUK DUA KALI
          // ----------------------------------------------

          if (
            absenHariIni &&
            absenHariIni.jam_masuk
          ) {

            return json(
              {
                status: 'error',
                message:
                  'Anda sudah melakukan absen MASUK hari ini.',
              },
              409
            );
          }



          // ----------------------------------------------
          // UPLOAD FOTO MASUK
          // GOOGLE DRIVE VIA APPS SCRIPT
          // ----------------------------------------------

          const hasilFoto =
            await uploadFoto(
              appsScriptUrl,
              {
                id_user:
                  idUser,

                name:
                  namaGuru,

                date:
                  tanggal,

                status:
                  'MASUK',

                photo:
                  photo,
              }
            );



          if (
            hasilFoto.status !== 'success' ||
            !hasilFoto.file_id
          ) {

            return json(
              {
                status: 'error',

                message:
                  hasilFoto.message ||
                  'Foto masuk gagal disimpan ke Google Drive.',
              },
              500
            );
          }



          // ----------------------------------------------
          // SIMPAN ABSENSI KE TIDB
          // ----------------------------------------------

          try {

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

          } catch (error) {

            console.error(
              'INSERT ABSENSI ERROR:',
              error
            );

            return json(
              {
                status: 'error',
                message:
                  'Data absensi gagal disimpan ke TiDB.',
              },
              500
            );
          }



          return json({
            status:
              'success',

            message:
              'Absensi MASUK berhasil disimpan.',

            data: {

              id_user:
                idUser,

              name:
                namaGuru,

              date:
                tanggal,

              time:
                jam,

              jam_masuk:
                jam,

              jam_pulang:
                null,

              status:
                'MASUK',

              keterangan:
                keterangan,

              foto_masuk_file_id:
                hasilFoto.file_id,

              foto_pulang_file_id:
                null
            }
          });
        }



        // ==================================================
        // ABSEN PULANG
        // ==================================================

        if (
          status === 'PULANG'
        ) {


          // ----------------------------------------------
          // WAJIB SUDAH ABSEN MASUK
          // ----------------------------------------------

          if (
            !absenHariIni ||
            !absenHariIni.jam_masuk
          ) {

            return json(
              {
                status: 'error',
                message:
                  'Anda belum melakukan absen MASUK hari ini.',
              },
              409
            );
          }



          // ----------------------------------------------
          // CEGAH PULANG DUA KALI
          // ----------------------------------------------

          if (
            absenHariIni.jam_pulang
          ) {

            return json(
              {
                status: 'error',
                message:
                  'Anda sudah melakukan absen PULANG hari ini.',
              },
              409
            );
          }



          // ----------------------------------------------
          // UPLOAD FOTO PULANG
          // ----------------------------------------------

          const hasilFoto =
            await uploadFoto(
              appsScriptUrl,
              {
                id_user:
                  idUser,

                name:
                  namaGuru,

                date:
                  tanggal,

                status:
                  'PULANG',

                photo:
                  photo,
              }
            );



          if (
            hasilFoto.status !== 'success' ||
            !hasilFoto.file_id
          ) {

            return json(
              {
                status: 'error',

                message:
                  hasilFoto.message ||
                  'Foto pulang gagal disimpan ke Google Drive.',
              },
              500
            );
          }



          // ----------------------------------------------
          // UPDATE DATA TIDB
          // ----------------------------------------------

          await conn.execute(
            `
              UPDATE absensi

              SET
                jam_pulang = ?,

                status =
                  'MASUK & PULANG',

                foto_pulang_file_id = ?,

                updated_at =
                  CURRENT_TIMESTAMP


              WHERE
                id_user = ?
                AND tanggal = ?
            `,
            [
              jam,

              hasilFoto.file_id,

              idUser,

              tanggal
            ]
          );



          const jamMasuk =
            formatJam(
              absenHariIni.jam_masuk
            );



          return json({
            status:
              'success',

            message:
              'Absensi PULANG berhasil disimpan.',

            data: {

              id_user:
                idUser,

              name:
                namaGuru,

              date:
                tanggal,

              time:
                jamMasuk +
                ' - ' +
                jam,

              jam_masuk:
                jamMasuk,

              jam_pulang:
                jam,

              status:
                'MASUK & PULANG',

              keterangan:
                keterangan,

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
      // METHOD TIDAK DIDUKUNG
      // ==================================================

      return json(
        {
          status:
            'error',

          message:
            'Method tidak didukung.',
        },
        405
      );


    } catch (error) {

      console.error(
        'API ABSENSI ERROR:',
        error
      );


      return json(
        {
          status:
            'error',

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



// ======================================================
// UPLOAD FOTO KE GOOGLE APPS SCRIPT
// ======================================================

async function uploadFoto(
  appsScriptUrl: string,

  data: {

    id_user:
      string;

    name:
      string;

    date:
      string;

    status:
      AbsenStatus;

    photo:
      string;
  }
) {

  try {

    const response =
      await fetch(
        appsScriptUrl,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8',
          },

          body:
            JSON.stringify({
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
        JSON.parse(
          text
        );

    } catch {

      console.error(
        'RESPONSE APPS SCRIPT:',
        text
      );

      return {
        status:
          'error',

        message:
          'Response Apps Script bukan JSON.',
      };
    }


    return result;


  } catch (error) {

    console.error(
      'UPLOAD FOTO ERROR:',
      error
    );


    return {

      status:
        'error',

      message:
        error instanceof Error

          ? error.message

          : String(error),
    };
  }
}



// ======================================================
// FORMAT TIME TIDB MENJADI HH:MM
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
    /^\d{2}:\d{2}/.test(
      text
    )
  ) {

    return text.substring(
      0,
      5
    );
  }


  return text;
}
