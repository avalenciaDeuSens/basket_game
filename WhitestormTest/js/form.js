function GetFieldsAndValidate(){
    console.log("Proximamente");
}

function GetEmailAndValidate(){
    document.getElementById("LoginGroup").hidden = true;
    document.getElementById("TimeDiv").hidden = false;
    document.getElementById("ScoreDiv").hidden = false;
    APP.init();
}

// https://developer.mozilla.org/es/docs/Web/API/Window/requestAnimationFrame
// http://www.javascriptkit.com/javatutors/requestanimationframe.shtml
// https://maqentaer.com/devopera-static-backup/http/dev.opera.com/articles/view/better-performance-with-requestanimationframe/index.html