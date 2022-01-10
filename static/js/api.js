let api = (function(){
    "use strict";

    let module = {};

    function sendFiles(method, url, data, callback){
        let formData = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formData.append(key, value);
        });
        let xhr = new XMLHttpRequest();
        xhr.onload = function(){
            if(xhr.status != 200) callback("(" + xhr.status + ")" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formData);
    }

    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    function sendNoJSON(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else window.location.href = '/';
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    module.getCurrentUser = function(){
        let username = document.cookie.split("username=")[1];
        if(username.length == 0) return null;
        return username;
    };

    // Register a new user with a given username and password
    module.registerUser = function(username, password, confirmPassword){
        // TODO: Later change this to sendFiles for profile pictures
        sendNoJSON("PUT", "/api/signup/", {username: username, password: password, confirmPassword: confirmPassword}, function(err, res){
            if(err) return notifyErrorListeners(err);
        });
    };

    // Sign a user in
    module.signin = function(username, password){
        sendNoJSON("POST", "/api/signin/", {username: username, password: password}, function(err, res){
            if(err) return notifyErrorListeners(err);
        });
    };

    module.signout = function(){
        sendNoJSON("GET", "/api/signout/", null, function(err, res){
            if(err) return notifyErrorListeners(err);
        });
    };

    module.getUserProfile = function(username){
        send("GET", "/api/users/" + username + "/", null, function(err, res){
            if(err) return notifyErrorListeners(err);
            console.log("get user response: " + res);
        });
    };

    // add a post
    module.addPost = function(title, image, username){
        sendFiles("POST", "/api/posts/", {title: title, image: image, username: username}, function(err, res){
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

    // Upvote  a post
    module.upvotePost = function(postId){
        send("PATCH", "/api/posts/" + postId + "/upvote/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
    };

    // Downvote  a post
    module.downvotePost = function(postId){
        send("PATCH", "/api/posts/" + postId + "/downvote/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
    };

    // Add a comment under a specifed post
    module.addComment = function(postId, comment, username){
        send("PATCH", "/api/posts/" + postId + "/comments/",  {content: comment, username: username}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
    };

    // Delete a comment under a post
    module.deleteComment = function(postId, commentId){
        send("DELETE", "/api/posts/" + postId + "/comments/" + commentId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyPostListeners();
        });
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

    // Get all commentss. Note how this function is private
    let getComments = function(postId, callback){
        send("GET", "/api/posts/" + postId + "/comments/", null, callback);
    }

    // Initializes a list of listeners for when posts are updated
    let commentListeners = {};

    // Notify all post listeners. Note how this function is private
    function notifyCommentListeners(postId) {
        getComments(postId, function(err, res){
            if(err) return notifyErrorListeners(err);
            console.log(commentListeners, postId, commentListeners.postId);
            commentListeners.postId.forEach(function(listener){
                listener(res);
            });
        });
    };

    // Register a post listener
    module.onCommentUpdate = function(postId, listener){
        // commentListeners.push(listener);
        if(!(postId in commentListeners)) commentListeners.postId = [];
        commentListeners.postId.push(listener);

        getComments(postId, function(err, res){
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
    // (function refresh(){
    //     setTimeout(function(e){
    //         notifyPostListeners();
    //         refresh();
    //     }, 2000);
    // }());

    return module;
}());