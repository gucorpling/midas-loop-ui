import $, { post } from 'jquery'
import 'jquery-ui'
import 'jquery-ui-bundle'
import {spinner} from 'jquery-ui-bundle'
import '../css/main.css'
import '../js/common.js'
//import './page.css'
import {segmenter_read_conllu, select} from '../js/segmenter.js'
import {entities_read_conllu, change_entity} from '../js/spannotator.js'
import img from '../img/unicorn.jpg'
import { Tooltip, Toast, Popover, Tab } from 'bootstrap'

window.current_conllu = "";
window.doc2conllu = {};
window.selected_tab = "home";

/**
 * 
 * @param {string} docname - Name of the document to fetch from the backend
 * @param {*} reader_function - Reader function of the target widget, which is expected to take a conllu string
 * @returns 
 */
function get_conllu(docname, reader_function){
  let genre = "academic";

  // TODO: replace this with proper API call to backend
  // get genre, needed for github URL to fetch
  if (docname.split("_").length > 1){
    genre = docname.split("_")[1];
  }
  let prefix = "https://raw.githubusercontent.com/gucorpling/amalgum/dev/amalgum/"+genre+"/dep/";
  var myRequest = new Request(prefix + docname + '.conllu');
  fetch(myRequest).then(function(response) {
    return response.text().then(function(conllu_string) {
      reader_function(conllu_string);
    });
  });
}

window.segmenter_read_conllu = segmenter_read_conllu;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded', 'page-index')
  console.log('Image through require()', img)
})

const queryString = window.location.search;
//console.log(queryString);
const urlParams = new URLSearchParams(queryString);

var docs = [];
var doc_index = 0;
window.docs = [];




if (urlParams.has('docs')){
  docs = urlParams.getAll('docs')[0].split(";");  
  console.log(docs);
  for (let i in docs){
    window.docs.push(docs[i]);
  }
  $("#selected_docname").html(docs[0]);
  doc_index = 0;
  $("#doc_count").html("Document " + (doc_index+1) + "/" + docs.length);

}

//console.log(current_conllu);

function open_segment(){
  window.selected_tab = "segment";
  if (window.docs.length > 0){
    get_conllu(window.docs[doc_index],segmenter_read_conllu);
  }
}

function open_entities(){
  window.selected_tab = "entities";
  if (window.docs.length > 0){
    get_conllu(window.docs[doc_index],entities_read_conllu);
  }
}

function cycle_docs(offset){
  if (docs.length>1){
      if (offset<0){ // prev doc
        doc_index--;
        if (doc_index<0){ // no more documents
          alert("Reached first document of " + docs.length + " selected documents");
          doc_index++;
          return;
        }
      }else{ //next doc
        doc_index++;
        if (doc_index>=docs.length){ // no more documents
          alert("Reached last document of " + docs.length + " selected documents");
          doc_index--;
          return;
        }
      }
      $("#selected_docname").html(docs[doc_index]);
      $("#doc_count").html("Document " + (doc_index+1) + "/" + docs.length);
      if (window.selected_tab=="segment"){
        window.open_segment();
      }
    }
}

window.open_segment = open_segment;
window.open_entities = open_entities;
window.change_entity = change_entity;
window.select = select;
window.cycle_docs = cycle_docs;