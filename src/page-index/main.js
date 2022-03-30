import $, { post } from 'jquery'
import 'jquery-ui'
import 'jquery-ui-bundle'
import {spinner} from 'jquery-ui-bundle'
import img from '../img/unicorn.jpg'
import { Tooltip, Toast, Popover, Tab } from 'bootstrap'

import '../css/main.css'
import { api } from '../js/common.js'
import {segmenter_read_conllu, select} from '../js/segmenter.js'
import {entities_read_conllu, change_entity, toggle_sents, set_color_mode, group_selected, ungroup_selected, add_entity} from '../js/spannotator.js'

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
  readerFunction(doc);
}

window.segmenter_read_conllu = segmenter_read_conllu;

const queryString = window.location.search;
//console.log(queryString);
const urlParams = new URLSearchParams(queryString);

var docs = [];
var docIndex = 0;
window.docs = [];

async function initPage() {
  if (urlParams.has('docs')) {
    docs = urlParams.getAll('docs')[0].split(";");
    console.log(docs);
    for (let i in docs) {
      window.docs.push(docs[i]);
    }
    const docJson = await api.getDocument(docs[0], "json");
    $("#selected_docname").html(docJson.name);
    docIndex = 0;
    $("#doc_count").html("Document " + (docIndex + 1) + "/" + docs.length);
  }
}

initPage()

function open_segment(){
  window.selected_tab = "segment";
  if (window.docs.length > 0){
    get_conllu(window.docs[docIndex],segmenter_read_conllu);
  }
}

function open_entities(){
  window.selected_tab = "entities";
  if (window.docs.length > 0){
    get_conllu(window.docs[docIndex],entities_read_conllu);
  }
}

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
        window.open_segment();
      }
    }
}

document.getElementById("pills-segmentation-tab").addEventListener("click", () => open_segment())
document.getElementById("pills-entities-tab").addEventListener("click", () => open_entities())

window.change_entity = change_entity;
// spannotator toolbar function
window.toggle_sents = toggle_sents; window.set_color_mode = set_color_mode; window.group_selected = group_selected; window.ungroup_selected = ungroup_selected; window.add_entity = add_entity;
window.select = select;
window.cycle_docs = cycle_docs;