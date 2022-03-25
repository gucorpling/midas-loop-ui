import React from 'react';
import { Stack } from '@mui/material';
import data from "./data.json";
import getDeprelColor from './deprel_colors';
import {getXpos, getDeprel} from './vocabs';
import ContentEditable from 'react-contenteditable';

const containerPadding = 12;

export default class Base extends React.Component {
  render() {
    return (
      <div style={{padding: containerPadding}}>
        <Document data={data} />
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
.xpos {
    display: flex;
    font-size: 10px;
    color: gray;
    cursor: pointer;
}
.xpos-select {
    width: 40px;
    font-size: 10px;
    position: absolute;
    left: -12px;
}
.deprel {
    font-size: 9px;
    cursor: pointer;
}
.deprel-select {
    width: 50px;
    margin: 20px;
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
        <h1 key="header">{name}</h1>
        {sentences.map(s => <Sentence key={s.id} sentence={s} />)}
      </Stack>
    )
  }
}

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
function computeEdge (x, y, dx, dy, maxHeight, color) {
  var d;
  const destX = x + dx;
  const destY = y + dy;
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
    d = `M ${x} ${y} 
         a ${dx/2} ${maxHeight} 0 0 ${x < destX ? "1" : "0"} ${dx} 0`

  }
  return [
    <path d={d} stroke={color} fill="transparent" />,
    <polygon points={`${destX-3},${destY - 3} ${destX+3},${destY - 3} ${destX},${destY + 2}`} fill={color} />
  ];
}

// Component for sentence that renders tokens in a row and an SVG element with edges
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

  // Begin methods that need to talk to API
  setHead(sentence, id, headId) {
    if (id === headId) {
      return sentence;
    }
    const token = sentence.tokens.filter(t => t.id === id)[0];
    const headToken = sentence.tokens.filter(t => t.id === headId)[0];
    token.head.value = headId;
    if (headId === "root") {
      token.deprel.value = "root";
    }
    if (headId !== "root" && headToken.head.value === id) {
      headToken.head.value = "root";
      token.deprel.value = headToken.deprel.value;
      headToken.deprel.value = "root"
    }
    return sentence;
  }

  setDeprel(sentence, id, deprel) {
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.deprel.value = deprel;
    return sentence;
  }

  setXpos(sentence, id, xpos) {
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.xpos.value = xpos;
    return sentence;
  }

  setLemma(sentence, id, lemma) {
    const token = sentence.tokens.filter(t => t.id === id)[0];
    token.lemma.value = lemma;
    return sentence;
  }
  // End methods that need to talk to API

  setXposEditTokenId(id) {
    this.setState({xposEditTokenId: id});
  }

  handleXposChange(tokenId, newVal) {
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
      updatedSentence = this.setHead(this.state.sentence, id, "root")
    } else {
      updatedSentence = this.setHead(this.state.sentence, id, headId)
    }

    this.setState({
      cursorOrigin: null,
      cursorCoords: null,
      cursorOriginId: null,
      sentence: updatedSentence 
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

  render() {
    const { id, conlluMetadata, tokens } = this.state.sentence;
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
      const color = getDeprelColor(t.deprel.value);
      if (!this.state.mounted || !tokenXIndex[t.id]) {
        return null;
      } else if (t.head.value === "root") {
        const x = tokenXIndex[t.id];
        return [
          computeEdge(x, 0, 0, tokenY, null, color),
          <text className="deprel" x={x+2} y="50" fill={color}>{t.deprel.value}</text>
        ]
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        return computeEdge(headX, tokenY, dx, 0, maxHeight, color)
      }
    });

    const labels = tokens.map(t => {
      const color = getDeprelColor(t.deprel.value);
      const label = t.deprel.value;
      if (!this.state.mounted || !tokenXIndex[t.id]) {
        return null;
      } else if (t.head.value === "root") {
        return null; 
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        return (
          <text key={"deprel-label-" + t.id} className={this.state.deprelEditTokenId === t.id ? "hidden" : "deprel"}
            textAnchor="middle" x={x - dx / 2} y={svgMaxY - maxHeight - 12} fill={color}
            onClick={() => {this.setState({ deprelEditTokenId: t.id })}}>
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
        return null; 
      } else {
        const headX = tokenXIndex[t.head.value];
        const x = tokenXIndex[t.id]
        const dx = x - headX;
        const maxHeight = getMaxHeight(x, headX);
        return (
          <foreignObject x={x - dx / 2 - 40} y={svgMaxY - maxHeight - 40} 
                         textAnchor="middle" width="80" height="50" 
                         key={"object-" + t.id} className={this.state.deprelEditTokenId === t.id ? "" : "hidden"}>
            <div onMouseLeave={() => this.setState({ deprelEditTokenId: null })}>
              <select className="deprel deprel-select" value={t.deprel.value}
                  onChange={(e) => { this.setDeprel(this.state.sentence, t.id, e.target.value); }}>
                {getDeprel("en").map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </foreignObject>
        );
      }
    })

    if (this.state.cursorOrigin) {
      const dx = this.state.cursorCoords.x - this.state.cursorOrigin.x;
      const dy = this.state.cursorCoords.y - this.state.cursorOrigin.y;
      edges.push(computeEdge(
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
                                         setXposEditTokenId={this.setXposEditTokenId} />)}
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
    const {handleMouseDown, handleMouseUp, handleLemmaChange, handleXposChange, setXposEditTokenId, xposEditTokenId, token} = this.props;
    const { id, tokenType, form, lemma, upos, xpos, feats, head, deprel, deps, misc} = token;
    return (
      <div ref={this.props.innerRef}>
        <Col style={{ alignItems: "center" }}>
          <div id={id} className="form" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
            {form.value}
          </div>
          <ContentEditable className="lemma" html={lemma.value} onChange={(e) => handleLemmaChange(id, e.target.value)} />
          {xposEditTokenId === id
          ? <div style={{position: "relative"}}>
              <select className="xpos xpos-select" value={xpos.value}
                    onMouseLeave={() => setXposEditTokenId(null)} 
                    onChange={(e) => {handleXposChange(id, e.target.value);}}>
                {getXpos("en").map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          : <div className="xpos" onMouseOver={() => setXposEditTokenId(id)}>{xpos.value}</div>}
        </Col>
      </div>
    )
  }
}
const TokenWithRef = React.forwardRef((props, ref) => <Token innerRef={ref} {...props} />)
