function submitOnEnter(event) {
    if (event.which === 13) {
        console.log("submitOnEnter invoked");
        //event.target.form.dispatchEvent(new Event("submit", { cancelable: true }));
        document.forms["myform"].submit();
        event.preventDefault(); // Prevents the addition of a new line in the text field (not needed in a lot of cases)
    }
}

document.getElementById("my_user_input_id").addEventListener("keypress", submitOnEnter);

/*
setTimeout(function(){
    location=''
},6000)
*/