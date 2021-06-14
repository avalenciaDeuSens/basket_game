function getToken() {
    var data = JSON.stringify({
        "email": "i@deusens.com",
        "password": "123456"
    });

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
        }
    });

    xhr.open("POST", "https://casademont.deusens.com:8055/auth/login");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(data);

    xhr.onload = function () {
        token = JSON.parse(xhr.response);
    };

    xhr.onerror = function () { // only triggers if the request couldn't be made at all
        console.log("Error getting token");
    };
}

function sendScore() {
    var data = JSON.stringify({
        "resultado": score
    });

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
        }
    });

    xhr.open("PATCH", "https://casademont.deusens.com:8055/items/ranking/" + idUser);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + token.data.access_token);

    xhr.send(data);

    xhr.onload = function () {
        console.log("Score send");
    };

    xhr.onerror = function () { // only triggers if the request couldn't be made at all
        console.log("Error sending score");
    };
}
