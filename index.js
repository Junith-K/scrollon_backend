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
  try {
    const bodi = req.body;
    
    if (!bodi) {
      return res.status(400).json({ error: "Request body is empty" });
    }
    
    const result = await users[0].insertOne(bodi);
    console.log(result)
    if (result && result.insertedId ) {
      res.status(200).json(result);
    } else {
      return res.status(500).json({ error: "Failed to register user" });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email or password is missing" });
    }

    const user = await users[0].findOne({ email, password });

    if (!user) {
      return res.status(404).json({ error: "No user found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


app.post("/create-post", async (req, res) => {
  try {
    const post = req.body;

    if (!post) {
      return res.status(400).json({ error: "Request body is empty" });
    }

    const result = await users[1].insertOne(post);

    if (!result || !result.insertedCount) {
      return res.status(500).json({ error: "Failed to create post" });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


app.get("/get-posts", async (req, res) => {
  try {
    const posts = await users[1].find().toArray();
    
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


app.get("/post/:id", async (req, res) => {
  try {
    const newViewedTime = new Date().toISOString();
    const doc = await users[1].findOne({ _id: ObjectId(req.params.id) });

    if (!doc) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isUserIdPresent = doc.viewedBy.some(
      (viewed) => viewed.userid === req.query.uid
    );

    let result;

    if (isUserIdPresent) {
      result = await users[1].findOneAndUpdate(
        { _id: ObjectId(req.params.id), "viewedBy.userid": req.query.uid },
        {
          $set: { "viewedBy.$.viewed_time": newViewedTime },
        },
        { returnDocument: "after" }
      );
    } else {
      result = await users[1].findOneAndUpdate(
        { _id: ObjectId(req.params.id) },
        {
          $addToSet: {
            viewedBy: { userid: req.query.uid, viewed_time: newViewedTime },
          },
        },
        { returnDocument: "after" }
      );
    }

    if (!result.value) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(result.value);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


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

app.post("/comment/:id", async (req, res) => {
  try {
    const body = req.body;

    if (!body) {
      return res.status(400).json({ error: "Request body is empty" });
    }

    const result = await users[1].updateOne(
      { _id: ObjectId(req.params.id) },
      { $push: { comment: body } }
    );

    if (!result) {
      return res.status(500).json({ error: "Failed to add comment" });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});


app.post("/post/save/:id/:state", async (req, res) => {
  const userid = req.params.id;
  const state = req.params.state;
  let result, resu;

  try {
    if (state === "true") {
      console.log("pushed");
      result = await users[0].updateOne(
        { _id: ObjectId(userid) },
        { $addToSet: { saved_posts: req.body } }
      );

      resu = await users[1].updateOne(
        { _id: ObjectId(req.body.post_id) },
        {
          $addToSet: {
            saved_by: {
              userid: userid,
              viewed_time: new Date().toISOString(),
            },
          },
        }
      );
    } else {
      console.log("pulled");
      result = await users[0].updateOne(
        { _id: ObjectId(userid) },
        { $pull: { saved_posts: req.body } }
      );

      resu = await users[1].updateOne(
        { _id: ObjectId(req.body.post_id) },
        {
          $pull: {
            saved_by: { userid: userid, viewed_time: new Date().toISOString() },
          },
        }
      );
    }

    res.status(200).json(resu);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json(error);
  }
});


app.post("/post/update/:id", async (req, res) => {
  try {
    const updatedData = {
      body: req.body.body,
      title: req.body.title,
      tag: req.body.tag,
    };

    const result = await users[1].findOneAndUpdate(
      { _id: ObjectId(req.params.id) },
      { $set: updatedData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json(error);
  }
});


app.get("/post/delete/:id", async (req, res) => {
  try {
    const result = await users[1].deleteOne({ _id: ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json(error);
  }
});


app.get("/profile/myposts/:id", async (req, res) => {
  try {
    const result = await users[1].find({ uid: req.params.id }).toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json(error);
  }
});


app.get("/profile/lastviewed/:id", async (req, res) => {
  try {
    const viewedByResult = await users[1].find({ 'viewedBy.userid': req.params.id }).toArray();
    res.status(200).json(viewedByResult);
  } catch (error) {
    console.error("Error fetching last viewed posts:", error);
    res.status(500).json(error);
  }
});


app.get("/profile/liked/:id", async (req, res) => {
  try {
    const likedByResult = await users[1].find({ 'likedBy.userid': req.params.id }).toArray();
    res.status(200).json(likedByResult);
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    res.status(500).json(error);
  }
});


app.get("/profile/disliked/:id", async (req, res) => {
  try {
    const dislikedByResult = await users[1].find({ 'dislikedBy.userid': req.params.id }).toArray();
    res.status(200).json(dislikedByResult);
  } catch (error) {
    console.error("Error fetching disliked posts:", error);
    res.status(500).json(error);
  }
});


app.get("/profile/saved/:id", async (req, res) => {
  try {
    const savedByResult = await users[1].find({ 'saved_by.userid': req.params.id }).toArray();
    res.status(200).json(savedByResult);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json(error);
  }
});