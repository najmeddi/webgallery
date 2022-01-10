(function(){
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

        document.querySelector(".credentials-form").addEventListener("submit", function(e){
            e.preventDefault();
            let username = document.querySelector("#username-field").value;
            let password = document.querySelector("#password-field").value;
            // API call to check username and password and create session
            api.signin(username, password);
        });
    });
}());