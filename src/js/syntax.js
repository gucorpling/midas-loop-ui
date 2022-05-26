import $ from 'jquery'
// react demo
import React from 'react'
import ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import SyntaxEditor from '../ud-tree/App';
import data from "../ud-tree/ud-tree/data.json";

function getRoot() {
	const baseRoot = document.getElementById("syntax_main")
	baseRoot.attachShadow({mode: "open"})
	return createRoot(baseRoot.shadowRoot)
}
const root = getRoot()

export function syntax_read_json(syntax_doc) {
	//console.log(syntax_doc)
	root.render(<SyntaxEditor data={syntax_doc}/>);
}