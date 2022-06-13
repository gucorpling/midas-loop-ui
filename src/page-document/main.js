import $, { post } from 'jquery'
import 'jquery-ui'
import 'jquery-ui-bundle'
import { spinner } from 'jquery-ui-bundle'
import img from '../img/unicorn.jpg'
import { Tooltip, Toast, Popover, Tab } from 'bootstrap'
import React, { useEffect, useState } from 'react'
import * as ReactDOM from 'react-dom/client';

import '../css/main.css'
import { api } from '../js/common.js'
import {segmenter_read_conllu, select} from '../js/segmenter.js'
import { Document } from '../js/new_segmenter.js'
import {spannotator_read_conllu, change_entity, toggle_sents, set_color_mode, group_selected, ungroup_selected, add_entity} from '../js/spannotator.js'
import {syntax_read_json} from '../js/syntax.js'

window.current_conllu = "";
window.doc2conllu = {};
window.selected_tab = "home";

/**
 * 
 * @param {string} docId - Name of the document to fetch from the backend
 * @param {*} readerFunction - Reader function of the target widget, which is expected to take a conllu string
 * @returns 
 */
async function get_conllu(docId, readerFunction){
  const doc = await api.getDocument(docId, "conllu")
  readerFunction(doc, docId);
}

async function get_json(docId, readerFunction){
  const doc = await api.getDocument(docId, "json")
  readerFunction(doc, docId);
}

window.segmenter_read_conllu = segmenter_read_conllu;
window.spannotator_read_conllu = spannotator_read_conllu;
window.syntax_read_json = syntax_read_json;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

var docs = [];
var docIndex = 0;
window.docs = [];

const homeContentRoot = ReactDOM.createRoot(document.getElementById("tab-home-content"))
const segmentationContentRoot = ReactDOM.createRoot(document.getElementById("canvas"))

async function initPage() {
  if (urlParams.has('docs')) {
    docs = urlParams.getAll('docs')[0].split(";");
    for (let i in docs) {
      window.docs.push(docs[i]);
    }
    docIndex = 0;
    open_metadata((docJson) => { 
      $("#document-name").html(docJson.name)
      $("#selected_docname").html(docJson.name);
    })
  } else {
    window.location = "/"
  }
}
initPage()

function Metadata(props) {
  const [doc, setDoc] = useState(undefined)
  const [state, setState] = useState("default")
  useEffect(() => {
    try {
      api.getDocument(props.id, "json").then(d => setDoc(d))
    } catch (e) {
      setDoc(null)
    }
  }, [props.id])
  useEffect(() => {
    if (doc === null) {
      setTimeout(() => window.location = "/", 3000)
    }
  }, [doc])

  function makeCopy(format) {
    return async function (e) {
      e.preventDefault;
      setState("busy")
      let res = await api.getDocument(props.id, format);
      props.loadedCallback(res)
      if (format === "json") {
        res = JSON.stringify(res)
      }
      try {
        const promise = navigator.clipboard.writeText(res);
        await promise
        setState("copied_" + format)
        setTimeout(() => setState("default"), 1000)
      } catch (e) {
        console.error("Error encountered while copying:", e)
        setState("default")
      }
    }
  }

  function download(e) {
    (async () => {
      e.preventDefault
      setState("download_conllu")
      await api.downloadConlluFileWithPrompt(props.id)
      setState("default")
    })()
  }

  return (
    doc === null ? (
      <div className="d-flex justify-content-center mt-4">Document does not exist. Going back...</div>
    ) : doc !== undefined ? (
      <div className="container-sm pt-4">
        <p><strong>Name:</strong> {doc.name}</p>
        <p><strong>Internal ID:</strong> {doc.id}</p>
        <p><strong>Sentences:</strong> {doc.sentences.length}</p>
        <p><strong>Tokens:</strong> {doc.sentences.map(s => s.tokens.length).reduce((a,b) => a + b)}</p>
        <div>
          <button disabled={state !== "default"} className="btn btn-outline-primary me-1" onClick={download}>{state === "download_conllu" ? "Downloading..." : "Download CoNLL-U"}</button>
          <button disabled={state !== "default"} className="btn btn-outline-primary me-1" onClick={makeCopy("conllu")}>{state === "copied_conllu" ? "Copied!" : "Copy CoNLL-U"}</button>
          <button disabled={state !== "default"} className="btn btn-outline-secondary me-1" onClick={makeCopy("json")}>{state === "copied_json" ? "Copied!" : "Copy JSON"}</button>
        </div>
      </div>
    ) : (
      <div className="d-flex justify-content-center mt-4">
        <div className="spinner-border" role="status"> 
          <span className="sr-only">Loading...</span> 
        </div> 
      </div>
    )
  )
}

function open_metadata(callback) {
  window.selected_tab = "home";
  if (window.docs.length > 0) {
    homeContentRoot.render(<Metadata id={window.docs[0]} loadedCallback={callback} />)
  }
}
document.getElementById("pills-home-tab").addEventListener("click", () => open_metadata())

function open_segment(){
  window.selected_tab = "segment";
  if (window.docs.length > 0){
    //get_conllu(window.docs[docIndex], segmenter_read_conllu);
    segmentationContentRoot.render(<Document id={window.docs[0]} />)
  }
}
document.getElementById("pills-segmentation-tab").addEventListener("click", () => open_segment())

function open_syntax() {
  window.selected_tab = "syntax";
  if (window.docs.length > 0) {
    get_json(window.docs[docIndex], syntax_read_json)
  }
}
document.getElementById("pills-syntax-tab").addEventListener("click", () => open_syntax())

function open_entities(){
  window.selected_tab = "entities";
  if (window.docs.length > 0){
    get_conllu(window.docs[docIndex],spannotator_read_conllu);
  }
}
document.getElementById("pills-entities-tab").addEventListener("click", () => open_entities())
/*
async function cycle_docs(offset){
  if (docs.length>1){
      if (offset<0){ // prev doc
        docIndex--;
        if (docIndex<0){ // no more documents
          alert("Reached first document of " + docs.length + " selected documents");
          docIndex++;
          return;
        }
      }else{ //next doc
        docIndex++;
        if (docIndex>=docs.length){ // no more documents
          alert("Reached last document of " + docs.length + " selected documents");
          docIndex--;
          return;
        }
      }

      const docJson = await api.getDocument(docs[docIndex], "json");
      $("#selected_docname").html(docJson.name, docs[docIndex]);
      $("#doc_count").html("Document " + (docIndex+1) + "/" + docs.length);
      if (window.selected_tab=="segment"){
        open_segment();
      }
    }
}
window.cycle_docs = cycle_docs;
*/


window.change_entity = change_entity;
// spannotator toolbar function
window.toggle_sents = toggle_sents; 
window.set_color_mode = set_color_mode; 
window.group_selected = group_selected; 
window.ungroup_selected = ungroup_selected; 
window.add_entity = add_entity;
window.select = select;
