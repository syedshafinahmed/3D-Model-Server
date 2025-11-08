const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
// const port = process.env.PORT || 3000;
const port = 3000;

app.use(cors());
app.use(express.json());

const admin = require("firebase-admin");

const serviceAccount = require("./serviceKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@zyra.l75hwjs.mongodb.net/?appName=Zyra`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
      message: "Unauthorized Access. Token not found!",
    });
  }
  const token = authorization.split(" ")[1];
  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "Unauthorized Access",
    });
  }
  // console.log();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("model-db");
    const modelCollection = db.collection("models");
    const downloadsCollection = db.collection("downloads");

    // find
    app.get("/models", async (req, res) => {
      const result = await modelCollection.find().toArray();
      res.send(result);
    });

    app.get("/models/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await modelCollection.findOne({ _id: new ObjectId(id) });
      res.send({
        success: true,
        result,
      });
    });

    // post (insert, insertOne, insertMany)
    app.post("/models", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await modelCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    // update(updateOne, updateMany)
    app.put("/models/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const ObjectId = new ObjectId(id);
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: data,
      };
      const result = await modelCollection.updateOne(filter, update);
      res.send({
        success: true,
        result,
      });
    });

    // delete
    app.delete("/models/:id", async (req, res) => {
      const { id } = req.params;
      // const filter = { _id: new ObjectId(id) };
      const result = await modelCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({
        success: true,
        result,
      });
    });

    // latest 6 data
    app.get("/latest-models", async (req, res) => {
      const result = await modelCollection
        .find()
        .sort({ created_at: -1 })
        .limit(8)
        .toArray();

      res.send(result);
    });

    app.get("/my-models", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await modelCollection
        .find({ created_by: email })
        .toArray();
      res.send(result);
    });

    app.post("/downloads", async (req, res) => {
      const data = req.body;
      const result = await downloadsCollection.insertOne(data);
      res.send(result);
    });

    app.get("/my-downloads", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await downloadsCollection
        .find({ downloaded_by: email })
        .toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
