const express = require("express");
const { getDB } = require("./db");
const mongoose = require("mongoose")
const app = express();
app.use(express.json());
const cors = require("cors");
const { ObjectId } = require("mongodb");

// const   corsOptions = {
//   origin: '*',
//   methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH'],
//   allowedHeaders: 'Content-Type',
  // credentials: true, 
// };

app.use(cors({origin: "*"}));
let users = [];
async function getDatabase() {
  users = await getDB;
}

getDatabase();
let port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});

app.get("/",async (req, res)=>{
  res.status(200).json({"message": "welcome"})
})

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
  const newViewedTime = new Date().toISOString();
  const doc = await users[1].findOne({_id: ObjectId(req.params.id)})
  const isUserIdPresent = doc.viewedBy.some((viewed) => viewed.userid === req.query.uid);
  let result;
  if(isUserIdPresent){
    result = await users[1].findOneAndUpdate(
      { _id: ObjectId(req.params.id), "viewedBy.userid": req.query.uid },
      {
        $set: { "viewedBy.$.viewed_time": newViewedTime }
      }, {returnDocument: 'after'}
    );
  }else{
    result = await users[1].findOneAndUpdate(
      { _id: ObjectId(req.params.id) },
      {
        $addToSet: {
          viewedBy: { userid: req.query.uid, viewed_time: newViewedTime }
        }
      }, {returnDocument: 'after'}
    );
  }
  res.status(200).json(result.value)
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
          $pull: { likedBy: { userid: uid } } 
        }
      );

      console.log("Removed uid from likedBy array");
      res.status(200).send(result)
    } else {
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: isDisLiked ? 2 : 1 }, 
          $push: { likedBy: {userid: uid, "viewed_time":new Date().toISOString() } } ,
          $pull: { dislikedBy: isDisLiked && { userid: uid } }
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
  const { uid, isDisLiked, isLiked, viewed_time } = req.body; 
  console.log(viewed_time)

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
          $pull: { dislikedBy: { userid: uid } } 
        }
      );

      console.log("Removed uid from dislikedBy array");
      res.status(200).send(result)
    } else {
      let date = new Date().toISOString();
      let result = await users[1].updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $inc: { likes: isLiked ? -2 : -1 }, 
          $push: { dislikedBy: { userid: uid, "viewed_time": date } },
          $pull: { likedBy: isLiked && { userid: uid } }
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

app.post("/post/save/:id/:state", async (req, res)=> {
  const userid = req.params.id
  const state = req.params.state
  let result, resu;
  if(state=="true"){
    console.log("pushed")
    result = await users[0].updateOne({"_id": ObjectId(userid)}, {$addToSet: {"saved_posts": req.body}})
    resu = await users[1].updateOne({"_id": ObjectId(req.body.post_id)}, {$addToSet: {"saved_by": {userid: userid, "viewed_time": new Date().toISOString()} }})
  }else{
    result = await users[0].updateOne({"_id": ObjectId(userid)},{$pull: {"saved_posts": req.body}});
    resu = await users[1].updateOne({"_id": ObjectId(req.body.post_id)},{$pull: {"saved_by": {userid: userid, "viewed_time": new Date().toISOString()}}});
    console.log("pulled")
  }
  
  res.status(200).json(resu)

})

app.post("/post/update/:id", async (req,res)=>{
  
  const updatedData = {
    body: req.body.body,
    title: req.body.title,
    tag: req.body.tag
  };
  const result = await users[1].findOneAndUpdate({ _id: ObjectId(req.params.id) }, { $set: updatedData }, {returnDocument: 'after'});
  res.status(200).json(result)
})

app.get("/post/delete/:id", async (req,res)=> {
  const result = await users[1].deleteOne({ _id: ObjectId(req.params.id) });
  res.status(200).json(result)
})

app.get("/profile/myposts/:id", async (req,res)=>{
  const result = await users[1].find({uid: req.params.id}).toArray()
  res.status(200).json(result)
})

app.get("/profile/lastviewed/:id", async (req,res)=>{
  const viewedByResult = await users[1].find({ 'viewedBy.userid': req.params.id }).toArray();
  res.status(200).json(viewedByResult)
})

app.get("/profile/liked/:id", async (req,res)=>{
  const viewedByResult = await users[1].find({ 'likedBy.userid': req.params.id }).toArray();
  res.status(200).json(viewedByResult)
})

app.get("/profile/disliked/:id", async (req,res)=>{
  const viewedByResult = await users[1].find({ 'dislikedBy.userid': req.params.id }).toArray();
  res.status(200).json(viewedByResult)
})

app.get("/profile/saved/:id", async (req,res)=>{
  const viewedByResult = await users[1].find({ 'saved_by.userid': req.params.id }).toArray();
  res.status(200).json(viewedByResult)
})

app.get("/test", async (req,res)=> {
  await users[1].updateMany(
    { viewedBy: null },
    {
      $set: {
        viewedBy: []
      }
    }
  );
  await users[1].updateMany(
    { likedBy: null },
    {
      $set: {
        likedBy: []
      }
    }
  );
  await users[1].updateMany(
    { dislikedBy: null },
    {
      $set: {
        dislikedBy: []
      }
    }
  );
  await users[1].updateMany(
    { "saved_by": null },
    {
      $set: {
        "saved_by": []
      }
    }
  );
  res.status(200).json({})
});