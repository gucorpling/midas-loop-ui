import $ from 'jquery'
import 'jquery-ui'
import 'jquery-ui/themes/base/theme.css';
require('../../node_modules/jqgrid/js/i18n/grid.locale-en.js')($)
require('../../node_modules/jqgrid/js/jquery.jqGrid.src.js')($)
//require("modules/jquery-ui/themes/black-tie/jquery-ui.css");
//require("modules/jquery-ui/themes/black-tie/jquery-ui.theme.css");
require("../../node_modules/jquery-ui/");
require("../../node_modules/jquery-ui-bundle/jquery-ui.theme.min.css");
import { Tooltip, Toast, Popover } from 'bootstrap'

import '../css/main.css'
import { api } from '../js/common.js'

async function initGrid() {
    var data = await api.queryDocuments(0, 9999999, "xpos-gold-dec");
    console.log("Received data:", data.docs)

    $("#grid").jqGrid({
        datastr: data.docs,
        datatype: 'jsonstring',
        width: '100%',
        colNames: ["id", "name", "token_count", "sentence_count", "xpos_gold_rate"],
        colModel: [
            { name: 'id', width: 0, }, 
            { name: 'name', width: 250, }, 
            { name: 'token_count', width: 50, }, 
            { name: 'sentence_count', width: 50, }, 
            { name: 'xpos_gold_rate', width: 100 }
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
        autowidth: true,
        pgbuttons: true,
        multiselect: true,
        multiboxonly: false,
        ondblClickRow: function (rowId) {
            var rowData = $(this).getRowData(rowId);
            var docname = rowData['name'];
            var aQryStr = "docs=" + docname;
            console.log("./index.html?" + aQryStr);
            document.location.href = "./index.html?" + aQryStr;
        },
    }).hideCol("id");
}

initGrid();


export function open_selected() {
    var sel_rows_ids;
    sel_rows_ids = $("#grid").jqGrid('getGridParam', 'selarrrow');
    var sel_rows = [];
    for (var rid of sel_rows_ids) {
        var row_data = $('#grid').getRowData(rid);
        sel_rows.push(row_data);
    }
    let sel_docs = [];
    for (var row of sel_rows) {
        sel_docs.push(row["id"]);
    }
    var aQryStr = "docs=" + sel_docs.join(";");
    console.log("./index.html?" + aQryStr);
    document.location.href = "./index.html?" + aQryStr;
}

window.open_selected = open_selected;
