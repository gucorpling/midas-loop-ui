import React from 'react';
import { Stack, IconButton } from '@mui/material';
import getDeprelColor from './deprel_colors';
import {getXpos, getDeprel} from './vocabs';
import ContentEditable from 'react-contenteditable';
import { api } from '../../js/common.js'
import Refresh from '@mui/icons-material/Refresh';

const containerPadding = 12;

export default class Base extends React.Component {
  render() {
    return (
      <div style={{padding: containerPadding}}>
        <Document data={this.props.data} refresh={this.props.refresh} />
        <style>
          {`
.form {
    display: flex;
    cursor: pointer;
    user-select: none;
}
.lemma {
    display: flex;
    font-size: 10px;
}
.token-col {
    align-items: center;
}
.xpos {
    display: flex;
    font-size: 10px;
    color: gray;
    cursor: pointer;
}
.xpos-select {
    width: 44px;
    font-size: 10px;
    position: absolute;
    left: 0px;
    display: inline-block;
}
.highlighted-xpos {
    display: flex;
    font-size: 10px;
    color: red;
    cursor: pointer;
    font-weight: bold;
}
.approved-xpos {
    display: flex;
    font-size: 10px;
    color: green;
    cursor: pointer;
    //font-weight: bold;
}
.deprel {
    font-size: 9px;
    cursor: pointer;
}
.deprel-select {
    width: 50px;
    margin: 20px;
}
.highlighted-deprel {
    font-size: 9px;
    cursor: pointer;
    font-weight: bold;
}
.row {
    display: flex;
    gap: 6px;
}
.col {
    display: flex;
    gap: 6px;
    flex-direction: column;
}

.sentence {
    width: max-content;
    margin-top: 60px;
}

.tree-svg {
    width: 100%;
    height: 200px;
    margin-bottom: -20px;
}

.root-bar {
    cursor: pointer;
    fill: transparent;
}
.root-bar:hover {
    fill: #eeeeee;
}

/* Style The Dropdown Button */
.dropbtn {
  background-color: transparent;
  padding: 5px 8px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 12px;
  border-radius: 12px;
  margin: 5px
}

.dropbtn:hover {
  background-color: #eeeeee;
}

/* The container <div> - needed to position the dropdown content */
.dropdown {
  position: relative;
  display: inline-block;
}

/* Dropdown Content (Hidden by Default) */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 120px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;
  font-size: 12px;
  border-radius: 12px;
}

/* Links inside the dropdown */
.dropdown-content a {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
}

/* Change color of dropdown links on hover */
.dropdown-content a:hover {background-color: #f1f1f1}

/* Show the dropdown menu on hover */
.dropdown:hover .dropdown-content {
  display: block;
}

/* Change the background color of the dropdown button when the dropdown content is shown */
.dropdown:hover .button {
  background-color: #eeeeee;
}

/* approvals */
.check-mark { 
    font-size: 12px; 
    cursor: pointer;
}
.xpos-approve-button {
    position: absolute;
    left: 42px;
    top: -6px;
    padding: 6px;
}
.head-approve-button { margin: -18px; }

.hidden {
    display: none;
}
          `}
        </style>
      </div>
    )
  }
}

class Row extends React.PureComponent {
  render() {
    return (
      <div className="row" {...this.props}>
        {this.props.children}
      </div>
    )
  }
}

class Col extends React.PureComponent {
  render () {
    return (
      <div className="col" {...this.props}>
        {this.props.children}
      </div>
    )
  }
}

// Top-level component for the document
class Document extends React.Component {
  render() {
    const { id, sentences, name } = this.props.data;
    return (
      <Stack spacing={3}>
        <h1 key="header">
          {name}
          <IconButton color="primary" size="large" component="span" onClick={this.props.refresh}>
            <Refresh />
          </IconButton>
        </h1>
        {sentences.map(s => <Sentence key={s.id} sentence={s} />)}
      </Stack>
    )
  }
}

