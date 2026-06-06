import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://immanuelmother_db_user:imman123@cluster0.5gx7nud.mongodb.net/osm?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('osm');
  const accounts = await db.collection('accounts').find({}).toArray();
  const users = await db.collection('users').find({}).toArray();
  
  console.log("USERS:", users.length);
  console.log("ACCOUNTS:", JSON.stringify(accounts, null, 2));
  console.log("USERS DUMP:", JSON.stringify(users, null, 2));
  
  await client.close();
}
run();
