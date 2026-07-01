import { MongoClient } from 'mongodb';

const uri = 'mongodb://hupuna-test:hupuna123@116.118.45.216:27017/hupuna-test';
const dbName = 'hupuna-test';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        
        console.log('--- ZktecoConnectorLocalDevices ---');
        const localDevs = await db.collection('ZktecoConnectorLocalDevices').find({}).toArray();
        console.log(JSON.stringify(localDevs, null, 2));

        console.log('--- ZktecoDevices ---');
        const devices = await db.collection('ZktecoDevices').find({}).toArray();
        console.log(JSON.stringify(devices, null, 2));

        console.log('--- ZktecoOfflineBuffer Count ---');
        const bufferCount = await db.collection('ZktecoOfflineBuffer').countDocuments();
        console.log('Total buffered logs:', bufferCount);

        console.log('--- time_records-timekeeping (Today) ---');
        const records = await db.collection('time_records-timekeeping').find({ date: '2026-06-29' }).toArray();
        console.log(JSON.stringify(records, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();
