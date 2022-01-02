const express = require('express')
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

/* ============= DATA TYPES =================
    
        Post object in posts must have these attributes:
            - (String) postId
            - (String) title
            - (file) image
            - (Array) comments 
=============================================*/

let Post = (function(){
    let id = 0;
    return function post(post){
        this.id = id ++;
        this.title = post.title;
        this.image = "https://assets-global.website-files.com/6005fac27a49a9cd477afb63/6057684e5923ad2ae43c8150_bavassano_homepage_before.jpg";
        this.comments = [];
    }
}());

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let posts = [];

app.get("/api/posts/", function(req, res, next){
    res.json(posts);
});

app.post("/api/posts/", function(req, res, next){
    let post = new Post(req.body);
    posts.push(post);
    res.json(post);
});

app.get("/api/posts/:id/", function(req, res, next){
    res.json(posts[req.params.id]);
});

app.delete("/api/posts/:id/", function(req, res, next){
    let index = posts.findIndex(function(e){
        return (e.id === parseInt(req.params.id));
    });
    if(index === -1) res.json(null);
    else {
        let post = posts[index];
        posts.splice(index, 1);
        res.json(post);
    }
});

app.use(express.static('static'));

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});