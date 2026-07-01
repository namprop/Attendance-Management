const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function fixRecords() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const records = await db.collection('time_records-timekeeping').find({ date: { $not: /^\d{4}-\d{2}-\d{2}$/ } }).toArray();
  
  console.log('Found corrupted records:', records.length);
  for (const r of records) {
    console.log(r._id, r.date, r.clockIn);
    await db.collection('time_records-timekeeping').deleteOne({ _id: r._id });
  }
  
  console.log('Deleted corrupted records.');
  await client.close();
}
fixRecords().catch(console.error);
