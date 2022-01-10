(function(){
    "use strict";

    api.onError(function(err){
        console.error("There has been an error:", err);
    });

    api.onError(function(err){
        var errorDisplay = document.querySelector("#error-display");
        errorDisplay.innerHTML = err;
        errorDisplay.style.visibility = "visible";
    });

    window.addEventListener('load', function(){
        var username = api.getCurrentUser();
        if (username){
            // Creates the userinfo in the header
            let element = document.createElement('div');
            element.className = "user-info-container";
            element.innerHTML = `
            <button id="user-options-btn">
                <div class="avatar-container">
                    <img src="https://st2.depositphotos.com/1009634/7235/v/950/depositphotos_72350117-stock-illustration-no-user-profile-picture-hand.jpg" alt="profile picture 1" />
                </div>
                <span>${username}</span>
            </button>
            <div class="user-options hide">
                <a  href="/profile/" id="profile-option">Profile</a>
                <a  href="/" id="signout-option">Sign out</a>
            </div>
            `;
            element.querySelector("#user-options-btn").addEventListener("click", function(e){
                if(element.querySelector(".user-options").classList.contains("hide")){
                    element.querySelector(".user-options").classList.remove("hide");
                } 
                else {
                    element.querySelector(".user-options").classList.add("hide");
                }
            });
            

            element.querySelector('#signout-option').addEventListener("click", function(){
                api.signout();
            });

            document.querySelector('#visitor-options').prepend(element);
            let overviewButtons = document.querySelectorAll('.overview-container button');
            overviewButtons.forEach((btn) => {
                btn.addEventListener('click', () =>{
                    btn.querySelector("span").classList.add("selected");
                    overviewButtons.forEach((otherButtons) => {
                        let spanElement = otherButtons.querySelector("span");
                        if(otherButtons != btn) spanElement.classList.remove("selected");
                    });
                });
            });
            
            document.querySelector("#posts-btn").addEventListener('click', () => {
                document.querySelector("#user-posts").classList.remove("hidden");
                document.querySelector("#user-comments").classList.add("hidden");
                getPosts("#user-posts", (post) => post.author === username);
            });

            document.querySelector("#comments-btn").addEventListener('click', () => {
                document.querySelector("#user-posts").classList.add("hidden");
                document.querySelector("#user-comments").classList.remove("hidden");
                getPosts("#user-comments", (post) => {
                    let filteredPost = post.comments.some(everyComment => {
                        return everyComment.author === username;
                    });
                    return filteredPost;
                });
            });

            
            let getPosts = function(elementId, filterCallback){
                api.onPostUpdate(function(posts){
                    document.querySelector(elementId).innerHTML = "";
                    posts.filter(filterCallback).forEach(function(post){
                        let element = document.createElement('div');
                        let comments = [];
                        if(post.comments){
                            comments = post.comments;
                        }
                        element.className = "post";
                        element.id = post._id;
                        element.innerHTML = `
                            <div class="post-header">
                                <div class="post-author-title">
                                    <div class="post-user-container">
                                        <img src="https://st2.depositphotos.com/1009634/7235/v/950/depositphotos_72350117-stock-illustration-no-user-profile-picture-hand.jpg" alt="profile picture 1">
                                        <span class="post-author">${post.author}</span>
                                    </div>
                                        <span>${post.title}</span>
                                </div>
                                <div class="post-options">
                                    <button class="options-button">. . .</button>
                                    <div class="options-content hide">
                                        <a>Share</a>
                                    </div>
                                </div>
                            </div>
                            <div class="post-image">
                                <img src="/api/posts/${post._id}/image/" alt="${post.title}" />
                            </div>
                            <div class="post-info">
                                <div class="upvotes-container">
                                    <button type="button" class="upvote-button">↑</button>
                                    <span class="upvote-count">${post.upvotes}</span>
                                </div>
                                <div class="downvotes-container">
                                    <button type="button" class="downvote-button">↓</button>
                                    <span class="downvotes-count">${post.downvotes}</span>
                                </div>
                                <button class="view-comments-btn">View Comments (${comments.length})</button>
                            </div>
                            <div class="post-comments-container hide">
                            </div>
                        `;
        
                        element.querySelector(".options-button").addEventListener("click", function(e){
                            if(element.querySelector(".options-content").classList.contains("hide")){
                                element.querySelector(".options-content").classList.remove("hide");
                            } 
                            else {
                                element.querySelector(".options-content").classList.add("hide");
                            }
                        });
        
                        // If the current user is the one that posted this, then give the option to delete their own post
                        if(post.author === username){
                            let deleteOptionElement = document.createElement('a');
                            deleteOptionElement.className = "delete-option";
                            deleteOptionElement.innerHTML = "Delete";
                            deleteOptionElement.addEventListener("click", function(e){
                                checkAuthorized(() =>{
                                    api.deletePost(post._id);
                                });
                            });
                            element.querySelector(".options-content").append(deleteOptionElement);
                        }
        
                        element.querySelector(".upvote-button").addEventListener("click", function(e){
                            checkAuthorized(()=> {
                                api.upvotePost(post._id);
                                e.preventDefault();
                            });
                        });
        
                        element.querySelector(".downvote-button").addEventListener("click", function(e){
                            api.downvotePost(post._id);
                            e.preventDefault();
                        });
        
                        element.querySelector(".view-comments-btn").addEventListener("click", function(){
                            if(element.querySelector(".post-comments-container").classList.contains("hide")){
                                element.querySelector(".post-comments-container").classList.remove("hide");
                            } 
                            else {
                                element.querySelector(".post-comments-container").classList.add("hide");
                            }
                        });
                        element.querySelector(".post-comments-container").prepend(getComments(post._id, comments));
                        
                        // Check if a user is logged and append a comment form
                        if(username){
                            let commentFormElement = document.createElement('div');
                            commentFormElement.className = "comment-form-container";
                            commentFormElement.innerHTML = `
                                <form class="comment-form">
                                    <label>Enter your comment:</label>
                                    <textarea class="comment-textarea" rows="5" columns="20" maxlength="250" placeholder="Type something here (max 250 characters)..." required></textarea>
                                    <input type="submit" value="Comment">
                                </form>
                            `;
        
                            element.querySelector(".post-comments-container").append(commentFormElement);
                        
                            element.querySelector(".comment-form").addEventListener("submit", function(e){
                                e.preventDefault();
                                let comment = element.querySelector(".comment-textarea").value;
                                element.querySelector(".comment-form").reset();
                                api.addComment(post._id, comment, username);
                                // Add a on comment update for a specified post
                                api.onCommentUpdate(post._id, function(postComments){
                                    element.querySelector(".post-comments-container").classList.remove("hide");
                                    element.querySelector(".post-comments").remove();
                                    element.querySelector(".post-comments-container").prepend(getComments(post._id, postComments));
                                });
                            });
                        }
                        document.querySelector(elementId).prepend(element);
                    });
                });
            };

            getPosts("#user-posts", (post) => post.author === username);

        }else{
            document.querySelector('#signin').classList.remove('hidden');
            document.querySelector('#signup').classList.remove('hidden');
        }

        // function that redirects any unauthorized action to sigin in page
        let checkAuthorized = (callback) =>{
            if(!username) window.location.href='/signup.html';
            else callback();
        };
    });

    function getComments(postId, comments){
        let element = document.createElement('div');
        element.className = "post-comments";
        element.innerHTML = (comments.length > 0)? "" :"<span>No comments posted yet</span>";
        comments.forEach(comment => {
            let childElement = document.createElement('div');
            childElement.className = "post-comment";
            childElement.innerHTML = `
            <div class="comment-container">
                <img src="https://st2.depositphotos.com/1009634/7235/v/950/depositphotos_72350117-stock-illustration-no-user-profile-picture-hand.jpg" alt="profile picture 1" width="64" height="64">
                <div class="comment-user">
                    <span class="comment-username">${comment.author}</span>
                    <span class="comment">${comment.content}</span>
                </div>
            </div>
            <button class="delete-comment-btn" type="button">X</button>
            `;
            childElement.querySelector(".delete-comment-btn").addEventListener("click", function(){
                api.deleteComment(postId, comment.id);
            });
            
            element.append(childElement);
        });
        return element;
    }
}());