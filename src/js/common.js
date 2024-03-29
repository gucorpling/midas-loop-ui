import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'
import Api from '../js/api';

function setHrefEnd(end) {
    const pieces = end.split("/")
    const butLast = pieces.slice(0, pieces.length - 1)
    butLast.push(end)
    const newHref = butLast.join("/")
    window.location.href = newHref
}

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
    const token = getToken();
    const onLogin = window.location.href.endsWith("/login.html");
    try {
        const response = await api.checkToken(token);
        console.log("Token is " + (response.ok ? "valid" : "invalid"));
        if (!response.ok && !onLogin) {
            setHrefEnd("login.html");
        } else {
            api.token = token;
        }
    } catch (e) {
        console.log("Failed to contact API");
        console.log(e);
        if (!onLogin) {
            setHrefEnd("login.html");
        }
    }
}
checkAuth();
