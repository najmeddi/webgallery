const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
const express = require('express')
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const validator = require('validator');

const cookie = require('cookie');

const session = require('express-session');
app.use(session({
    // TODO: Check if a unique random string is possible
    secret: 'placeholder string for now',
    resave: false,
    saveUninitialized: true,
    cookie: {httpOnly: true, sameSite: true}
}));

// Makes sure to encrypt cookie using https when in production
if (app.get('env') === 'production'){
    session.cookie.secure = true;
}

// Makes a salt that is used to store store salted hash for users' passwords
function generateSalt(){
    return crypto.randomBytes(16).toString('base64');
}

// Makes a hash that is used to store the halted hash for the users' passowrds
function generateHash (password, salt){
    let hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads')});

/* ============= DATA TYPES =================
    
        Post object in posts must have these attributes:
            - (String)  postId
            - (String)  author
            - (String)  title
            - (file)    image
            - (Array)   comments

        User object in users must have these attributes
            - (String)  userId
            - (String)  username
            - (String)  hash
            - (Array)   userPosts
            - (Array)   userComments
=============================================*/

const Datastore = require('nedb');
let posts = new Datastore({filename: path.join(__dirname, 'db', 'posts.db'), autoload: true, timestampData: true});
let users = new Datastore({filename: path.join(__dirname, 'db', 'users.db'), autoload: true});


let Post = function(post, imageFile, username){
    this.title = post.title;
    this.author = username;
    this.image = imageFile;
    this.upvotes = 0;
    this.downvotes = 0;
    this.comments = [];
};

let Comment = function(content, username){
    this.id = Math.floor(Math.random() * Date.now());
    this.content = content;
    this.author = username;
};

let User = function(username, hash){
    this.username = username;
    this.hash = hash;
    this.posts = [];
    this.comments = [];
}


app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

app.use(function(req, res, next){
    var username = (req.session.username)? req.session.username : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    next();
});

// This is a middleware that can be used in express function arguments
// Checks whether the username is stored in the session cookie, otherwise
// access denied to the resource being requested
let isAuthenticated = function(req, res, next){
    if(!req.session.username) return res.status(401).end("Access denied");
    // Calling next provides a horizontal sequence of middleware to be called in function parameters
    return next();
};

// Middleware to validate requests given to the server
// Makes sure that the given username requested only contains alphanumeric characters
let checkUsername = function(req, res, next){
    // check if the string contains only letters and numbers (a-zA-Z0-9)
    if(!validator.isAlphanumeric(req.body.username)) return res.status(400).end('Improper input for username');
    next();
}

// Middleware to check if a given password is a strong password
let measurePassword = function(req, res, next){
    const isStrongPassword = validator.isStrongPassword(req.body.password);
    if(!isStrongPassword) return res.status(400).end(`Improper password given. Password must include at least:
        \n- 8 characters
        \n- one lower case character
        \n- one upper case character
        \n- one special character: [-#!$@%^&*()_+|~=\`{}\\[\\]:";'<>?,.\\/ ]$
        `);
    next();

}

let sanitizeContent = function(req, res, next){
    // Replaces unwanted characters with HTML entities
    for(const key in req.body){
        req.body[key] = validator.escape(req.body[key]);
    }
    next();
}


let checkId = function(req, res, next){
    if(!validator.isAlphanumeric(req.params.id)) return res.status(400).end("Improper user id given");
    next();
}

let isImage = function(req, res, next){
    const acceptedImageFormats = ['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'];
    if(!validator.isMimeType(req.file.mimetype)) return res.status(400).end("Improper file format");
    if(!(acceptedImageFormats.includes(req.file.mimetype))) return res.status(400).end("File must be .avif, .gif, .jpeg, .png, or .svg+xml format");
    next();
}

let checkFileSize = function(req, res, next){
    const maxFileSize = 8388608;    // max file size currently at 8MiB
    if(req.file.size > maxFileSize) return res.status(413).end("File size cannot be greater than 8MiB");
    next();
}


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/static/index.html");
});

app.get("/profile/", (req, res) => {
    res.sendFile(path.join(__dirname, '/static/profile.html'));
});

app.get("/api/posts/", function(req, res, next){
    posts.find({}).sort({createdAt: -1}).limit(5).exec(function(err, posts){
        if(err) return res.status(500).end(err);
        return res.json(posts.reverse());
    });
});

app.get("/api/posts/:id/", checkId, function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        return res.json(post)
    });
});

app.get("/api/posts/:id/image/", checkId, function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        else{
            res.setHeader('Content-Type', post.image.mimetype);
            res.sendFile(post.image.path);
        }
    });    
});

app.get("/api/posts/:id/comments/", function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        else{
            return res.json(post.comments);
        }
    });    
});

