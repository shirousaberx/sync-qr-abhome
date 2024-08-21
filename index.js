// Script ini untuk sync dari database cloud ke local
// Sync dengan fetch data dari master mulai dari = waktu sekarang - SYNC_INTERVAL

// Hanya untuk table member dan qr dari DB abhome_tenant

const mysql = require('mysql2/promise');
const sqlstring = require('sqlstring')
const { format } = require('fecha')
require('dotenv').config()

const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL)  // sync dari waktu 1 menit ke belakang

const pool_local = mysql.createPool({
  host           : process.env.LOCAL_HOST, 
  user           : process.env.LOCAL_USER, 
  port           : process.env.LOCAL_PORT,
  password       : process.env.LOCAL_PASSWORD, 
  database       : process.env.LOCAL_DATABASE, 
  connectionLimit: 5, 
});

const pool_cloud = mysql.createPool({
  host           : process.env.CLOUD_HOST, 
  user           : process.env.CLOUD_USER, 
  port           : process.env.CLOUD_PORT,
  password       : process.env.CLOUD_PASSWORD, 
  database       : process.env.CLOUD_DATABASE, 
  connectionLimit: 5, 
});

let updateQRFromCloud = null;
let updateMemberFromCloud = null;
let firstTime = true;   // untuk pertama kali, copy semua dari database master

const fetchFromCloud = async() => {
  let syncStartTime = new Date();
  // sync data mulai dari SYNC_INTERVAL menit yang lalu
  syncStartTime.setMinutes(syncStartTime.getMinutes() - SYNC_INTERVAL)  

  let syncStartTime_str = format(syncStartTime, 'YYYY-MM-DD HH:mm:ss')
  
  // ============== Fetch from qr table ==============
  let query = sqlstring.format(`
    SELECT * 
    FROM qr
    WHERE created_at >= ?
    `, 
    [syncStartTime_str] 
  )

  let rows = (await pool_cloud.query(query))[0];
  updateQRFromCloud = rows
  // ============== END Fetch from qr table ==============
  
  // ============== Fetch from member table ==============
  
  query = sqlstring.format(`
    SELECT * 
    FROM member 
    WHERE created_at >= ? OR updated_at >= ?
    `, 
    [syncStartTime_str, syncStartTime_str]
  )
  
  rows = (await pool_cloud.query(query))[0];
  updateMemberFromCloud = rows
  // ============== END Fetch from member table ==============

  firstTime = false
}

const upsertQRIntoLocal = async() => {
  if (!updateQRFromCloud || updateQRFromCloud.length === 0) {
    console.log('No data from QR, skipping!')
    return;
  }

  let query = sqlstring.format(`
    REPLACE INTO qr
    VALUES
  `)
  
  for (item of updateQRFromCloud) {
    query += sqlstring.format(`(?, ?, ?, ?, ?, ?),`,
      [item.code, item.member_id, item.status, item.created_at, item.expired_at, item.verified_at]
    )
  }
  
  query = query.substring(0, query.length - 1) + ';'
  
  let rows = (await pool_local.query(query))[0];
  console.log('result from upsert qr: ', rows)
}

const upsertMemberIntoLocal = async() => {
  if (!updateMemberFromCloud || updateMemberFromCloud.length === 0) {
    console.log('No data from Member, skipping!')
    return;
  }
  query = sqlstring.format(`
    REPLACE INTO member
    VALUES
  `)

  for (item of updateMemberFromCloud) {
    query += sqlstring.format(`
      (?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?),
      `,
      [
        item.id, item.location_id, item.code, item.name,
        item.phone, item.email, item.id_card_number, item.id_card_picture,
        item.selfie_picture, item.username, item.password, item.password_reset_token,
        item.auth_key, item.access_token, item.status, item.ownership_status,
        item.created_at, item.created_by, item.updated_at, item.updated_by
      ]
    )
  }

  query = query.trim()

  query = query.substring(0, query.length - 1) + ';'

  rows = (await pool_local.query(query))[0];
  console.log('result from upsert member: ', rows)
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const execute = async() => {
  const startTime = performance.now()
  
  await fetchFromCloud();
  await upsertQRIntoLocal();
  await upsertMemberIntoLocal();

  const endTime = performance.now()

  const elapsedTime = endTime - startTime;
  console.log(`Elapsed time: ${elapsedTime} milliseconds\n\n`);

  await pool_cloud.end()
  await pool_local.end()
}

execute()