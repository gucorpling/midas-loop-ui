import $ from 'jquery'
// react demo
import React from 'react'
import ReactDOM from 'react-dom'
import SyntaxEditor from '../ud-tree/App';
//import data from "../ud-tree/ud-tree/data.json";

export function syntax_read_json(syntax_doc) {
	//console.log(syntax_doc)
	const mount = document.getElementById("syntax_main");
	mount.attachShadow({mode: "open"});
	const root = mount.shadowRoot;
	ReactDOM.render(<SyntaxEditor data={syntax_doc}/>, root);
	return;

}