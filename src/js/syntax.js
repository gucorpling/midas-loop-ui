import $ from 'jquery'
// react demo
import React from 'react'
import ReactDOM from 'react-dom'
import App from '../ud-tree/App';

export function syntax_read_conllu(segmenter_conllu) {
	//$("#syntax_canvas").empty(); 
	//$("#syntax_canvas").append("This will eventually launch the syntax widget<br>");
	//$("#syntax_canvas").append(segmenter_conllu);
	const mount = document.getElementById("syntax_main");
	mount.attachShadow({mode: "open"});
	const root = mount.shadowRoot;
	ReactDOM.render(<App />, root);
	return;

}