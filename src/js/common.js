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
    return "";
}

function getToken() {
    return getCookie("token").replace("__SEMI__", ";").replace("__EQ__", "=");
}

export const api = new Api(getToken());

// Ensure user has good credentials, otherwise redirect to login page
async function checkAuth () {
    const location = window.location.href;
    let token = getToken();
    let response;
    try {
        response = await api.checkToken(token);
    } catch (e) {
        console.log("Failed to contact API");
        console.log(e);
        if (!window.location.href.endsWith("/login.html")) {
            window.location.href = "/login.html";
        }
        return;
    }
    console.log("Token is " + (response.ok ? "valid" : "invalid"));
    if (!response.ok) {
        window.location.href = "/login.html";
    } else {
        api.token = token;
    }
}
checkAuth();
