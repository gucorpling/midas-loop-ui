import $ from 'jquery'
// react demo
import React from 'react'
import ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import SyntaxEditor from '../ud-tree/App';
import data from "../ud-tree/ud-tree/data.json";
import { api } from "../js/common"
import { StylesProvider, jssPreset, ThemeProvider, createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const baseRoot = document.getElementById("syntax_main")
const shadowRoot = baseRoot.attachShadow({ mode: 'open' });
const emotionRoot = document.createElement('style');
shadowRoot.appendChild(emotionRoot);
const reactRoot = createRoot(shadowRoot)

export function syntax_read_json(syntax_doc) {
	//console.log(syntax_doc)
	const cache = createCache({
		key: 'css',
		prepend: true,
		container: emotionRoot,
	});
	const theme = createTheme();

	function render() {
		reactRoot.render(
			<CacheProvider value={cache}>
				<ThemeProvider theme={theme}>
					<SyntaxEditor data={syntax_doc} />
				</ThemeProvider>
			</CacheProvider>
		);
	}

	render()
}