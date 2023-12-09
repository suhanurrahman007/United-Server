const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.ACCESS_PAYMENT_SECRET)
const app = express()
const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_UNITED_USER}:${process.env.DB_UNITED_PASS}@cluster0.33tct4k.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const announcementCollection = client.db("unitedDB").collection("announcement")
        const postsCollection = client.db("unitedDB").collection("posts")
        const usersCollection = client.db("unitedDB").collection("users")
        const commentCollection = client.db("unitedDB").collection("comment")
        const paymentCollection = client.db("unitedDB").collection("payment")
        const reportCollection = client.db("unitedDB").collection("report")
        const searchCollection = client.db("unitedDB").collection("search")






        // Jwt api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({
                token
            });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({
                    message: 'unauthorized access'
                });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({
                        message: 'unauthorized access'
                    })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = {
                email: email
            };
            const user = await usersCollection.findOne(query);
            const isAdmin = user ?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({
                    message: 'forbidden access'
                });
            }
            next();
        }

        //announcement Api here
        app.get("/announcement", async (req, res) => {
            const result = await announcementCollection.find().toArray()
            res.send(result)
        })

        app.post("/announcement", async (req, res) => {
            const announcement = req.body
            const result = await announcementCollection.insertOne(announcement)
            res.send(result)
        })

        //search api here
        app.post("/search", async(req, res) =>{
            const search = req.body
            const result = await searchCollection.insertOne(search)
            res.send(result)
        })

        //Comment api here
        app.get("/comment", async (req, res) => {
            const result = await commentCollection.find().toArray()
            res.send(result)
        })

        app.post("/comment", async (req, res) => {
            const comment = req.body
            const result = await commentCollection.insertOne(comment)
            res.send(result)
        })

        //report api here
        app.get("/report", async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })

        app.post("/report", async (req, res) => {
            const report = req.body
            const result = await reportCollection.insertOne(report)
            res.send(result)
        })

        app.put('/report/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body
            // console.log(id, status);

            const filter = {
                _id: new ObjectId(id)
            };


            const updatedDoc = {
                $set: {
                    status: status.status,
                }
            }
            const result = await reportCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        //payment api here
        app.post("/create-payment-intent", async (req, res) => {
            try {
                const {
                    amount
                } = req.body

                const totalAmount = parseFloat(amount * 100)
                console.log(totalAmount);
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: totalAmount,
                    currency: "usd",
                    payment_method_types: ["card"]
                })

                res.send({
                    clientSecret: paymentIntent.client_secret
                })
            } catch (error) {
                console.log(error.message);
            }
        })

        app.post("/payment", async (req, res) => {
            const payment = req.body
            
            const result = await paymentCollection.insertOne(payment)
            res.send(result)
        })

        app.get("/payment", async (req, res) => {
            // const user = req.query.email
            // const query ={}
            // if (user) {
            //     query.email = user;
            // }
            const result = await paymentCollection.find().toArray()
            res.send(result)
        })

        // posts api here
        app.get('/posts', async (req, res) => {
            const posts = req.query.email
             const page = Number(req.query.page);
             const size = Number(req.query.size);
             console.log(page, size);
            // const filter = req.query
            // console.log(filter);
            let query = {};
            const options = {
                sort: {
                    time: -1,
                }
            }

            if (posts) {
                query.email = posts;
            }
            const result = await postsCollection.find(query, options).skip(page * size).limit(size).toArray()
            res.send(result)
        });

        app.get("/postCount", async(req, res) =>{
            const count = await postsCollection.estimatedDocumentCount()
            res.send({count})
        })
        app.post("/posts", async (req, res) => {
            const post = req.body
            post.time = new Date();
            const result = await postsCollection.insertOne(post)
            res.send(result)
        })

        app.put('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const vote = req.body
            // console.log(id, vote);

            const filter = {
                _id: new ObjectId(id)
            };


            const updatedDoc = {
                $set: {
                    upVote: vote.upVote,
                }
            }
            const result = await postsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.patch('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const vote = req.body
            //  console.log(id, vote);

            const filter = {
                _id: new ObjectId(id)
            };


            const updatedDoc = {
                $set: {
                    downVote: vote.downVote,
                }
            }
            const result = await postsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/posts/:id', async (req, res) => {
            const id = req.params.id
            const queryId = {
                _id: new ObjectId(id)
            }
            const result = await postsCollection.deleteOne(queryId)
            res.send(result)
        })

        //user api here

        app.get('/admin-stats', async(req, res) =>{
            const posts = await postsCollection.estimatedDocumentCount()
            const comments = await commentCollection.estimatedDocumentCount()
            const users  = await usersCollection.estimatedDocumentCount()
            res.send({
                users,
                posts,
                comments
            })

        })

        app.get("/users", verifyToken, async (req, res) => {
            const admin = req.query.role
            // console.log(admin);
            const query = {}

            if (admin) {
                query.role = admin;
            }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({
                    message: 'forbidden access'
                })
            }

            const query = {
                email: email
            };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user ?.role === 'admin';
            }
            res.send({
                admin
            });
        })


        app.post("/users", async (req, res) => {
            const user = req.body
            const query = {
                email: user.email
            }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({
                    message: "user already exist",
                    insertedId: null
                })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({
        //     ping: 1
        // });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("data is Loaded.........!!")
})

app.listen(port, () => {
    console.log(`Data loaded post is ${port}`);
})