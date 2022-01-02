let api = (function(){
    "use strict";

    let module = {};

    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("(" + xhr.status + ")" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    };


    // add a post
    module.addPost = function(title, image){
        send("POST", "/api/posts/", {title: title, image: image}, function(err, res){
            if(err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
    };
    
    // delete an item given its postId
    module.deletePost = function(postId){
        send("DELETE", "/api/posts/" + postId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
    };

    // Add a comment under a specifed post
    module.addComment = function(postId, comment){
        send("POST", "/api/posts/" + postId + "/",  {comment: comment}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
        // // Pull posts object from local storage
        // let posts = JSON.parse(localStorage.getItem("posts"));
        // let index = posts.items.findIndex(function(post){
        //     return post.id == postId;
        // });
        // if (index == -1) return null;

        // // Check if there are no comments, if so create a new array
        // // otherwise append the new comment
        // if(!posts.items[index].comments){
        //     posts.items[index].comments = [];
        // }
        // posts.items[index].comments.push(comment);
        // localStorage.setItem("posts", JSON.stringify(posts));
        // notifyPostListeners();
    };

    // Get all items. Note how this function is private
    let getPosts = function(callback){
        send("GET", "/api/posts/", null, callback);
    }

    // Initializes a list of listeners for when posts are updated
    let postListeners = [];

    // Notify all post listeners. Note how this function is private
    function notifyPostListeners() {
        getPosts(function(err, res){
            if(err) return notifyErrorListeners(err);
            postListeners.forEach(function(listener){
                listener(res);
            });
        });
    };

    // Register a post listener
    module.onPostUpdate = function(listener){
        postListeners.push(listener);
        getPosts(function(err, res){
            if (err) return notifyErrorListeners(err);
            listener(res);
        });
    };

    let errorListeners = [];

    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    };

    module.onError = function(listener){
        errorListeners.push(listener);
    };

    // Refresh after a certain amount of time
    (function refresh(){
        setTimeout(function(e){
            notifyPostListeners();
            refresh();
        }, 2000);
    }());
    return module;
}());