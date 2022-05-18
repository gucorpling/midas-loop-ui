//import $ from 'jquery'
//import 'jquery-ui'
//import 'jquery-ui/themes/base/theme.css';
//require('../../node_modules/jqgrid/js/i18n/grid.locale-en.js')($)
//require('../../node_modules/jqgrid/js/jquery.jqGrid.src.js')($)
//require("modules/jquery-ui/themes/black-tie/jquery-ui.css");
//require("modules/jquery-ui/themes/black-tie/jquery-ui.theme.css");
//require("../../node_modules/jquery-ui/");
//require("../../node_modules/jquery-ui-bundle/jquery-ui.theme.min.css");
import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Tooltip, Toast, Popover } from 'bootstrap'
import DataTable from 'react-data-table-component';

import '../css/main.css'
import { api } from '../js/common.js'

function DocumentList(props) {
    const [docs, setDocs] = useState([])
    const [total, setTotal] = useState(0)
    const [pageNumber, setPageNumber] = useState(0)
    const [queryParams, setQueryParams] = useState({offset: 0, limit: 1_000_000, orderBy: "name-inc"})

    useEffect(() => {
        async function inner() {
            const result = await api.queryDocuments(queryParams.offset, queryParams.limit, queryParams.orderBy);
            setDocs(result.docs)
            setTotal(result.total)
        }
        inner()
    }, [queryParams, pageNumber])

    const _makeNumericColumn = (name, selector) => {
        const format = name.indexOf("MTP") > -1 
        ? (v) => !selector(v) ? "–" : <span>{`${(selector(v) * 100).toFixed(2)}%`}</span> 
        : selector
        return {
            name, 
            selector, 
            sortable: true, 
            reorder: true, 
            right: true, 
            compact: true,
            format
        }
    }

    const columns = [
        {
            name: "Name",
            selector: r => r.name,
            sortable: true,
            allowOverflow: true,
            format: r => <a href={"/document.html?docs=" + r.id}>{r.name}</a>
        },
    ]
    columns.push(_makeNumericColumn("Sentences", r => r.sentence_count))
    columns.push(_makeNumericColumn("Tokens", r => r.token_count))
    if (!docs.map(x => x.upos_mean_top_proba).every(x => x === null || x === undefined)) {
        columns.push(_makeNumericColumn("UPOS MTP", r => r.upos_mean_top_proba))
    }
    if (!docs.map(x => x.xpos_mean_top_proba).every(x => x === null || x === undefined)) {
        columns.push(_makeNumericColumn("XPOS MTP", r => r.xpos_mean_top_proba))
    }
    if (!docs.map(x => x.head_mean_top_proba).every(x => x === null || x === undefined)) {
        columns.push(_makeNumericColumn("HEAD MTP", r => r.head_mean_top_proba))
    }
    if (!docs.map(x => x.sentence_mean_top_proba).every(x => x === null || x === undefined)) {
        columns.push(_makeNumericColumn("Sentence MTP", r => r.sentence_mean_top_proba))
    }

    return (
        <div className="container container-md">
            <h1>Documents</h1>
            <DataTable 
                columns={columns} 
                data={docs} 
                responsive
                dense
                pagination
                paginationPerPage={10}
                />
        </div>
    )
}

const root = ReactDOM.createRoot(document.getElementById("mount"))
root.render(<DocumentList />)
