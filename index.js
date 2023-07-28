const express = require("express");
const { getDB } = require("./db");
const mongoose = require("mongoose")
const app = express();
app.use(express.json());
const cors = require("cors");
const { ObjectId } = require("mongodb");
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
let users = [];
async function getDatabase() {
  users = await getDB;
}

getDatabase();
if (!users[0]) {
  let port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Listening to port ${port}`);
  });
}

app.post("/register", async (req, res) => {
  let bodi = req.body;
  let result = await users[0].insertOne(bodi);
  res.status(200).json(result);
});

app.post("/sign-in", async (req, res)=>{
  var arr = await users[0].findOne({email: req.body.email, password: req.body.password})
  if(!arr){
    res.status(200).json({error: "No user found"})
  }
  else{
    res.status(200).json(arr)
  }
})

app.post("/create-post", async (req, res)=>{
  let result = await users[1].insertOne(req.body)
  res.status(200).json(result);
})

app.get("/get-posts", async (req, res)=>{
  let result =  await users[1].find().toArray()
  res.status(200).json(result)
})

app.get("/post/:id", async (req, res)=>{
  let result = await users[1].findOne({_id:ObjectId(req.params.id)});
  res.status(200).json(result)
})

app.post("/post/like/:id", async (req, res)=>{
  const { uid, isLiked, isDisLiked } = req.body; 

  try {
    const post = await users[1].findOne({ _id: ObjectId(req.params.id) });

    if (!post) {
      res.status(404);
      return;
    }

    if (isLiked) {
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: -1 },
          $pull: { likedBy: uid } 
        }
      );

      console.log("Removed uid from likedBy array");
      res.status(200).send(result)
    } else {
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: isDisLiked ? 2 : 1 }, 
          $push: { likedBy: uid } ,
          $pull: { dislikedBy: isDisLiked && uid }
        }
      );

      console.log("Added uid to likedBy array");
      res.status(200).send(result);
    }
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).send(err);
  }
})

app.post("/post/dislike/:id", async (req, res)=>{
  const { uid, isDisLiked, isLiked } = req.body; 

  try {
    const post = await users[1].findOne({ _id: ObjectId(req.params.id) });

    if (!post) {
      res.status(404);
      return;
    }

    if (isDisLiked) {
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: 1 },
          $pull: { dislikedBy: uid } 
        }
      );

      console.log("Removed uid from dislikedBy array");
      res.status(200).send(result)
    } else {
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: isLiked ? -2 : -1 }, 
          $push: { dislikedBy: uid },
          $pull: { likedBy: isLiked && uid }
        }
      );

      console.log("Added uid to dislikedBy array");
      res.status(200).send(result);
    }
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).send(err);
  }
})

app.post("/comment/:id", async (req, res)=>{
  let bodi = req.body
  let result = await users[1].update({"_id": ObjectId(req.params.id)},{$push: {"comment": bodi}})
  res.status(200).json(result)
})

app.get("/:userid/post/:id", async (req, res)=> {
  console.log(req.params.userid)
  console.log(req.params.id);
  res.status(200).json({})
})