//////////////////////////////////////////////////////////////////////////////////
// Canvas drawing
//////////////////////////////////////////////////////////////////////////////////
// Use a modified logistic function to compute how high an arc should go
function getMaxHeight(src, dest) {
  const diff = Math.abs(dest - src);
  const expTerm = -0.005 * diff;
  const denom = 1 + Math.exp(expTerm);
  const raw = 1 / denom;
  return (svgMaxY - 20) * ((raw - 0.5) * 2);
}
function windowToSvgX(x) {
  return x - containerPadding;
}
function getTokenX(elt) {
  const {width, left} = elt.getBoundingClientRect();
  return windowToSvgX(left + width/2);
}
const svgMaxY = 200;
const tokenY = svgMaxY - 10;
const rootHeight = 10;
function computeEdge (key, x, y, dx, dy, maxHeight, color, highlighted=false) {
  var d;
  const destX = x + dx;
  const destY = y + dy;
  // highlighted should be passed in as a parameter
  const lineWidth = highlighted ? "2" : "1";
  const offset = destX > x ? 5 : -5
  // We're drawing the root
  if (maxHeight === null) {
    d = `M ${x} ${y} l ${dx} ${dy}`
  } 
  // We're drawing a new edge from the root
  else if (y === rootHeight) {
    d = `M ${x} ${y} 
         c 0 0, ${dx} -${maxHeight/4}, ${dx} ${dy}`
  } 
  else if (dy !== 0) {
    d = `M ${x} ${y} 
         c 0 -${maxHeight}, ${dx} -${maxHeight}, ${dx} ${dy}`
  }
  // We're drawing a normal static edge
  else {
    d = `M ${x + offset} ${y} 
         a ${(dx + -offset)/2} ${maxHeight} 0 0 ${x < destX ? "1" : "0"} ${dx + -offset} 0`

  }
  const pathKey = `${key}-edge-path`
  const polyKey = `${key}-edge-polygon`
  return [
    <path key={pathKey} d={d} stroke={color} fill="transparent" strokeWidth={lineWidth}/>,
    <polygon key={polyKey} points={`${destX-3},${destY - 3} ${destX+3},${destY - 3} ${destX},${destY + 2}`} fill={color} />
  ];
}

//////////////////////////////////////////////////////////////////////////////////
// Data/API helpers
//////////////////////////////////////////////////////////////////////////////////
// active learning functions for determiniting which annotations should be highlighted
function isHeadSuspicious(head) {
  return head.quality !== "gold" && head.probas && head.probas[head.value] < SUSPICIOUS_PROBABILITY_THRESHOLD;
}

function isXposSuspicious(xpos) {
  return xpos.quality !== "gold" && xpos.probas && xpos.probas[xpos.value] < SUSPICIOUS_PROBABILITY_THRESHOLD;
}

async function updateHead(id, head){
    await api.updateHead(id, head)
}

async function updateDeprel(id, deprel){
    await api.updateDeprel(id, deprel)
}

async function updateXpos(id, xpos){
    await api.updateXpos(id, xpos)
}

async function updateLemma(id, lemma){
    await api.updateLemma(id, lemma)
}


