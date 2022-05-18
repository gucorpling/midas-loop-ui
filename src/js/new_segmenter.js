import React, { useState, useEffect } from 'react';
import {
  Button, Stack, TextField, Box, Typography, Container, List, ListItem, ListItemButton, ListItemText,
  Skeleton, LinearProgress, Pagination
} from '@mui/material';
import { CallSplit, Merge } from '@mui/icons-material';

import { api } from '../js/common'
import '../css/new_segmenter.css'

export function Document(props) {
	const [doc, setDoc] = useState(null);
	const [busy, setBusy] = useState(false);
	const [insideToken, setInsideToken] = useState(false);
	const leaveToken = () => setInsideToken(false);
	const enterToken = () => setInsideToken(true);
  
	useEffect(() => {
	  (async () => {
		const data = await api.getDocument(props.id);
		await setDoc(data);
	  })()
	}, [props.id, busy])
  
	function Sentences(props) {
	  return <>
		<div>{props.sentences.map(Sentence)}</div>
	  </>
	}
  
	function Sentence(props) {
	  async function merge(e) {
		e.preventDefault()
		if (!busy && !insideToken) {
		  setBusy(true);
		  const result = await api.mergeSentenceLeft(props.id);
		  setBusy(false);
		}
	  }
	  return (
		  <div key={props.id} className={insideToken ? "sentence" : "sentence sentence--hoverable"} onClick={merge}>
			<span className="sentence-icon"><Merge fontSize="small" /></span>
			{props.tokens.map((v, i) => Token({...v, index: i}))}
		  </div>
	  )
	}
  
	function Token(props) {
	  async function split(e) {
		e.preventDefault();
		// Only proceed if another action isn't in progress
		if (!busy) {
		  setBusy(true);
		  const result = await api.splitSentence(props.id);
		  setBusy(false);
		}
	  }
	  return <span className="token-area"
				   title="Split sentence"
				   onClick={split}
				   key={props.id}
				   onMouseEnter={enterToken}
				   onMouseLeave={leaveToken}>
		{(props.index > 0) ? <> <span className="token-button"> <CallSplit fontSize="small" /></span></> : ""}
		<span className="token">{props.form.value}</span>
	  </span>
	}
  
	async function download(e) {
	  e.preventDefault();
	  const result = await api.downloadConlluFile(props.id);
	  const blob = await result.blob();
	  const url = await URL.createObjectURL(blob);
	  Object.assign(document.createElement('a'), {
		href: url,
		download: doc.name + '.conllu',
	  }).click();
	}

	return (
      <Container maxWidth="md" style={{cursor: busy ? "progress" : "initial"}}>
        {busy ? <LinearProgress /> : <LinearProgress style={{visibility: "hidden"}} />}
        <Stack spacing={2} my={5}>
          {doc === null ? <LoadPlaceholder />
              : <>
                {Sentences(doc)}
                <Button onClick={download} fullWidth>Download</Button>
              </>}
        </Stack>
      </Container>
  )
}

function LoadPlaceholder() {
    return <>
      <LinearProgress />
      <Skeleton variant="rectangular" height={24} />
      <Skeleton variant="rectangular" height={24} />
      <Skeleton variant="rectangular" height={24} />
      <Skeleton variant="rectangular" height={24} />
      <Skeleton variant="rectangular" height={24} />
    </>;
}