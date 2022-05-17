import '../css/main.css';
import { api } from '../js/common.js';

const input = document.getElementById("token");
const msg = document.getElementById("bad-token");
input.addEventListener("input", async function(e) {
  const token = e.target.value;
  const resp = await api.checkToken(token);
  const validToken = resp.ok;
  input.className = "form-control"
  if (!validToken) {
    msg.innerText = "Invalid token";
    input.className = "form-control is-invalid"
  } else {
    document.cookie = "token=" + token.replace(";", "__SEMI__").replace("=", "__EQ__");
    window.location.href = "/index.html"
  }
});


// react demo
import React from 'react'
import ReactDOM from 'react-dom'
import App from '../ud-tree/App';

const mount = document.getElementById("react-root");
mount.attachShadow({mode: "open"});
const root = mount.shadowRoot;
//ReactDOM.render(<App />, root);