//////////////////////////////////////////////////////////////////////////////////
// Component for sentence that renders tokens in a row and an SVG element with edges
//////////////////////////////////////////////////////////////////////////////////
class Sentence extends React.Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.refMap = {};
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleRootMouseDown = this.handleRootMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleOutsideMouseUp = this.handleOutsideMouseUp.bind(this);
    this.handleLemmaChange = this.handleLemmaChange.bind(this);
    this.handleXposChange = this.handleXposChange.bind(this);
    this.setXposEditTokenId = this.setXposEditTokenId.bind(this);
    this.approveSingleXpos = this.approveSingleXpos.bind(this);
    this.refreshSentence = this.refreshSentence.bind(this);
    this.state = {
      sentence: props.sentence,
      mounted: false,
      cursorOrigin: null,
      cursorCoords: null,
      cursorOriginId: null,
      deprelEditTokenId: null,
      xposEditTokenId: null
    };
  }

  refreshSentence(delay = 2000) {
    const refresh = async () => {
      const newData = await api.getSentence(this.state.sentence.id)
      this.setState({sentence: newData});
    }
    if (delay > 0) {
      setTimeout(refresh, delay)
    } else {
      refresh()
    }
  }

  // Begin methods that need to talk to API
  async setHead(sentence, id, headId) {
    if (id === headId || !id) {
      return sentence;
    }
    const token = sentence.tokens.filter(t => t.id === id)[0];
    const headToken = sentence.tokens.filter(t => t.id === headId)[0];
    token.head.value = headId;
    updateHead(token.head.id, headId)
    if (headId === "root") {
      token.deprel.value = "root";
      await updateDeprel(token.deprel.id, "root")
    }
    if (headId !== "root" && headToken.head.value === id) {
      headToken.head.value = "root";
      updateHead(headToken.head.id, "root")
      token.deprel.value = headToken.deprel.value;
      updateDeprel(token.deprel.id, headToken.deprel.value)
      headToken.deprel.value = "root"
      await updateDeprel(headToken.deprel.id, "root")
    }
    if (!token.deprel.value) {
      token.deprel.value = "<none>"
      await updateDeprel(token.deprel.id, "<none>")
    }
    token.head.quality = "gold"
    this.refreshSentence()
    return sentence;
  }

  async setDeprel(sentence, id, deprel) {
    this.setState({deprelEditTokenId: null})
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.deprel.value = deprel;
    token.head.quality = "gold"
    await updateDeprel(token.deprel.id, deprel)
    this.refreshSentence()
    return sentence;
  }

  async setXpos(sentence, id, xpos) {
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.xpos.value = xpos;
    token.xpos.quality = "gold"
    await updateXpos(token.xpos.id, xpos)
    this.refreshSentence()
    return sentence;
  }

  async setLemma(sentence, id, lemma) {
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.lemma.value = lemma;
    await updateLemma(token.lemma.id, lemma)
    this.refreshSentence()
    return sentence;
  }

  async approveSingleXpos(sentence, token) {
    await this.setXpos(sentence, token.id, token.xpos.value)
    token.xpos.quality = "gold"
    this.setState({sentence: sentence});
    this.refreshSentence()
  }

  async approveSingleHead(sentence, token) {
    this.setHead(sentence, token.id, token.head.value);
    await this.setDeprel(sentence, token.id, token.deprel.value);
    token.head.quality = "gold";
    this.setState({sentence: sentence});
    this.refreshSentence()
  }

  async approveSentenceHeadHighlights(sentence) {
    sentence.tokens.forEach(async (token) => {
      if (isHeadSuspicious(token.head)) {
        this.setHead(sentence, token.id, token.head.value)
        await this.setDeprel(sentence, token.id, token.deprel.value)
        token.head.quality = "gold"
      }
    })
    this.setState({sentence: sentence})
    this.refreshSentence()
  }

  async approveSentencePOSHighlights(sentence) {
    sentence.tokens.forEach(async (token) => {
      if (isXposSuspicious(token.xpos)) {
        await this.setXpos(sentence, token.id, token.xpos.value)
        token.xpos.quality = "gold"
      }
    })
    this.setState({sentence: sentence})
    this.refreshSentence()
  }

  async approveSentenceHeadAll(sentence) {
    sentence.tokens.forEach(async (token) => {
      this.setHead(sentence, token.id, token.head.value)
      await this.setDeprel(sentence, token.id, token.deprel.value)
      token.head.quality = "gold"
    })
    this.setState({sentence: sentence})
    this.refreshSentence()
  }

  async approveSentencePOSAll(sentence) {
    sentence.tokens.forEach(async (token) => {
      await this.setXpos(sentence, token.id, token.xpos.value)
      token.xpos.quality = "gold"
    })
    this.setState({sentence: sentence})
    this.refreshSentence()
  }

  // End methods that need to talk to API
  setXposEditTokenId(id) {
    this.setState({xposEditTokenId: id}, () => this.forceUpdate());
  }

  approveHeadHighlights() {
    this.approveSentenceHeadHighlights(this.state.sentence)
  }

  approvePOSHighlights() {
    this.approveSentencePOSHighlights(this.state.sentence)
  }

  approveHeadAll() {
    this.approveSentenceHeadAll(this.state.sentence)
  }

  approvePOSAll() {
    this.approveSentencePOSAll(this.state.sentence)
  }

  handleXposChange(tokenId, newVal) {
    this.setState({xposEditTokenId: null})
    this.setXpos(this.state.sentence, tokenId, newVal)
  }

  handleLemmaChange(tokenId, newVal) {
    this.setLemma(this.state.sentence, tokenId, newVal)
  }

  handleMouseUp(e) {
    e.stopPropagation();
    const headId = this.state.cursorOriginId;
    const id = e.target.id

    var updatedSentence;
    if (e.target.className === "root-bar") {
      this.setHead(this.state.sentence, id, "root")
    } else {
      this.setHead(this.state.sentence, id, headId)
    }

    this.setState({
      cursorOrigin: null,
      cursorCoords: null,
      cursorOriginId: null,
    });
  }

  handleMouseDown(e) {
    e.preventDefault();
    const elt = e.target;
    const x = getTokenX(elt)
    this.setState({
      cursorOrigin: {x: x, y: tokenY},
      cursorCoords: {x: x, y: tokenY},
      cursorOriginId: elt.id
    })
  }

  handleRootMouseDown (e) {
    e.preventDefault();
    this.setState({
      cursorOrigin: {x: windowToSvgX(e.clientX), y: rootHeight},
      cursorCoords: {x: windowToSvgX(e.clientX), y: rootHeight},
      cursorOriginId: "root"
    })
  }

  handleMouseMove(e) {
    if (this.state.cursorOrigin) {
      const { left, top } = this.svgRef.current.getBoundingClientRect();
      this.setState({
        cursorCoords: {
          x: e.clientX - left,
          y: e.clientY - top
        }
      });
    }
  }

  handleOutsideMouseUp(e) {
    this.setState({
      cursorOrigin: null,
      cursorCoords: null,
      cursorOriginId: null
    });
  }

  componentDidMount() {
    this.setState({mounted: true});
    document.addEventListener("mouseup", this.handleOutsideMouseUp)
  }

  componentWillUnmount () {
    document.removeEventListener("mouseup", this.handleOutsideMouseUp)
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    this.setState({sentence: newProps.sentence})
  }

  render() {
    const tokens = this.state.sentence.tokens.filter(t => t["token-type"] !== "super");

    // Read the x coordinates of each token using the refs
    const tokenXIndex = {};
    for (let t of tokens) {
      const elt = this.refMap[t.id];
      if (!this.state.mounted) {
        continue;
      }
      const svgX = getTokenX(elt)
      tokenXIndex[t.id] = svgX;
    }

    // get edges for drawing
    const edges = tokens.map(t => {
      const highlighted = isHeadSuspicious(t.head);
      const isGold = t.head.quality === "gold"
      const color = isGold ? "green" : highlighted ? "red" : "black" /*getDeprelColor(t.deprel.value)*/;
      if (!this.state.mounted || !tokenXIndex[t.id]) {
        return null;
      } else if (t.head.value === "root") {
        const x = tokenXIndex[t.id];
        return [
          computeEdge(t.id, x, 0, 0, tokenY, null, color, highlighted),
          //<text className={highlighted ? "highlighted-deprel" : "deprel"} x={x+2} y="50" fill={color}>{t.deprel.value}</text>
        ]
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        if (!x || !headX) {
          return null;
        }
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        return computeEdge(t.id, headX, tokenY, dx, 0, maxHeight, color, highlighted)
      }
    }); 

    const labels = tokens.map(t => {
      const highlighted = isHeadSuspicious(t.head);
      const isGold = t.head.quality === "gold"
      const color = isGold ? "green" : highlighted ? "red" : "black";//getDeprelColor(t.deprel.value);
      const label = t.deprel.value;
      if (!this.state.mounted || !tokenXIndex[t.id]) {
        return null;
      } else if (t.head.value === "root") {
        return null; 
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        if (!headX || !x) {
          return null
        }
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        var whichClass = this.state.deprelEditTokenId === t.id ? "hidden" : "deprel";
        if (whichClass == "deprel" && highlighted) {
          whichClass = "highlighted-deprel";
        }
        return (
          <text key={"deprel-label-" + t.id} className={whichClass}
            textAnchor="middle" x={x - dx / 2} y={svgMaxY - maxHeight - 12} fill={color}
            onMouseOver={() => {this.setState({ deprelEditTokenId: t.id })}}>
            {label}
          </text>
        )
      }
    });

    const selects = tokens.map(t => {
      const color = getDeprelColor(t.deprel.value);
      const label = t.deprel.value;
      if (!this.state.mounted || !tokenXIndex[t.id]) {
        return null;
      } else if (t.head.value === "root") {
        // TODO: should add approval for root here
        return null; 
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        if (!headX || !x) {
          return null;
        }
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        return (
          <foreignObject x={x - dx / 2 - 40} y={svgMaxY - maxHeight - 43} 
                         textAnchor="middle" width="100" height="50" 
                         key={"object-" + t.id} className={this.state.deprelEditTokenId === t.id ? "" : "hidden"}>
            <div onMouseLeave={() => this.setState({ deprelEditTokenId: null })}>
              <select className="deprel deprel-select" value={t.deprel.value}
                  onChange={(e) => { 
                    this.setHead(this.state.sentence, t.id, t.head.value);
                    this.setDeprel(this.state.sentence, t.id, e.target.value); }}>
                {getDeprel("en").map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <a className="check-mark head-approve-button" onClick={(e) => this.approveSingleHead(this.state.sentence, t)}>&#10004;</a>
            </div>
          </foreignObject>
        );
      }
    })

    if (this.state.cursorOrigin) {
      const dx = this.state.cursorCoords.x - this.state.cursorOrigin.x;
      const dy = this.state.cursorCoords.y - this.state.cursorOrigin.y;
      edges.push(computeEdge(
        "cursor",
        this.state.cursorOrigin.x,
        this.state.cursorOrigin.y,
        dx,
        dy,
        getMaxHeight(this.state.cursorCoords.x, this.state.cursorOrigin.x), 
        "#000000"
      ))
    }

    // event handlers for handling mouse events
    return ( 
      <div className="sentence" onMouseMove={this.handleMouseMove}>
        <div className="dropdown">
          <button className="dropbtn">Approve Deprel</button>
          <div className="dropdown-content">
            <a onClick={() => this.approveHeadHighlights()}>Highlighted</a>
            <a onClick={() => this.approveHeadAll()}>All</a>
          </div>
        </div>
        <div className="dropdown">
          <button className="dropbtn">Approve POS</button>
          <div className="dropdown-content">
            <a onClick={() => this.approvePOSHighlights()}>Highlighted</a>
            <a onClick={() => this.approvePOSAll()}>All</a>
          </div>
        </div>
        <svg key="svg" className="tree-svg" ref={this.svgRef}>
          <rect key="root-bar" width="50000" height="20" x="0" y="0" className="root-bar"  
                onMouseDown={this.handleRootMouseDown} onMouseUp={this.handleMouseUp} />
          {edges}
          {labels}
          {selects}
        </svg>
        <Row key="row">
          {tokens.map(t => <TokenWithRef key={t.id} 
                                         token={t} 
                                         ref={(r) => this.refMap[t.id] = r}
                                         handleMouseDown={this.handleMouseDown}
                                         handleMouseUp={this.handleMouseUp}
                                         handleXposChange={this.handleXposChange}
                                         handleLemmaChange={this.handleLemmaChange}
                                         xposEditTokenId={this.state.xposEditTokenId} 
                                         setXposEditTokenId={this.setXposEditTokenId} 
                                         approveSingleXpos={token => this.approveSingleXpos(this.state.sentence, token)}/>)}
        </Row>
      </div>
    )
  }
}

