import $ from 'jquery'
import '../css/segmenter.css'

// keep global represenation of the tokens
// i : {token: <token>, split_probas: <float>, split_before_token: <bool>, user_edited: <bool> }
var all_tokens = {};


// toggle spacers
export function select(spacer_id){
	// toggle "x" <-> "+"
	if ($("#" + spacer_id).text() == "✗") {
		$("#" + spacer_id).text("⍟");
	} else {
		$("#" + spacer_id).text("✗");
	}

	// alter global token representation
	all_tokens[spacer_id]["split_before_token"] = !all_tokens[spacer_id]["split_before_token"]
	all_tokens[spacer_id]["user_edited"] = !all_tokens[spacer_id]["user_edited"]

	// toggle to/from "edited" color (blue)
	$("#" + spacer_id).toggleClass("blue")
	//console.log(all_tokens)
	return;
}

// write conllu from gobal representation of the tokens
// should be triggered by an "export annotation" button at bottom of html page and send content button
function writeConllu(){
	let c = new conllu.Conllu();
	let tokens = [];
	let id = 0;
	let sentences = [];
	for (const [key, value] of Object.entries(all_tokens)) {
  		if (value["split_before_token"]) {
  			let s = new conllu.Sentence();
  			s.tokens = tokens;
  			sentences.push(s);
  			tokens = [];
  			id = 0;
  		}
  		let t = new conllu.Token();
  		id += 1;
  		t["id"] = id;
  		t["form"] = value["token"];
  		t["serial"] = id + "\t" + value["token"] + "\t_\t_\t_\t_\t_\t_\t_\t_";
  		tokens.push(t);
	}
	let last_s = new conllu.Sentence();
	last_s.tokens = tokens;
	sentences.push(last_s);
	c.sentences = sentences;
	//console.log(c)
	console.log(c.serial);
	return c.serial;
}

function exportConllu() {
	let conllu = writeConllu();
	// dialog box with output
    $("#outputDialog" ).dialog({
    	//autoOpen: false,
        //fluid: true,
        //modal: true,
    	closeOnEscape: true,
    	show: { effect: "clip", duration: 200 },
    	title: "CoNLL-U Data:",
    });
    $("#outputDialog").empty();
	//$("#outputDialog").append("<p style=\"white-space: pre-line;\">" + conllu + "</p>");
	$("#outputDialog").append("<p><textarea>" + conllu + "</textarea></p>");
  	$("#outputDialog").dialog("open");
  	return;
}

export function segmenter_read_conllu(segmenter_conllu) {
	$("#canvas").empty();
	all_tokens = {};
	parse_input(segmenter_conllu);
	return;

}

function parse_input(conllu) {
	var sample_str = conllu.split("\n");
	//console.log(sample_str);
	var split_just_seen = false;
	var newblock = true;
	var block_num = 0;
	for (var i = 0; i < sample_str.length; i++){
		let line = sample_str[i].split(new RegExp("[  |\t]"));
		if (line.length > 2) {
			if (line[0] != "#") {
				let token = line[1];
				let probas = 1.0;//line[11];
				let probas_num = 1.0; //probas.split("=")[1];
				var testclass = "clear";
				var space;

				// setting spacer shape and color
				if (split_just_seen) {
					space = "✗";
					if (probas_num < SSPLIT_SUSPICIOUS_PROBABILITY_THRESHOLD) {
						testclass = "red";
					} else{
						testclass = "gray";
					}
				} else {
					space = "⍟";
					if (probas_num > 0.1) {
						testclass = "green";
					}
				}

				if (newblock) { // creates p element for the newblock
					$("#canvas").append("<p id = block_" + block_num + " class = \"wrap\"></p>");
				}
				$("#block_" + block_num).append("<div id = pair" + i + " class = \"wrap\" ></div>"); 
				if (newblock == false) { // skips adding a visible spacer for new blocks
					//$("#block_" + block_num).append("<div id = " + i + " class = \"" + testclass + "\" onclick=\"select(" + i + ")\">" + space + "</div>");
					$("#pair" + i).append("<div id = " + i + " class = \"" + testclass + "\" onclick=\"select(" + i + ")\">" + space + "</div>");
				} else {
					$("#pair" + i).append("<div id = " + i + " class = \"lightgrey\">o</div>");
				}
				newblock = false;
				//$("#block_" + block_num).append("<div>" + token + " </div>");
				$("#pair" + i).append("<div>" + token + " </div>");
				all_tokens[i] = {token: token, split_probas: probas, split_before_token: split_just_seen, user_edited: false };
				split_just_seen = false;
			} else {
				if (line[1] == "newblock" || line[1]=="newpar") {
					newblock = true;
					block_num += 1;
				}
			}
		} else {
			split_just_seen = true;
		}
	}
	return;
}

function loadDoc() {
	var xhttp = new XMLHttpRequest();
	  xhttp.onreadystatechange = function() {
	    if (this.readyState == 4 && this.status == 200) {
	    	//console.log(this.responseText);
	    	console.log(this.status);
	    	$("#canvas").empty();
        	all_tokens = {};
	    	parse_input(this.responseText);
	    }
	  };
	  xhttp.open("GET", "http://localhost:8080/", true);
	  xhttp.send();
	  return;
}

function sendDoc() {
	let conllu = writeConllu();
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	    if (this.readyState == 4 && this.status == 200) {
	    	console.log(this.status);
	     	//console.log(this.responseText);
	    }
	  };
	xhttp.open("POST", "http://localhost:8080", true);
	xhttp.send(conllu);
	return;
}