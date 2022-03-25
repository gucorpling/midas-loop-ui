import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'
import Api from '../js/api';


"gold;secret=xxcCIyLMHc0IMd7_svZdjANQG5xV3bFum0lI23stHkw"

function getCookie(key) {
    const pieces = document.cookie.split(";");
    for (let piece of pieces) {
        const [k, v] = piece.split("=");
        if (k.trim() === key.trim()) {
            return v;
        }
    }
}

// Ensure user has good credentials, otherwise redirect to login page
async function checkAuth () {
    const location = window.location.href;
    const api = new Api();
    let token = getCookie("token").replace("__SEMI__", ";").replace("__EQ__", "=");
    const response = await api.checkToken(token);
    if (!response.ok) {
        //window.location.href = "/login.html";
    }
}
checkAuth();