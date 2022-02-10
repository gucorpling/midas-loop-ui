import '../css/main.css'
//import './page.css'
import $ from 'jquery'
import 'jquery-ui'
import 'jquery-ui/themes/base/theme.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import '../js/common.js'
import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'
require('../../node_modules/jqgrid/js/i18n/grid.locale-en.js')($)
require('../../node_modules/jqgrid/js/jquery.jqGrid.src.js')($)
//require("modules/jquery-ui/themes/black-tie/jquery-ui.css");
//require("modules/jquery-ui/themes/black-tie/jquery-ui.theme.css");
require("../../node_modules/jquery-ui/");
require("../../node_modules/jquery-ui-bundle/jquery-ui.theme.min.css");
import { Tooltip, Toast, Popover } from 'bootstrap'

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded', 'page-index')
  //console.log('Image through require()', img)
})

var data = [{"name":"AMALGUM_academic_acrylamide","token_count":"3","sentence_count":"2","xpos_proportion_gold":0.45},
{"name":"AMALGUM_academic_adolescents","token_count":"3","sentence_count":"2","xpos_proportion_gold":0.65},
{"name":"AMALGUM_bio_aachen","token_count":"4","sentence_count":"2","xpos_proportion_gold":0.5},
{"name":"AMALGUM_bio_aaron","token_count":"5","sentence_count":"2","xpos_proportion_gold":0.5},
{"name":"AMALGUM_bio_abdi","token_count":"6","sentence_count":"2","xpos_proportion_gold":0.5},
{"name":"AMALGUM_bio_abdullah","token_count":"7","sentence_count":"2","xpos_proportion_gold":0.5},];



$("#grid").jqGrid({
  datastr: data,
  datatype: 'jsonstring',
  width: '100%',
  colNames: ["name","token_count","sentence_count","xpos_proportion_gold"],
  colModel: [
      {
          name: 'name', width: 250,
      }, {
          name: 'token_count', width: 50,
      }, {
          name: 'sentence_count', width: 50,
      }, {
          name: 'xpos_proportion_gold', width: 100
      }
  ],

  pager: '#pager',
  jsonReader: { repeatitems: false },
  rowNum: 5,
  viewrecords: true,
  caption: "Documents",
  height: "auto",
  ignoreCase: true, 
  gridview: true, 
  autoencode: true,
  rownumbers: true,
  shrinkToFit: true,
  emptyrecords: "no documents found",
  autowidth :true,
  pgbuttons: true,
  multiselect: true,
  multiboxonly: false,
  ondblClickRow: function(rowId) {
    var rowData = $(this).getRowData(rowId); 
    var docname = rowData['name'];
    var aQryStr = "docs=" + docname;
    console.log("./index.html?" + aQryStr);
    document.location.href = "./index.html?" + aQryStr;
},

});

export function open_selected(){
    var sel_rows_ids;
    sel_rows_ids = $("#grid").jqGrid('getGridParam','selarrrow');
    var sel_rows = [];
    for (var rid of sel_rows_ids){
        var row_data = $('#grid').getRowData(rid);
        sel_rows.push(row_data);
    }
    let sel_docs = [];
    for (var row of sel_rows){
        sel_docs.push(row["name"]);
    }
    var aQryStr = "docs=" + sel_docs.join(";");
    console.log("./index.html?" + aQryStr);
    document.location.href = "./index.html?" + aQryStr;
}

window.open_selected = open_selected;