class Token extends React.Component {
  constructor(props) {
    super(props)
    this.state = {editXpos: false}
  }

  render() {
    const {handleMouseDown, handleMouseUp, handleLemmaChange, handleXposChange, setXposEditTokenId, xposEditTokenId, token, approveSingleXpos} = this.props;
    const { id, tokenType, form, lemma, upos, xpos, feats, head, deprel, deps, misc} = token;
    const xpos_highlighted = isXposSuspicious(xpos);
    const isGold = token.xpos.quality === "gold"
    const xpos_color = isGold ? "approved-xpos" : xpos_highlighted ? "highlighted-xpos" : "xpos";
    return (
      <div ref={this.props.innerRef}>
        <Col className="col token-col">
          <div id={id} className="form" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
            {form.value}
          </div>
          <ContentEditable className="lemma" html={lemma.value} onChange={(e) => handleLemmaChange(id, e.target.value)} />
          {xposEditTokenId === id
          ? <div style={{position: "relative", width: "60px"}} onMouseLeave={() => setXposEditTokenId(null)}>
              <select className="xpos xpos-select" value={xpos.value} onChange={(e) => {handleXposChange(id, e.target.value);}}>
                {getXpos("en").map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <a className="check-mark xpos-approve-button" onClick={(e) => approveSingleXpos(token)}>&#10004;</a>
            </div>
          : <div className={xpos_color} onMouseOver={() => setXposEditTokenId(id)}>{xpos.value}</div>}
        </Col>
      </div>
    )
  }
}
const TokenWithRef = React.forwardRef((props, ref) => <Token innerRef={ref} {...props} />)
