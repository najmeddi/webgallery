(function() {
    "use strict";

    window.addEventListener("load", function(){
        api.onError(function(err){
            console.error("There has been an error:", err);
        });

        api.onError(function(err){
            var errorDisplay = document.querySelector("#error-display");
            errorDisplay.innerHTML = err;
            errorDisplay.style.visibility = "visible";
        });

        api.onPostUpdate(function(posts){
            document.querySelector("#posts").innerHTML = "";
            posts.forEach(function(post){
                let element = document.createElement('div');
                let comments = [];
                if(post.comments){
                    comments = post.comments;
                }
                element.className = "post";
                element.id = post.id;
                element.innerHTML = `
                    <div class="post-header">
                        <span>${post.title}</span>
                        <div class="post-options">
                        <button class="options-button">. . .</button>
                        <div class="options-content hide">
                          <a href="#" class="delete-option">Delete</a>
                        </div>
                    </div>
                    </div>
                    <div class="post-image">
                        <img src="" alt="${post.title}">
                    </div>
                    <button class="view-comments-btn">View Comments (${comments.length})</button>
                    <div class="post-comments-container hide">
                        <div class="comment-form-container">
                            <form class="comment-form">
                                <label>Enter your comment:</label>
                                <textarea class="comment-textarea" rows="5" columns="20" maxlength="250" placeholder="Type something here (max 250 characters)..." required></textarea>
                                <input type="submit" value="Comment">
                            </form>
                        </div>
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
                element.querySelector(".delete-option").addEventListener("click", function(e){
                    api.deletePost(post.id);
                });

                element.querySelector(".comment-form").addEventListener("submit", function(e){
                    e.preventDefault();
                    let comment = element.querySelector(".comment-textarea").value;
                    api.addComment(post.id, comment);

                    document.querySelector(".comment-form").reset();
                });

                element.querySelector(".view-comments-btn").addEventListener("click", function(){
                    if(element.querySelector(".post-comments-container").classList.contains("hide")){
                        element.querySelector(".post-comments-container").classList.remove("hide");
                    } 
                    else {
                        element.querySelector(".post-comments-container").classList.add("hide");
                    }
                });
                element.querySelector(".post-comments-container").prepend(getComments(comments));
                document.querySelector("#posts").prepend(element);
            });
        });

        document.querySelector("#upload-form").addEventListener("submit", function(e){
            e.preventDefault();
            let title = document.querySelector("#upload-title").value;
            let image = document.querySelector("#upload-file").files[0];
            
            api.addPost(title, image);
            
            document.querySelector("#upload-form").reset();
        });

        
    });

    /* 
        Helper function to produce HTML tags for the comments
    */
    function getComments(comments){
        let element = document.createElement('div');
        element.className = "post-comments";
        element.innerHTML = "";
        comments.forEach(comment => {
            let childElement = document.createElement('div');
            childElement.className = "post-comment";
            childElement.innerHTML = `
                <img src="https://st2.depositphotos.com/1009634/7235/v/950/depositphotos_72350117-stock-illustration-no-user-profile-picture-hand.jpg" alt="profile picture 1" width="64" height="64">
                <div class="comment-user">
                    <span class="comment-username">Alice</span>
                    <span>${comment}</span>
                </div>
            `;
            element.append(childElement);
        });
        return element;
    }
}());