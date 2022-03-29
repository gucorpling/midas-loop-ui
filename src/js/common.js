import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'
import Api from '../js/api';

function getCookie(key) {
    const pieces = document.cookie.split(";");
    for (let piece of pieces) {
        const [k, v] = piece.split("=");
        if (k.trim() === key.trim()) {
            return v;
        }
    }
}

export var api;

// Ensure user has good credentials, otherwise redirect to login page
async function checkAuth () {
    const location = window.location.href;
    api = new Api();
    let token = getCookie("token").replace("__SEMI__", ";").replace("__EQ__", "=");
    const response = await api.checkToken(token);
    if (!response.ok) {
        //window.location.href = "/login.html";
    } else {
        api = new Api("http://localhost:3000/api", token);   
    }
}
checkAuth();