// curl -X PUT -d "username=admin&password=pass4admin&confirmPassword=pass4admin" http://localhost:3000/signup/
app.put('/api/signup/', measurePassword,function(req, res, next){
    // Get the information given by the request
    if(!('username' in req.body)) return res.status(400).end('No username was provided');
    if(!('password' in req.body)) return res.status(400).end('No password was provided');
    if(!('confirmPassword' in req.body)) return res.status(400).end('No confirmation for the password was provided');
    const username = req.body.username;
    const password = req.body.password;
    const confirmPassword =req.body.confirmPassword;
    // Check if the given the password and confirmation password match
    if(!(password === confirmPassword)) return res.status(400).end('The password and confirmation password do not match');
    // Check that the user does not already exist
    users.findOne({_id: username}, function(err, user){
        if(err) return res.status(500).end(err);
        if(user) return res.status(409).end("This username already exists");
        // Use the password to generated a salted hash to store
        const saltRounds = 10;
        bcrypt.genSalt(saltRounds, function(err, salt){
            bcrypt.hash(password, salt, function(err, hash){
                if (err) return res.status(500).end(err);
                const newUser = new User(username, hash);
                users.update({_id: username}, {_id: username, data: newUser}, {upsert:true}, function(err){
                    if (err) return res.status(500).end(err);
                    return res.json("Account registered for user: " + username);
                });
            });
        });
    });  
});

app.post('/api/signin/', checkUsername,function (req, res, next){
    if(!('username' in req.body)) return res.status(400).end('No username was provided');
    if(!('password' in req.body)) return res.status(400).end('No password was provided');
    let username = req.body.username;
    let password = req.body.password;
    
    users.findOne({_id: username}, function(err, user) {
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("Username and/or password is incorrect");
        bcrypt.compare(password, user.data.hash, function(err, valid){
            if (err) return res.status(500).end(err);
            if(!valid) return res.status(401).end("Username and/or password is incorrect");

            // Session start
            req.session.username = user.data.username;
            return res.redirect("/");
        });
    });
});

app.get('/api/signout/', function(req, res, next){
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    return res.redirect("/");
});

app.get('/api/users/:id/', function(req, res, next){
    // TODO: Currently set up that the current user sees their own profile
    // Change it so that other users see a different version down later on
    let username = req.params.id;
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("Invalid user");
        // Check if the user found is the user in this session
        if(req.session.username === user._id){
            
            return res.json(user);
        }
    });
});

app.post("/api/posts/",  upload.single('image'), sanitizeContent, isAuthenticated, isImage, checkFileSize, function(req, res, next){
    if(!('username' in req.body)) return res.status(400).end('No username was provided');
    let username = req.body.username;
    // Find the user who requested to submit this post
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("Username is invalid");
        // Insert the new post and attach the author as the user who submitted it
        posts.insert(new Post(req.body, req.file, user._id), function(err, post){
            if(err) return res.status(500).end(err);
            // Add the post id of this post in the user's array of posts
            
            users.update({_id: username}, {$push: {"data.posts": post._id}}, {}, function(err, num){
                if(err) return res.status(500).end(err);
                return res.json(post);
            });
            
        });
    });
    
});

app.patch("/api/posts/:id/upvote/", isAuthenticated, function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        posts.update({_id: post._id}, {$inc: {upvotes: 1}},{}, function(err, num){
            return res.json(post);
        });
    });
});

app.patch("/api/posts/:id/downvote/", function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        posts.update({_id: post._id}, {$inc: {downvotes: 1}}, {}, function(err, num){
            return res.json(post);
        });
    });
});


app.patch("/api/posts/:id/comments/", function(req, res, next){
    if(!('username' in req.body)) return res.status(400).end('No username was provided');
    if(!('content' in req.body)) return res.status(400).end('No comment content was provided');
    const username = req.body.username;
    const content = req.body.content;
    
    // Check if the user exists in order to comment under this post
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("Username is invalid");

        // Check if the post exists in the database
        posts.findOne({_id: req.params.id}, function(err, post){
            if (err) return res.status(500).end(err);
            if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
            const newComment = new Comment(content, username);
            posts.update({_id: post._id}, {$push: {comments: newComment}}, {}, function(err, num){
                users.update({_id: user._id}, {$push: {"data.comments": newComment}}, {}, function(err, num){
                    if(err) return res.status(500).end(err);
                    return res.json(newComment);
                });
            });
        });
    });
    
});



app.delete("/api/posts/:id/", function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        posts.remove({_id: post._id}, {multi: false}, function(err, num){
            res.json(post);
        });
    });
});

app.delete("/api/posts/:id/comments/:commentId/", function(req, res, next){
    posts.findOne({_id: req.params.id}, function(err, post){
        if (err) return res.status(500).end(err);
        if(!post) return res.status(404).end("Post id#" + req.params.id + " does not exist");
        let updatedComments = post.comments;
        
        // Find the index of the comment with the requested comment id
        const commentIndex = updatedComments.findIndex((comment) => comment.id == req.params.commentId);

        updatedComments.splice(commentIndex, 1);
        posts.update({_id: post._id}, {$set: {comments: updatedComments}}, {}, function(err, num){
            // TODO: Return the lastest comment
            res.json(post);
        });
    });
});

app.use(express.static('static'));

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});