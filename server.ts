import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { nanoid } from 'nanoid'

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.post("/", async (req, res) => {
  try {
    const shortenedURL = String(req.body.customURL).length > 0 ? req.body.customURL : nanoid();
    const values = [shortenedURL, req.body.originalURL];
    
    let newPost: any = await client.query("INSERT INTO links (shortened_URL, original_URL) " + 
    "VALUES ($1, $2) RETURNING *;", values)
    console.log("Hey")
    res.json(newPost.rows[0]);
  } catch (err) {
    console.log("Hello")
    const status = err.statusCode || 500;
    const message = err.detail;
    const data = err.data;
    res.status(status).json({ message: message, data: data });
  }
});

app.get("/", async (req, res) => {
  const linksArr = await client.query('SELECT * FROM links ORDER BY id DESC LIMIT 10;');
  res.json(linksArr.rows);
});

app.get("/:shortened_URL", async (req, res) => {
  const values = [req.params.shortened_URL]
  const redirectQuery = {
    text: 'SELECT original_URL FROM links ' + 
    'WHERE shortened_URL = $1;',
    values,
    rowMode: 'array',
  }
  const redirectURL = await client.query(redirectQuery);
  res.redirect(redirectURL.rows[0][0]);
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
