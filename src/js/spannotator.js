import $ from 'jquery'
import '../css/spannotator.css'

let range = (start, stop, step=1) => Array(stop - start).fill(start).map((x, y) => x + y * step) 
function arrayRemove(arr, value) { return arr.filter(function(ele){ return ele != value; });}

// constants configuration
var ICON_MAP = {
	'person':['male','blue'], 
	//'quantity':['sort-numeric-asc','yellow'], 
	'time':['clock','pink'], 
	'abstract':['cloud','cyan'], 
	'object':['cube','green'], 
	'animal':['paw','orange'], 
	'plant':['leaf','magenta'], 
	'place':['map-marker','red'], 
	'substance':['flask','purple'], 
	'organization':['landmark','brown'], 
	'event':['bell','gold']};

var global_defaults = {
	"ANNO_MODE": 'entities',  // use 'coref' for coreference annotation
	"DEFAULT_ENTITY_TYPE": 'abstract',
	"DEFAULT_ICON": 'question',
	"DEFAULT_COLOR": 'lightgray',
	"DRAG_TOL": 5,
	"DEFAULT_SGML_SPAN_TAG": "entity",
	"DEFAULT_SGML_SPAN_ATTR": "entity",
	"DEFAULT_SGML_SENT_TAG": "s",
	"DEFAULT_SGML_TOK_ATTR": null, // use null to read tokens from plain text, not SGML tags; or use an attribute name if desired word forms are SGML tag attributes, e.g. 'norm'
	"DEFAULT_GROUP": "coref"
}

var coref_colors = ["Red","RoyalBlue","ForestGreen","DarkMagenta","Brown","DarkTurquoise","Plum","Orange","Navy","Olive","LightSeaGreen","MediumSeaGreen","Aqua","Blue","BlueViolet","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Crimson","DarkBlue","DarkCyan","DarkGoldenRod","DarkGreen","DarkKhaki","DarkOliveGreen","DarkOrange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DeepPink","DarkViolet","DeepSkyBlue","DimGray","DodgerBlue","FireBrick","Fuchsia","Gold","GoldenRod","Gray","Green","GreenYellow","HotPink","IndianRed","Indigo","Khaki","LawnGreen","LightBlue","LightCoral","LightGreen","LightPink","LightSalmon","LightSkyBlue","LightSlateGray","LightSteelBlue","Lime","LimeGreen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","NavajoWhite","OliveDrab","OrangeRed","Orchid","PaleGreen","PaleTurquoise","PaleVioletRed","PeachPuff","Peru","Pink","PowderBlue","Purple","RebeccaPurple","RosyBrown","SaddleBrown","Salmon","SandyBrown","SeaGreen","Sienna","SkyBlue","SlateBlue","SlateGray","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","Yellow"];  // Prioritized list of fixed colors to use for groups

// Data model
var entities = {};  // Stores all Entity objects for the current document, keys are span like strings, e.g. "3-4" for entity spanning tokens 3-4
var toks2entities = {}; // Hash map from 1-based token indices to all Entity objects containing them
var tokens = {}; // Stores all Token objects for the current document, keys are strings starting with "1"
var groups = {}; // Stores all span groups, keys are group types, values map group ids to included entity spans
groups[def_group] = {0: []};
groups["bridge"] = {0:[]}; // TODO: read from config

var collapse_edges = {"appos":"coref","ana":"coref","cata":"coref"};  // edge type replacements
var anno_keys = [];  // additional span annotations beyond entity type
var anno_values = {}; // possible values for each annotation key

var anno_mode = "entities";  // use 'coref' for coreference annotation

var def_group = global_defaults["DEFAULT_GROUP"];
var def_color = global_defaults["DEFAULT_COLOR"];
var assigned_colors = {};
assigned_colors[def_group] = {0: def_color};
var active_group = def_group;
var color_modes = new Set();
color_modes.add("entities");
color_modes.add("bridge");  // TODO: read from config
var color_mode;
var hovered_entity;
var tok_ids = null;

for (var key in global_defaults){
	if ($('#' + key).val()){
		window[key] = $('#' + key).val();
	} else{
		window[key] = global_defaults[key];
	}
}

var entity_icon = '<div id="%ID%" class="entity_type"><i title="%TYPE%" class="fa fa-%FATYPE% entity_icon"></i></div>';
var close_icon = '<div id="close%ID%" class="close" onclick="delete_entity('+"'"+'%ID%'+"'"+');"><i title="close" class="fa fa-times-circle"></i></div>';
var sentnum = 0;

class Entity{
	constructor(tok_ids,type){
		this.type = type;
		this.start = Math.min(...tok_ids);
		this.end = Math.max(...tok_ids);
		this.toks = tok_ids;
		this.length = this.end-this.start +1;
		this.div_id = this.start.toString() + '-' + this.end.toString();
		this.annos = {};  // key-value pairs of additional annotations, such as "infstat": "new"
		this.identity = "_";
		this.next = {};  // object mapping group types (e.g. coref) to next entity object in chain; only filled during export
		let g = {};
		let def_group = global_defaults["DEFAULT_GROUP"];
		for (let init_grp in groups){
			g[init_grp] = 0;
		}
		if (!(def_group in groups)){
			g[def_group] = 0;
		}
		this.groups = g;
		if (Object.keys(groups).length==0) {groups[def_group] = {0:[]};}
		for (var g_type in groups){
			if (!(groups[g_type][0].includes(this.div_id))){
				groups[g_type][0].push(this.div_id);
			}
		}
		
		this.get_text = function (){ 
			var entity_text = [];
			for (var i of this.toks){
				entity_text.push(tokens[i].word);
			}
			return entity_text.join(" ");
		}
	}
  }

class Token{
	constructor(tid, toknum_in_sent, word, sent, sentnum, sent_tooltip){
		this.tid = tid;  // Running unique token id (over all sentences in document, 1 based)
		this.toknum_in_sent = toknum_in_sent; // Number of token inside sentence, 1 based
		this.word = word;
		this.sent = sent;  // Whether this is a sentence initial token
		this.sentnum = sentnum;  // Number of sentence
		this.sent_tooltip = sent_tooltip;  // Tooltip to display on sentence span, such as a translation
	}
}

// Drop down menu for entity selection
// if the document is clicked somewhere
$(document).bind("mousedown", function (e) {
    // if the clicked element is not the menu
    if (!$(e.target).parents(".custom-menu").length > 0) {
		// check that this isn't the original click event that triggered the menu
		if (!($(e.target).offset().left == $(".custom-menu").offset().left)){
			if (!($(e.target).offset().top == $(".custom-menu").offset().top)){
				$(".custom-menu").hide(100); // hide the menu
			}
		}
    }
	// Stop tracking hover since it slows down selectable lasso box
	$("#editor").unbind("mousemove");
});
// Start tracking hover to highlight annotation span borders for resize, since we are not using selectable lasso box
$(document).bind("mouseup", function () {	$("#editor").bind("mousemove", track_hover);});

// If the menu element is clicked
$(".custom-menu li").click(function(){
    // Hide it AFTER the action was triggered
    $(".custom-menu").hide(100);
});

function drop_response(draggableId,droppableId,ui) {
  
  // diagnose original span and target new boundary token id
  let parts = draggableId.split("-")
  let dragged_side = drag_border_side;
  let orig_start  = parseInt(parts[0]);
  let orig_end = parseInt(parts[1]);
  
  let target_tok;
  let proposed_start;
  let proposed_end;
  if (droppableId.startsWith("t")){    // dragged into a token
	target_tok = parseInt(droppableId.replace("t",""));
	if (dragged_side=="left" && target_tok > 1){ // Snap to beginning of token if dragging left into a token
		target_tok -= 1;
	}
  } else{
	  alert("Invalid drag target!");
	  return false;
  }	

  // Check that all entities overlapping proposed span are either entirely within or around it
  if (target_tok > orig_end){
	  proposed_start = orig_start;
	  proposed_end = target_tok;
  }else if ((target_tok < orig_end  && target_tok >= orig_start) || (target_tok <= orig_end  && target_tok > orig_start)){ // make span smaller
		if (dragged_side == "right"){ // smaller on the right
			proposed_start = orig_start;
			proposed_end = target_tok;
		} else{ // smaller on the left
			proposed_start = target_tok;
			proposed_end = orig_end;
		}
  }else{
	 proposed_start = target_tok;
	 proposed_end = orig_end;
  }
if (dragged_side == "left" && proposed_start > 1){ // Add one for left boundary, since separators have the number of the preceding token
	proposed_start += 1;
	target_tok += 1;
}
  
  if (proposed_start == orig_start && proposed_end == orig_end){ // Check there was an actual resize
	  return false
  }
  
  if (proposed_start.toString() + "-" + proposed_end.toString() in entities){  // Check if this is span identical to another existing span
	return false;
  }

	let toks_to_check = range(proposed_start, proposed_end+1);
	for (var tok of toks_to_check){
	  if (!(tok in toks2entities)){
		  continue;
	  }
	  let ents = toks2entities[tok];
	  if (ents.length==0){
		  continue
	  }
		for (var span in ents){
			let e = toks2entities[tok][span];
			if (e.start == orig_start && e.end == orig_end){  // this is the original entity itself
				continue;
			}
			if (e.start < proposed_start && e.end < proposed_end){
				alert("invalid");
				return false;
			}
			if (e.start > proposed_start && e.end > proposed_end){
				alert("invalid");
				return false;
			}
		}
	}

	// Check that tokens are in the same sentence
	let sequential = check_sequential(toks_to_check);
	if (!sequential){
		return false;
	}

  
  // Valid span, delete old span and create new one
  let old_id = orig_start.toString() + "-" + orig_end.toString();
  let old_entity = entities[old_id];
  let entity_type = old_entity.type;
  let old_groups = old_entity.groups;
  let old_annos = old_entity.annos;
  $(ui.draggable).remove();
  let new_entity = add_entity(toks_to_check);  
  new_entity.groups = old_groups;
  new_entity.annos = old_annos;
  for (var mode of color_modes){
	if (mode != "entities"){
		if (mode in old_entity.groups){
			assign_group(new_entity,mode,old_entity.groups[mode]);
		}
		for (var g in groups[mode]){
			if (groups[mode][g].includes(old_id)){
				groups[mode][g] = arrayRemove(groups[mode][g],old_id);
			}
		}
	}
  }
  change_entity(entity_type);
  delete_entity(old_id);
  return true;
}

function make_context_menu(){
	$('#anno-context').html('');
	for (var anno_val of Object.keys(ICON_MAP).sort()){
		var menu_option = '<li onclick="change_entity(' + "'" + anno_val + "'"+');"><i style="color: gray; font-size: small" class="fa fa-'+ICON_MAP[anno_val][0]+'"></i> '+anno_val+'</li>';
		$('#anno-context').append(menu_option);
	}
}


$(document).on("keyup", function (e) {
	let key = e.which;
	if (key == 13){ // User hit enter, make a new entity if anything is selected
		if ($('.ui-selected').length > 0){
			add_entity(null,null);
			event.preventDefault();
			return false;
		} else if ($('.selected-entity').length>0){
			group_selected();
		}
	}
	else	if (key == 46) {// User hit delete, unlink selected entities
		 if ($('.selected-entity').length>0){
			 ungroup_selected();
		 }
	}
});

$(document).on("keydown", function (e) {
	return;
	if (e.ctrlKey){
		if (e.keyCode == 67){ // User hit ctrl+c, copy selected tokens
			if ($('.ui-selected').length > 0){
				e.preventDefault();
				to_copy = [];
				for (var token of $('.ui-selected')){
					to_copy.push(token.innerHTML);
				}
				window.prompt("Copy to clipboard: Ctrl+C, Enter", to_copy.join(" "));
			}
		}else if (e.keyCode==85){ // User hit ctrl+u, offer to update token
			if ($('.ui-selected').length == 1){
				e.preventDefault();
				to_copy = [];
				for (var token of $('.ui-selected')){
					to_copy.push(token.innerHTML);
					last_token_id = token.id;
				}
				let new_token_string = window.prompt("Enter string to update token", to_copy.join(" "));
				tokens[parseInt(last_token_id.replace(/t/,''))].word = new_token_string;
				$("#" + last_token_id).html(new_token_string);
			}
		}else if (e.keyCode==73){ // User hit ctrl+i, offer to insert token
			if ($('.ui-selected').length > 0){
				e.preventDefault();
				to_copy = [];
				for (var token of $('.ui-selected')){
					to_copy.push(token.innerHTML);
					last_token_id = token.id;
				}
				last_token_id = parseInt(last_token_id.replace(/t/,''));
				last_token_sent = tokens[last_token_id].sentnum;
				let new_token_string = window.prompt("Enter string for new token", to_copy.join(" "));
				if (new_token_string.length!=0){
					//let max_token = Object.keys(tokens).reduce(function(a, b){ return obj[a] > obj[b] ? a : b });
					let new_tok = new Token(last_token_id.toString(), null, new_token_string,last_token_sent,last_token_sent,'');
					let new_tokens = {};
					new_tokens[last_token_id] = new_tok;
					new_tokens[last_token_id].toknum_in_sent = tokens[last_token_id].toknum_in_sent;
					if (new_tokens[last_token_id].toknum_in_sent > 1){new_tokens[last_token_id].sent = null;}
					for (var k in tokens){
						k = parseInt(k);
						if (k < last_token_id){
							new_tokens[k] = tokens[k];
						} else{
							new_tokens[k+1] = tokens[k];
							new_tokens[k+1].tid = (k+1).toString();
							if (tokens[k].sentnum==last_token_sent){new_tokens[k+1].toknum_in_sent++;}
						}
					}
					// bump HTML IDs of other tokens
					$(".tok").each(function (){
						let tnum = parseInt(this.id.replace(/t/,''));
						if (tnum >= last_token_id){
							$(this).attr("id","t" + (tnum + 1).toString());
							$(this).attr("toknum",(tnum + 1).toString());
						}
					});
					// insert HTML for the new token
					let tok_html = make_token_div(new_tok);
					elem_to_follow = "#t" + (last_token_id-1).toString();
					min_start = Object.keys(tokens).length;
					for (var eid in entities){
						ent = entities[eid];
						if (ent.end==last_token_id-1){
							if (ent.start < min_start){
								min_start = ent.end;
								elem_to_follow = "#" + ent.div_id;
							}
						}
					}
					$(elem_to_follow).after(tok_html);
					let new_ents = {};
					for (var eid in entities){
						ent = entities[eid];
						if (ent.end > last_token_id){
							ent.end++;
							if (ent.start > last_token_id){
								ent.start++;
							}
							let old_eid = ent.div_id;
							ent.div_id = ent.start.toString() + "-" + ent.end.toString();
							for (var gtype in groups){
								for (var g in groups[gtype]){
									groups[gtype][g] = groups[gtype][g].map(function(item) { return item == old_eid ? ent.div_id : item; });
								}
							}
							for (var tid in toks2entities){
								if (old_eid in toks2entities[tid]){
									delete toks2entities[tid][old_eid];
								}
							}
							ent.toks = Array.from(range(ent.start, ent.end+1));
							for (var tok of ent.toks){
								if (toks2entities[tok] == null){
									toks2entities[tok] = {};
								}
								toks2entities[tok][ent.div_id] = ent;
							}
							$("#"+old_eid).attr("id",ent.div_id);
						}
						new_ents[ent.div_id] = ent;
					}
					tokens = new_tokens;
					entities = new_ents;
				}
			}
		}
	}
});


function drag_stop(ev, ui){
		$("#editor").bind("mousemove", track_hover);
	
	    let mouse_x = ui.helper.position().left;
        let mouse_y = ui.helper.position().top;
		mouse_x = ev.clientX;
        mouse_y = ev.clientY;

		// get all token coordinates
		let toks = Array.from($(".tok"));
		let tok_coords = toks.map(tok => {let rect = tok.getBoundingClientRect();  return [rect.x, rect.y, rect.width, rect.height];});
		let distances = [];
		tok_coords.forEach(tok_coord => {
			let distance = Math.hypot(tok_coord[0]-mouse_x, tok_coord[1]-mouse_y);
			if (tok_coord[0] > mouse_x || tok_coord[1] + tok_coord[3] < mouse_y || tok_coord[1] > mouse_y){ // Closest token left is beyond the mouse X or outside mouse Y
				distances.push(100000); // Assign arbitrary large distance to ignore this option
			} else{
				distances.push(parseInt(distance));
			}
		});
		let closest_tok_idx = distances.indexOf(Math.min(...distances));
		let closest_tok = toks[closest_tok_idx];

        /*$(ui.helper).hide();
        var targetElement = document.elementFromPoint(mouse_x, mouse_y);
        $(ui.helper).show();*/
		
		let draggableId = $(this).attr("id");
		let droppableId = $(closest_tok).attr("id");
		
		drop_response(draggableId,droppableId,ui);
		$(".custom-menu").hide(100); // Hide context menu in case drag overlapped annotation chooser
}

var drag_border_side;


var droppable_settings = {};//stop: drag_stop};
var draggable_settings = {
		stop: drag_stop,
		revert: true,
		revertDuration: 0,
		helper: function(){
			return $('<div class="entity" style="border: 3px solid green; width: 0px; height: 14px; position:relative; pointer-events: none"></div>');
		},
		start: function(event, ui){
			$("#editor").unbind("mousemove");

			// Get mouse position relative to entity div left 0
			let click_x_inside_entity = event.clientX-$(event.target).offset().left;
			let drag_border_side;
			if (click_x_inside_entity<DRAG_TOL){ // Left border drag
				drag_border_side = 'left';
				//console.log(drag_border_side);
			} else if(click_x_inside_entity + DRAG_TOL > $(event.target).width()){ // Right border drag
				drag_border_side = 'right';
				//console.log(drag_border_side);
			} else{return false;}  // Not a border, cancel drag
			
			$(this).draggable('instance').offset.click = {
				left: Math.floor(ui.helper.width() / 2),
				top: Math.floor(ui.helper.height() / 2)
			};
			$(".custom-menu").hide(100); // Hide context menu in case drag overlapped annotation chooser
		}
	};

function accept_drop(elm) {
        // only allow draggables to the placement if there's no other draggable 
        // in the droppable
        if ($(this).hasClass("tok")) {
			//console.log($(this).attr("id"));
			return true;
		}
		else{
			return false;
		}
}

// Border highlighting on hover
var hovered_entity = null;
function unhighlight_entity_border(event){
		if ($(this).hasClass("entity")){
			$(".entity").not(".selected-entity").css("background-color","transparent");
			$(this).removeClass("entity-border-hover-left");
			$(this).removeClass("entity-border-hover-right");
			hovered_entity = null;
		}
}

function set_hovered_entity(event){
	if ($(event.target).hasClass("entity")){
		hovered_entity = $(event.target).attr("id");
		color_mode = $("#color_mode").val();
		if (color_mode != "entities"){  
			// highlight coreferent entities in ithis grouping
			let grp = entities[hovered_entity].groups[color_mode];
			if (parseInt(grp) != 0){
				for (var div_id in entities){
					if (entities[div_id].groups[color_mode] == grp){
						$("#"+div_id).not(".selected-entity").css("background-color","yellow");
					}
				}
			}
		}
	}
}

function select_entity(event){
	if ($(event.target).hasClass("entity")){
		event.stopPropagation();
		let sel_ent_id = $(event.target).attr("id");
		$("#"+sel_ent_id).toggleClass("selected-entity");
		if ($(".selected-entity").length >0){ $(".ui-selected").removeClass("ui-selected");}  // unselect tokens if an entity is selected
	}
}

function track_hover(event){
	if (hovered_entity== null){
		return false;
	}
	if (typeof $("#" + hovered_entity)== "undefined" || typeof $("#" + hovered_entity).offset() == "undefined"){
		hovered_entity = null;
		return false;
	}
	let x_inside_entity = event.clientX-$("#" + hovered_entity).offset().left;
	if (x_inside_entity<DRAG_TOL){ // Left border hover
		$("#" + hovered_entity).addClass("entity-border-hover-left");
	} else if(x_inside_entity + DRAG_TOL > $("#" + hovered_entity).width()){ // Right border hover
		$("#" + hovered_entity).addClass("entity-border-hover-right");
	}
	else{ // unhighlight
		$("#" + hovered_entity).removeClass("entity-border-hover-left");
		$("#" + hovered_entity).removeClass("entity-border-hover-right");
	}
}

function bind_entity_events(){
	$(".entity").draggable(draggable_settings);
	$(".entity").hover(set_hovered_entity);
	$(".entity").mouseover(set_hovered_entity);
	$(".entity").mouseleave(unhighlight_entity_border);
	$(".entity").unbind("click");
	$(".entity").on("click",select_entity);
	$(".entity").on("dblclick",show_annotation);
}

function bind_tok_events(){
	$(".tok").droppable(droppable_settings);
	$(".tok").click(function(event){
		if (event.ctrlKey){
			$(this).toggleClass("ui-selected");
		} else{
				$(".ui-selected").removeClass("ui-selected");
				$(this).addClass("ui-selected");
		}
		$(".selected-entity").removeClass("selected-entity");  // remove all entity selections if a token is selected
	});
}

function set_color_mode(color_mode){
	if (color_mode == null){color_mode=$("#color_mode").val();}
	active_group = anno_mode = color_mode;
	
	var col;
	for (var div_id in entities){
		var entity_to_color = entities[div_id];
		if (color_mode=="entities"){
			$("#btn_group").prop("disabled",true);
			$("#btn_ungroup").prop("disabled",true);
			if (entity_to_color.type in ICON_MAP){
				col = ICON_MAP[entity_to_color.type][1];
			}else {
				col = global_defaults["DEFAULT_COLOR"];
			}
		} else{
			$("#btn_group").prop("disabled",false);
			$("#btn_ungroup").prop("disabled",false);
			if (color_mode in entity_to_color.groups){
				let grp = entity_to_color.groups[color_mode];
				let found_color = false;
				if (color_mode in assigned_colors){
					if (grp in assigned_colors[color_mode]){
						col = assigned_colors[color_mode][grp];
						found_color = true;
					}
				} 
				if (!(found_color)){ 
					// somehow this entity has a group for this color_mode, but a color has not been assigned, so re-assign
					assign_group(entity_to_color,color_mode,grp);
				}
			} else{
				col = global_defaults["DEFAULT_COLOR"];
			}
		}
		$("#"+div_id).css("border-color",col);
	}
	if (color_modes.size>1){
		$("#color_mode").prop("disabled",false);
	} else{
		$("#color_mode").prop("disabled",true);
	}
}

function assign_group(existing_span, gtype, new_group){
	new_group = parseInt(new_group);
	if (!(gtype in assigned_colors)){assigned_colors[gtype] = {0: global_defaults["DEFAULT_COLOR"]};}
	if (!(gtype in groups)){  // new group type found
		groups[gtype] = {0: []};
		for (var div_id in entities){  // initialize all entities as belonging to group 0 of this type
			entities[div_id].groups[gtype] = 0;
		}
	}
	
	let col;
	if (new_group==0){
		col = global_defaults["DEFAULT_COLOR"];
	}
	else {
		if(new_group in assigned_colors[gtype]){
			col = assigned_colors[gtype][new_group];
		}
		else{
			if (new_group > coref_colors.length){
				// random color
				col = "#" + Math.floor(Math.random()*16777215).toString(16);
			} else{
				col = coref_colors[new_group-1];
			}
			assigned_colors[gtype][new_group] = col;
		}
	}
	$("#"+existing_span.div_id).css("border-color",col);
	if (!(new_group in groups[gtype])){groups[gtype][new_group] = [];}
	if (gtype in existing_span.groups){ // if this already has a group of this kind, remove the old group information
		groups[gtype][existing_span.groups[gtype]] = arrayRemove(groups[gtype][existing_span.groups[gtype]],existing_span.div_id);
	}
	if (existing_span.groups[gtype] != 0 && existing_span.groups[gtype]!=null){
		if (existing_span.groups[gtype] != new_group){
			if (groups[gtype][existing_span.groups[gtype]].length==0){
				delete groups[gtype][existing_span.groups[gtype]]; // remove group if empty
			} 
		}
	}
	existing_span.groups[gtype] = new_group;
	groups[gtype][new_group].push(existing_span.div_id);
}

function get_new_group_id(group_type){
	let existing_groups = Object.keys(groups[group_type]).map(Number);
	let max_group = Math.max(...existing_groups);
	if (max_group == Infinity || max_group == 0){return 1;}
	var i = 1;
	while (i < max_group+2){
		if (!(existing_groups.includes(i))){
			return i;
		}
		i++;
	}
}

function ungroup_selected(group_type){
	color_mode=$("#color_mode").val();
	if (color_mode=="entities"){return false;} // entity highlighting mode, disable grouping
	
	if (group_type==null){group_type = color_mode;}
	
	// collect selected entities
	var sel_ent_ids = [];
	var sel_spans = $(".selected-entity");
	if (sel_spans.length<1){return false;}
	sel_spans.each(function(){
		sel_ent_ids.push($(this).attr("id"));
	});
	let affected_groups = new Set();
	for (var div_id of sel_ent_ids){
		let e = entities[div_id];
		let old_group = parseInt(e.groups[group_type]);
		if (old_group!=0){affected_groups.add(old_group);}
		assign_group(e, group_type,0);
	}
	
	// check if there are any singletons left over as a result of ungrouping
	for (var affected_group of affected_groups){ 
		if (affected_group in groups[group_type]){
			let remaining_in_old_group = groups[group_type][affected_group];
			if (remaining_in_old_group.length < 2){
				for (var div_id of remaining_in_old_group){
					assign_group(entities[div_id], group_type,0);
				}
			}
		}
	}
	
	$(".selected-entity").removeClass("selected-entity");
	
}

function group_selected(group_type){  // add all selected entities to a single group of the current group type
	color_mode=$("#color_mode").val();
	if (color_mode=="entities"){return false;} // entity highlighting mode, disable grouping

	if (group_type==null){group_type = color_mode;}
	
	// collect selected entities
	var sel_ent_ids = [];
	var sel_spans = $(".selected-entity");
	if (sel_spans.length<1){return false;}
	sel_spans.each(function(){
		sel_ent_ids.push($(this).attr("id"));
	});
	
	// check that more than one entity is selected
	if (sel_ent_ids.length <2){return false;}
	
	// get all group IDs involved
	let merged_ids = new Set();
	let no_zeros = true;
	for (var e_id of sel_ent_ids){
		let gid = entities[e_id].groups[group_type];
		if (gid >0){
			merged_ids.add(gid);
		} else{
			no_zeros = false;
		}
	}
	
	// choose the min group ID as the ID for the new group
	let min_id = Math.min(...Array.from(merged_ids.values()));
	let new_group = false;
	if (min_id == Infinity){
		// create a new ID if there are no groups yet
		min_id = get_new_group_id(group_type);
	} else if(merged_ids.size == 1 && min_id > 0 && no_zeros){ 
		// All selected entities are from a single, non-zero group - assume user wants a new group for these entities
		min_id = get_new_group_id(group_type);
		new_group = true;
	}
	
	// assign new ID to all entities sharing a merged group's id
	if (!(new_group)){
		for (var old_id of merged_ids){
			let old_group_member_ids = groups[group_type][old_id];
			for (var m_id of old_group_member_ids){
				assign_group(entities[m_id], group_type, min_id);
			}
		}
	}
	
	// assign selected entities the new ID, even if no groups were merged
	for (var e_id of sel_ent_ids){
		assign_group(entities[e_id], group_type, min_id);
	}
	$(".selected-entity").removeClass("selected-entity");
}

function color_coref(group_type){
	if (group_type==null){
		group_type = global_defaults["DEFAULT_GROUP"];
	}
	color_mapping = {};
	let color;
	for (var e of entities){
		g = parseInt(e.groups[group_type]);
		if (g==0){
			color = global_defaults["DEFAULT_COLOR"];
		} else{
			if (g in color_mapping){
				color = color_mapping[g];
			}
			else{
				color = "x";
			}
		}
		$("#"+e.div_id).css("border-color",color);

	}
}

function init_doc(){
	make_context_menu();
	bind_tok_events();
	bind_entity_events();
	$("#editor").bind("mousemove", track_hover);
	$("#editor, .ui-selectee").bind("click", function (){ 
		// in case spannotator is loaded in an iFrame, make sure it gets focus on click
		var container = window.parent.document.getElementById("spannotator_container");
		if (typeof container != "undefined" && container != null){
			container.contentWindow.focus();
		}
	});
	$("#selectable").selectable({filter: '.tok', distance: 10});
	set_color_mode();
}

$(document).ready(function() {
	init_doc();
	var container = window.parent.document.getElementById("spannotator_container");
	if ($("#sent_mode",window.parent.document).val() == "sent"){
		toggle_sents();
	}
	
	// Create quick paste dialog
	$(function () {
		$("#import_dialog").dialog({
			autoOpen: false,
			resizable: true,
			width: "350",
			height: 400,
			modal: true,
			buttons: {
				"Close": function () {
					// if textarea is not empty do something with the value and close the modal
					if ($(this).find('textarea').val().length) {
						if ($(this).find('textarea').val().includes("#FORMAT=WebAnno")){
							read_webanno($(this).find('textarea').val());
						} else if ($(this).find('textarea').val().includes("<")){
							read_tt($(this).find('textarea').val());
						}
						$(this).dialog("close");
					}
					$(this).dialog("close");
				}
			}
		});
	});

	// Create export dialog
	$(function () {
		$("#export_dialog").dialog({
			autoOpen: false,
			resizable: true,
			width: "350",
			height: 440,
			modal: true,
			buttons: {
				"Close": function () {
					$(this).dialog("close");
				}
			},
			open: function( event, ui ) {
				run_export('webanno');
			}
		});
	});	
	
		$(function () {
		$("#annotation_dialog").dialog({
			autoOpen: false,
			resizable: false,
			width: "350",
			height: 300,
			modal: true,
			buttons: {
				"Close": function () {
					$(this).dialog("close");
				}
			}
		});
	});
	$("#loading_screen").removeClass("loading");


var demo = false; // PRODUCTION SETTING AZ
if (demo){
read_webanno(`#FORMAT=WebAnno TSV 3
#T_SP=webanno.custom.Referent|entity|infstat
#T_RL=webanno.custom.Coref|type|BT_webanno.custom.Referent


#Text=Greek court rules worship of ancient Greek deities is legal
1-1	0-5	Greek	event[1]|organization[2]	new[1]|new[2]	coref|coref	3-1[6_1]|3-1[7_2]	
1-2	6-11	court	event[1]|organization[2]	new[1]|new[2]	_	_	
1-3	12-17	rules	event[1]	new[1]	_	_	
1-4	18-25	worship	event[1]|abstract[3]	new[1]|new[3]	bridge|bridge	3-6[8_3]|3-8[9_3]	
1-5	26-28	of	event[1]|abstract[3]	new[1]|new[3]	_	_	
1-6	29-36	ancient	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	coref	6-16[20_4]	
1-7	37-42	Greek	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	_	_	
1-8	43-50	deities	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	_	_	
1-9	51-53	is	event[1]	new[1]	_	_	
1-10	54-59	legal	event[1]	new[1]	_	_	

#Text=Monday , March 27 , 2006
2-1	60-66	Monday	time[5]	acc[5]	_	_	
2-2	67-68	,	time[5]	acc[5]	_	_	
2-3	69-74	March	time[5]	acc[5]	_	_	
2-4	75-77	27	time[5]	acc[5]	_	_	
2-5	78-79	,	time[5]	acc[5]	_	_	
2-6	80-84	2006	time[5]	acc[5]	_	_	

#Text=Greek court has ruled that worshippers of the ancient Greek religion may now formally associate and worship at archeological sites .
3-1	85-90	Greek	event[6]|organization[7]	giv[6]|giv[7]	coref	4-3[11_6]	
3-2	91-96	court	event[6]|organization[7]	giv[6]|giv[7]	_	_	
3-3	97-100	has	event[6]	giv[6]	_	_	
3-4	101-106	ruled	event[6]	giv[6]	_	_	
3-5	107-111	that	event[6]	giv[6]	_	_	
3-6	112-123	worshippers	event[6]|person[8]	giv[6]|acc[8]	coref	6-14[19_8]	
3-7	124-126	of	event[6]|person[8]	giv[6]|acc[8]	_	_	
3-8	127-130	the	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	coref	4-6[13_9]	
3-9	131-138	ancient	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-10	139-144	Greek	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-11	145-153	religion	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-12	154-157	may	event[6]	giv[6]	_	_	
3-13	158-161	now	event[6]	giv[6]	_	_	
3-14	162-170	formally	event[6]	giv[6]	_	_	
3-15	171-180	associate	event[6]	giv[6]	_	_	
3-16	181-184	and	event[6]	giv[6]	_	_	
3-17	185-192	worship	event[6]	giv[6]	_	_	
3-18	193-195	at	event[6]	giv[6]	_	_	
3-19	196-209	archeological	event[6]|place[10]	giv[6]|new[10]	_	_	
3-20	210-215	sites	event[6]|place[10]	giv[6]|new[10]	_	_	
3-21	216-217	.	_	_	_	_	

#Text=Prior to the ruling , the religion was banned from conducting public worship at archeological sites by the Greek Ministry of Culture .
4-1	218-223	Prior	_	_	_	_	
4-2	224-226	to	_	_	_	_	
4-3	227-230	the	event[11]	giv[11]	_	_	
4-4	231-237	ruling	event[11]	giv[11]	_	_	
4-5	238-239	,	_	_	_	_	
4-6	240-243	the	event[12]|organization[13]	new[12]|giv[13]	coref|bridge	5-5[16_13]|5-3[0_12]	
4-7	244-252	religion	event[12]|organization[13]	new[12]|giv[13]	_	_	
4-8	253-256	was	event[12]	new[12]	_	_	
4-9	257-263	banned	event[12]	new[12]	_	_	
4-10	264-268	from	event[12]	new[12]	_	_	
4-11	269-279	conducting	event[12]	new[12]	_	_	
4-12	280-286	public	event[12]	new[12]	_	_	
4-13	287-294	worship	event[12]	new[12]	_	_	
4-14	295-297	at	event[12]	new[12]	_	_	
4-15	298-311	archeological	event[12]	new[12]	_	_	
4-16	312-317	sites	event[12]	new[12]	_	_	
4-17	318-320	by	_	_	_	_	
4-18	321-324	the	organization[14]	new[14]	_	_	
4-19	325-330	Greek	organization[14]	new[14]	_	_	
4-20	331-339	Ministry	organization[14]	new[14]	_	_	
4-21	340-342	of	organization[14]	new[14]	_	_	
4-22	343-350	Culture	organization[14]	new[14]	_	_	
4-23	351-352	.	_	_	_	_	

#Text=Due to that , the religion was relatively secretive .
5-1	353-356	Due	_	_	_	_	
5-2	357-359	to	_	_	_	_	
5-3	360-364	that	event	acc	_	_	
5-4	365-366	,	_	_	_	_	
5-5	367-370	the	organization[16]	giv[16]	coref	9-19[37_16]	
5-6	371-379	religion	organization[16]	giv[16]	_	_	
5-7	380-383	was	_	_	_	_	
5-8	384-394	relatively	_	_	_	_	
5-9	395-404	secretive	_	_	_	_	
5-10	405-406	.	_	_	_	_	

#Text=The Greek Orthodox Church , a Christian denomination , is extremely critical of worshippers of the ancient deities .
6-1	407-410	The	organization[17]	new[17]	coref|appos	8-1[30_17]|6-6[18_17]	
6-2	411-416	Greek	organization[17]	new[17]	_	_	
6-3	417-425	Orthodox	organization[17]	new[17]	_	_	
6-4	426-432	Church	organization[17]	new[17]	_	_	
6-5	433-434	,	_	_	_	_	
6-6	435-436	a	organization[18]	giv[18]	_	_	
6-7	437-446	Christian	organization[18]	giv[18]	_	_	
6-8	447-459	denomination	organization[18]	giv[18]	_	_	
6-9	460-461	,	_	_	_	_	
6-10	462-464	is	_	_	_	_	
6-11	465-474	extremely	_	_	_	_	
6-12	475-483	critical	_	_	_	_	
6-13	484-486	of	_	_	_	_	
6-14	487-498	worshippers	person[19]	giv[19]	bridge	7-3[22_19]	
6-15	499-501	of	person[19]	giv[19]	_	_	
6-16	502-505	the	person[19]|abstract[20]	giv[19]|giv[20]	coref	7-7[24_20]	
6-17	506-513	ancient	person[19]|abstract[20]	giv[19]|giv[20]	_	_	
6-18	514-521	deities	person[19]|abstract[20]	giv[19]|giv[20]	_	_	
6-19	522-523	.	_	_	_	_	

#Text=Today , about 100,000 Greeks worship the ancient gods , such as Zeus , Hera , Poseidon , Aphrodite , and Athena .
7-1	524-529	Today	time	acc	_	_	
7-2	530-531	,	_	_	_	_	
7-3	532-537	about	person[22]|abstract[23]	acc[22]|new[23]	coref	8-6[31_23]	
7-4	538-545	100,000	person[22]|abstract[23]	acc[22]|new[23]	_	_	
7-5	546-552	Greeks	person[22]	acc[22]	_	_	
7-6	553-560	worship	_	_	_	_	
7-7	561-564	the	abstract[24]	giv[24]	bridge|bridge|bridge|bridge|bridge	7-22[0_24]|7-19[0_24]|7-17[0_24]|7-15[0_24]|7-13[0_24]	
7-8	565-572	ancient	abstract[24]	giv[24]	_	_	
7-9	573-577	gods	abstract[24]	giv[24]	_	_	
7-10	578-579	,	_	_	_	_	
7-11	580-584	such	_	_	_	_	
7-12	585-587	as	_	_	_	_	
7-13	588-592	Zeus	person	acc	_	_	
7-14	593-594	,	_	_	_	_	
7-15	595-599	Hera	person	acc	_	_	
7-16	600-601	,	_	_	_	_	
7-17	602-610	Poseidon	person	acc	_	_	
7-18	611-612	,	_	_	_	_	
7-19	613-622	Aphrodite	person	acc	_	_	
7-20	623-624	,	_	_	_	_	
7-21	625-628	and	_	_	_	_	
7-22	629-635	Athena	person	acc	_	_	
7-23	636-637	.	_	_	_	_	

#Text=The Greek Orthodox Church estimates that number is closer to 40,000 .
8-1	638-641	The	organization[30]	giv[30]	_	_	
8-2	642-647	Greek	organization[30]	giv[30]	_	_	
8-3	648-656	Orthodox	organization[30]	giv[30]	_	_	
8-4	657-663	Church	organization[30]	giv[30]	_	_	
8-5	664-673	estimates	_	_	_	_	
8-6	674-678	that	abstract[31]	giv[31]	_	_	
8-7	679-685	number	abstract[31]	giv[31]	_	_	
8-8	686-688	is	_	_	_	_	
8-9	689-695	closer	_	_	_	_	
8-10	696-698	to	_	_	_	_	
8-11	699-705	40,000	_	_	_	_	
8-12	706-707	.	_	_	_	_	

#Text=Many neo-pagan religions , such as Wicca , use aspects of ancient Greek religions in their practice ; Hellenic polytheism instead focuses exclusively on the ancient religions , as far as the fragmentary nature of the surviving source material allows .
9-1	708-712	Many	organization[32]	acc[32]	ana|bridge	9-16[0_32]|9-7[0_32]	
9-2	713-722	neo-pagan	organization[32]	acc[32]	_	_	
9-3	723-732	religions	organization[32]	acc[32]	_	_	
9-4	733-734	,	_	_	_	_	
9-5	735-739	such	_	_	_	_	
9-6	740-742	as	_	_	_	_	
9-7	743-748	Wicca	organization	acc	_	_	
9-8	749-750	,	_	_	_	_	
9-9	751-754	use	_	_	_	_	
9-10	755-762	aspects	abstract[34]	new[34]	_	_	
9-11	763-765	of	abstract[34]	new[34]	_	_	
9-12	766-773	ancient	abstract[34]|organization[35]	new[34]|giv[35]	coref	9-25[38_35]	
9-13	774-779	Greek	abstract[34]|organization[35]	new[34]|giv[35]	_	_	
9-14	780-789	religions	abstract[34]|organization[35]	new[34]|giv[35]	_	_	
9-15	790-792	in	_	_	_	_	
9-16	793-798	their	organization	giv	_	_	
9-17	799-807	practice	_	_	_	_	
9-18	808-809	;	_	_	_	_	
9-19	810-818	Hellenic	organization[37]	acc[37]	_	_	
9-20	819-829	polytheism	organization[37]	acc[37]	_	_	
9-21	830-837	instead	_	_	_	_	
9-22	838-845	focuses	_	_	_	_	
9-23	846-857	exclusively	_	_	_	_	
9-24	858-860	on	_	_	_	_	
9-25	861-864	the	organization[38]	giv[38]	_	_	
9-26	865-872	ancient	organization[38]	giv[38]	_	_	
9-27	873-882	religions	organization[38]	giv[38]	_	_	
9-28	883-884	,	_	_	_	_	
9-29	885-887	as	_	_	_	_	
9-30	888-891	far	_	_	_	_	
9-31	892-894	as	_	_	_	_	
9-32	895-898	the	_	_	_	_	
9-33	899-910	fragmentary	_	_	_	_	
9-34	911-917	nature	_	_	_	_	
9-35	918-920	of	_	_	_	_	
9-36	921-924	the	abstract[39]	new[39]	_	_	
9-37	925-934	surviving	abstract[39]	new[39]	_	_	
9-38	935-941	source	abstract[39]	new[39]	_	_	
9-39	942-950	material	abstract[39]	new[39]	_	_	
9-40	951-957	allows	_	_	_	_	
9-41	958-959	.	_	_	_	_	
`);
}

});

function run_export(format){
	if (format=="webanno"){
		data = write_webanno();
	} else if (format=="tt"){
		data = write_tt('s');
	} else {
		data = write_conllu();
	}
	$("#export_dialog").find('textarea').val(data);
}

function highlight_drop(ev){
  ev.preventDefault();
}

function unhighlight_drop(ev){
	ev.preventDefault();
}

function check_sequential(arr){ 
  // Check all tokens are in a contiguous sequence
   arr.sort((a, b) => a - b); 
	let prev = arr[0]-1;
    for (var i of arr){ 
        if (i != prev+1) {
			alert("Can't add a discontinuous span!");
			$('.ui-selected').removeClass('ui-selected');
            return false; 
		} else{
			prev = i;
		}
	}
	// Check all tokens are in the same sentence
	let sent = null;
	let prev_sent = null;
	for (var i of arr){
		let tok = tokens[i];
		if (sent == null) {
			sent = tok.sentnum; 
			prev_sent = tok.sentnum;
		}
		if (tok.sentnum != prev_sent) {
			alert("Can't add a span across sentences!");
			$('.ui-selected').removeClass('ui-selected');
			return false;
		}
	}
	return true;
}

// Create a new entity
function add_entity(tok_ids, entity_type, batch){
	if (batch === undefined) batch = false;
	if (entity_type== null){
		var entity_type = DEFAULT_ENTITY_TYPE;
	}
	if (tok_ids == null){  // User added entity using UI, read tok_ids from selection
		tok_ids = [];
		$('.ui-selected').each(function() {
			tok_ids.push( parseInt(this.getAttribute("toknum")));
		});
		if (tok_ids.length == 0){
			alert("No words are selected - click some words first");
			return false;
		}
		let sequential = check_sequential(tok_ids);
		if (!sequential){
			return false;
		}
	}

	let covering = get_maximal_covers(tok_ids);
	let new_entity = new Entity(tok_ids, 'abstract');
	let snum = tokens[tok_ids[0]].sentnum;
	$('#' + Array.from(covering).join(',#')).wrapAll('<div id="'+new_entity.div_id+'" class="entity s' +sentnum.toString()+ '"> </div>');  
	$('#'+new_entity.div_id).html(entity_icon.replace('%ID%','icon'+new_entity.div_id) +  $('#'+new_entity.div_id).html() + close_icon.replace('%ID%',new_entity.div_id));
	record_entity(new_entity);
	document.getElementById("active_entity").value = new_entity.div_id;
	change_entity(entity_type);
	
	// make draggable/set border highlight behavior	
	if (!batch){  // if we are adding just a single entity, already call jquery to set the necessary CSS
		set_entity_classes();
	}
	
	return new_entity;
  }

function set_entity_classes(){
		// make draggable/set border highlight behavior
		bind_tok_events();
		bind_entity_events();
		$(".ui-selectee").removeClass("ui-selectee");
		$(".tok").droppable(droppable_settings);
		
		// clear selection
		$("#selectable").selectable({filter: '.tok', distance: 10});
		$('#selectable .ui-selected').removeClass('ui-selected');
		for (var e_id in entities){
			toggle_star(e_id);
		}
}

function delete_entity(entity_span){
 // entity_span = document.getElementById("active_entity").value;
  let start = entities[entity_span].start;
  let entity_length = entities[entity_span].length;
  $('#'+entity_span).children('.entity_type').first().remove();
  $('#'+entity_span).children('.close').first().remove();
    $('#b-left-'+entity_span).remove();
    $('#b-right-'+entity_span).remove();
  let child_toks = $('#'+entity_span).children('.tok');
  if (child_toks.length > 0){
	child_toks.first().unwrap();
  }
  else{
    let child_divs = $('#'+entity_span).children('.entity');
	  if (child_divs.length > 0){
		child_divs.first().unwrap();
	  }
  }
  delete entities[entity_span];
  let indices = Array.from(Array(entity_length).keys());
  for (var i of indices){
	let entity_count = Object.keys(toks2entities[start+i]).length;
	if (entity_count > 1){
		delete toks2entities[start + i][entity_span];
	}
	else {
		delete toks2entities[start + i];
	}
  }
  for (var gtype in groups){
	  for (var g in groups[gtype]){
		  if (groups[gtype][g].includes(entity_span)){
			  groups[gtype][g] = arrayRemove(groups[gtype][g],entity_span);
		  }
		if (groups[gtype][g].length==0 & parseInt(g) != 0){delete groups[gtype][g];} // delete group if empty
		else if (groups[gtype][g].length==1 & parseInt(g) != 0){
			assign_group(entities[groups[gtype][g][0]], gtype,0);  // make last member of group a singleton
		}
	  }
  }

  $(".custom-menu").hide(100); // hide the menu
}

function toggle_star(div_id){
	if ("infstat" in entities[div_id].annos){
	  if (entities[div_id].annos["infstat"]=="acc"){
		  $('#icon' + div_id).find(".highlight-star").css("display","inline-block");
	  } else{
		  $('#icon' + div_id).find(".highlight-star").css("display","none");
	  }
	}
}

// Set the entity type for an entity and handle color + icon
export function change_entity(entity_type){
  let entity_span = document.getElementById("active_entity").value;
  let icon = $('#icon' + entity_span);
  let html = '<i title="%TYPE%" class="fa fa-%FATYPE% entity_icon"></i>';
  html += '<i title="accessible" class="fa fa-star entity_icon highlight-star"></i>';
  let icon_type = DEFAULT_ICON;
  let color = DEFAULT_COLOR;
  if (entity_type in ICON_MAP){
	  icon_type = ICON_MAP[entity_type][0];
	  if (anno_mode == "entities"){
		color = ICON_MAP[entity_type][1];
	  } else{
		  let group_id = parseInt(entities[entity_span].groups[active_group]);
		  if (group_id != 0){
			  color = assigned_colors[active_group][group_id];
		  }
		  else{
			color = global_defaults["DEFAULT_COLOR"];
		  }
	  }
  }
  html = html.replace('%TYPE%',entity_type).replace("%FATYPE%",icon_type);
  icon.html(html);
  entities[entity_span].type = entity_type;
  $('#'+entities[entity_span].div_id).css('border-color',color);
  $(".custom-menu").hide(100); // hide the menu
  toggle_star(entity_span);
}

// Insert an entity into the data model
function record_entity(entity){
	entities[entity.div_id] = entity;
	for (var rec_tok_id in entity.toks){
		let tok = entity.toks[rec_tok_id];
		if (!(tok in toks2entities)){
			toks2entities[tok] = {};
		}
		toks2entities[tok][entity.div_id] = entity;
	}
  }
  
  function get_maximal_covers(tok_ids){
		var covering = new Set();
		let counter = 0;
		let last = false;
		for (var tok of tok_ids){
			counter += 1;
			if (tok_ids.length==counter){
				last = true;
			}
			if (tok in toks2entities){
				var ents = Object.values(toks2entities[tok]);
				let to_remove = new Set();
				for (var e of ents){
					for (var t of e.toks){
						if (!(tok_ids.includes(t))){
							to_remove.add(e);
						}
					}
				}
				let filtered_entities = [];
				for (var e of ents){
					if (! to_remove.has(e)){
						filtered_entities.push(e);
					}
				}
				if (filtered_entities.length>0){
					let longest = filtered_entities.reduce(function(prev, curr) {
						return prev.length > curr.length ? prev : curr;
					});
					covering.add(longest.div_id);
					covering.add("b-left-"+longest.div_id);
					covering.add("b-right-"+longest.div_id);
				}
				else{
					covering.add('t' + tok.toString());
					if (!(last)){
						//covering.add('sep' + tok.toString());
					}
				}
			}
			else{ // add the token div ID itself
				covering.add('t' + tok.toString());
				if (!(last)){
					//covering.add('sep' + tok.toString());
				}
			}
		}
		return Array.from(covering);
  }
  


$(document).on("mousedown",".entity_type", function () {
   var top = $(this).offset().top; // or var clickedBtnID = this.id
   var left = $(this).offset().left;
			$(".custom-menu").finish().toggle(100).
			// In the right position (the mouse)
			css({
				top: top + "px",
				left: left + "px"
			});
	document.getElementById("active_entity").value=$(this).attr("id").replace("icon","");
});

$(document).on("mousedown",".close", function () {
	document.getElementById("active_entity").value=$(this).attr("id").replace("close","");
	delete_entity($(this).attr("id").replace("close",""));
});


function toggle_sents(){
	$(".sent").toggleClass("break");
	$(".sent").toggleClass("offset");
	$(".sent").toggleClass("numbered");
	if ($(".sent").first().hasClass("numbered")){
		$("#sent_mode",window.parent.document).val("sent");
		$('.sent').each(function(){ 
			$(this)
				.nextUntil(".sent")
				.addBack()
				.wrapAll('<div class="sent_row"/>');
	});}
	else{
		$("#sent_mode",window.parent.document).val("text");
		$('.sent').each(function(){ 
			$(this)
				.nextUntil(".sent")
				.addBack()
				.unwrap();
		});
	}
}

function select_anno_key(){
	let val_opts = "";
	let sel_key = $("#sel_anno_key").val();
	if (sel_key in anno_values){
		for (var v of anno_values[sel_key]){
				val_opts +='<option value="'+v+'">'+v+'</option>\n';
		}
	}
	$("#sel_anno_value").html(val_opts);
	let div_id = document.getElementById("active_entity").value;
	let ent = entities[div_id];
	if (sel_key in ent.annos){
		$("#sel_anno_value").val(ent.annos[sel_key]);
	}
	$("#anno_entity_text").html(ent.get_text());

}

function select_anno_value(){
	let div_id =	document.getElementById("active_entity").value;
	let ent = entities[div_id];
	let key = $("#sel_anno_key").val();
	let val = $("#sel_anno_value").val();
	if (val != ""){
		ent.annos[key] = val;
	}
	toggle_star(div_id);
}

function make_token_div(tok){ // Take a Token object and return HTML representation with sentence break element if needed
	if (tok.sent != null){
		sentnum += 1;
	}
	var out_html = '  <div id="t'+tok.tid+'" toknum="'+tok.tid+'" class="tok s'+sentnum.toString()+'">'+tok.word+'</div>\n';//<div id="sep'+tok.tid+'" class="sep"></div>\n';
	if (tok.sent != null){
		let title_string = '';
		if (tok.sent_tooltip != ''){
			title_string = 'title="'+tok.sent_tooltip.replace(/"/g,"&quot;")+'" ';
		}
		out_html = '  <span id="s'+sentnum+'" '+title_string+'class="sent s'+sentnum.toString() +'"></span>\n' + out_html;
	}
	return out_html;
}

/* IMPORT/EXPORT*/


function read_webanno(data){
	anno_mode = "entities";
	$("#selectable").html("");  // Clear editor
	// Clear data model
	entities = {};
	toks2entities = {};
	tokens = {};
	groups = {};
	assigned_colors = {}
	assigned_colors[def_group] = {0: def_color};
	color_modes = new Set();
	color_modes.add("entities");	
	anno_keys = [];
	anno_values = {};

	let lines = data.split("\n");
	let sent = 0;
	let tid= 0;
	let toknum_in_sent = 0;
	let e2tok = {};
	let e2type = {};
	let e2annos = {};
	let senttok2globaltok = {};  // maps IDs like 2-3 (sent 2, tok 3) to IDs like 6 (sixth token in document)
	let edges = [];
	let new_sent = true;
	let sent_info = null;
	let row_ent_id_mapping = {};
	var fields = [];
	var e_id = null;
	var x;
	var ent; var e_type; var edge_type; var edge_path; var tid_parts; var src_trg; var src; var trg; var tok_span;
	for (var line of lines){
		if (line.includes("\t")){
			// Read text
			line = line.trim();
			fields = line.split("\t");
			if (fields[0].endsWith("-1")){//new sentence
				sent += 1;
				new_sent = true;
				sent_info = sent;
				toknum_in_sent = 0;
			}
			else{
				new_sent = false;
				sent_info = null;
			}
			tid += 1;
			toknum_in_sent +=1;
			senttok2globaltok[sent.toString() + "-" + toknum_in_sent.toString()] = tid;
			let tok = new Token(tid.toString(), toknum_in_sent, fields[2],sent_info,sent,'');
			tokens[tid.toString()] = tok;
			$("#selectable").append(make_token_div(tok));
			
			// Read span annotations
			let ent_data = fields[3];
			let edge_types = "";
			let edge_paths = "";

			if (fields.length>4){
				edge_types = fields[fields.length-2].split("|");
				edge_paths = fields[fields.length-1].split("|");
			}else{edge_types=edge_paths="_";}
			
			if (ent_data ==  "_"){
				continue;
			}
			let ents = ent_data.split("|");
			row_ent_id_mapping = {};
			for (var e_idx in ents){
				let ent = ents[e_idx];
				if (ent.includes("[")){
					[x, e_id] = ent.split("[");
					e_id = e_id.replace("]","");
				} else{
					e_id = fields[1];
				}
				row_ent_id_mapping[e_id] = e_idx;
			}
			let this_row_annos = [];
			let mapped_idx = null;
			if (anno_keys.length>0){
				for (var i in ents){
					this_row_annos.push({});  // make an array of objects just as long as the entities array
				}
				for (var i in anno_keys){
					i = parseInt(i);
					anno_key = anno_keys[i];
					if (!(anno_key in anno_values)){anno_values[anno_key] = new Set();}
					let vals = fields[4+i].split("|");
					if (vals == "_"){continue;}
					for (var j in vals){
						let val = vals[j];
						if (val.includes("[")){
							[val, e_id] = val.split("[");
							e_id = e_id.replace("]","");
							//val = val.replace(/\[.*/,'');
						} else{
							e_id = fields[1];
						}
						anno_values[anno_key].add(val);
						mapped_idx = row_ent_id_mapping[e_id];
						//this_row_annos[j][anno_key] = val;
						this_row_annos[mapped_idx][anno_key] = val;
					}
				}
			}			
			for (var i in ents){
				ent = ents[i];
				if (ent.includes("[")){
					[e_type, e_id] = ent.split("[");
					e_id = e_id.replace("]","");
					if (!(e_id in e2tok)){
						e2tok[e_id] = [tid];
					}
					else{
						e2tok[e_id].push(tid);
					}
					e2type[e_id] = e_type;
					e2annos[e_id] = this_row_annos[i];
				}
				else{ // Single token entity
					e_id = fields[0];  // ID = "sent-wordnum", e.g. 5-3 for sent 5 token 3
					e2tok[e_id] = [tid];
					e2type[e_id] = ent;
					e2annos[e_id] = this_row_annos[i];
					//add_entity([tid]);
					//change_entity(ent);
				}
			}
			if (edge_types!="_"){
				//anno_mode = "coref";
				for (var i in edge_types){
					edge_type = edge_types[i];
					edge_path = edge_paths[i];
					if (edge_type in collapse_edges) {
						edge_type = collapse_edges[edge_type];
					}
					if (!(edge_path.includes("["))){edge_path += "[0_0]";}
					tid_parts = edge_path.split("[");
					src_trg = tid_parts[1].split("_");
					src = src_trg[0];
					trg = src_trg[1].replace(/\]/,'');
					if (trg=="0"){trg=fields[0];}  // single token target, ID 0 = this line
					if (src=="0"){src=tid_parts[0];}  // single token source, ID = "sent-wordnum", e.g. 5-3 for sent 5 token 3
					edges.push([src,trg,edge_type]);
				}
			}
		} else if (line.includes('#T_SP=webanno.custom')){
			let parts = line.split("|");
			if (parts.length > 2){
				parts = parts.slice(2,parts.length)
				for (var key of parts){
					anno_keys.push(key);
				}
			}
		}
	}
	
	
	let anno_opts = "";
	let val_opts = "";
	for (var anno_key of anno_keys){
		anno_opts += '<option value="'+anno_key+'">'+anno_key+'</option>\n';
	}
	$("#sel_anno_key").html(anno_opts);

	let ent2div = {};  // maps webanno ids to div ids
	for (var e_id in e2tok){
		e_type = e2type[e_id];
		tok_span = e2tok[e_id];
		let new_ent = add_entity(tok_span,null,true);
		if (e_id in e2annos) {
			new_ent.annos = e2annos[e_id];
		}
		change_entity(e_type);
		ent2div[e_id] = new_ent.div_id;
	}
	
	var grouping;
	if (edges.length>0){
		let etype_counts = {};
		let max_group = 1;
		grouping = {};
		for (var e of edges){
			src = e[0]; trg = e[1]; etype = e[2];
			src = (src.includes("-") ? senttok2globaltok[src] + "-" + senttok2globaltok[src] :ent2div[src]);  
			trg = (trg.includes("-") ? senttok2globaltok[trg] + "-" + senttok2globaltok[trg] : ent2div[trg]);  
			if (!(etype in grouping)){grouping[etype] = {};}
			if (!(etype in etype_counts)){etype_counts[etype] = 0;}
			etype_counts[etype]++;
			
			let found = false;
			for (var group in grouping[etype]){
				if (grouping[etype][group].includes(src)){
					old_group = parseInt(entities[trg].groups[etype]);
					if (old_group!=0){
						for (var div_id in entities){
							e = entities[div_id];
							if (e.groups[etype] == old_group){
								assign_group(e, etype, group);
							}
						}
					}
					assign_group(entities[trg], etype, group);
					grouping[etype][group].push(trg);
					found=true;
				}
				else if (grouping[etype][group].includes(trg)){
					let old_group = parseInt(entities[src].groups[etype]);
					if (old_group!=0){
						for (var ent_id in entities){
							e = entities[ent_id];
							if (e.groups[etype] == old_group){
								assign_group(e, etype, group);
							}
						}
					}
					assign_group(entities[src], etype, group);
					grouping[etype][group].push(src);
					found=true;
				}
			}
			if (found){continue};
			
			// no match found, need a new group
			assign_group(entities[src], etype, max_group);
			assign_group(entities[trg], etype, max_group);
			grouping[etype][max_group] = [src,trg];
			max_group++;
		}
		let max_type = Object.keys(etype_counts).reduce((a, b) => etype_counts[a] > etype_counts[b] ? a : b);
		let sel_opts = '<option value="entities">entity types</option>\n';
		for (var etype in grouping){
			color_modes.add(etype);
			sel_opts += '<option value="'+etype+'"';
			if (max_type == etype){ sel_opts += ' selected="selected"';}
			sel_opts += '>' + etype + '</option>\n';
		}
		$("#color_mode").html(sel_opts);
	}
	
	if (!("bridge" in grouping)) { // TODO: read from config
		grouping["bridge"] = {0:[]};
		groups["bridge"] = {0:[]};
	}

	set_entity_classes();
	init_doc();
}

function read_tt(data, config){

	// set tok to an SGML attribute name to use markup instead of TT plain text tokens as words
	default_conf = {"span_tag": DEFAULT_SGML_SPAN_TAG, "span_attr": DEFAULT_SGML_SPAN_ATTR, "sent":DEFAULT_SGML_SENT_TAG, "tok": DEFAULT_SGML_TOK_ATTR,
								"entity_annos":"infstat:auto|giv|acc|new|split"};
	
	group_info = [];
	anno_keys = [];
	anno_values = {};

	if (typeof config == "undefined"){
		config = {};
	}
	for (var setting  in default_conf){
		if (!(setting in config)){
			config[setting] = default_conf[setting];
		}
	}

	import_annos = {};
	default_annos = {};
	for (var anno of config["entity_annos"].split(";")){
		let anno_parts = anno.split(":");
		import_annos[anno_parts[0]] = anno_parts[1].split("|");
		anno_values[anno_parts[0]] = new Set(anno_parts[1].split("|"));
		default_annos[anno_parts[0]] = anno_parts[1].split("|")[0];
		anno_keys.push(anno_parts[0]);
	}

	if (config["tok"].toLowerCase()=="none"){config["tok"]=null;}

	$("#selectable").html("");  // Clear editor
	// Clear data model
	entities = {};
	toks2entities = {};
	tokens = {};
	groups = {};
	
	groups["bridge"] = {0:[]};  // TODO: read from config

	data = data.replace(/%%quot%%/g,'"').replace(/%%lt%%/g,"<").replace(/%%gt%%/g,">").replace(/\\n/g,"\n");
	data = $.trim(data);
	lines = data.split("\n");
	sent = 1;
	tid= 1;
	toknum_in_sent = 1;
	e2tok = {};
	e2type = {};
	e2groups = {};
	new_sent = true;
	span_buffer = [];
	anno_buffer = {};
	all_annos = {};
	sent_tooltip = '';

	tok_array = [];

	for (var line of lines){

		if (line.startsWith("<") && line.endsWith(">")){ // tag
			if (line.startsWith('<'+config["sent"]+" ") && line.includes("=")){  // sentence opening tag with attribute - use as sentence title tooltip
				find = '="([^"]*)"'; // catch first attribute
				m =  new RegExp(find);
				sent_tooltip = line.match(m)[1];
			}
			if (!(line.startsWith("</"))){ // opening tag
				if (line.startsWith('<'+config["span_tag"])  && line.includes(' ' + config["span_attr"] + '="')){ // only process target tags
					find = ' ' + config["span_attr"] + '="([^"]*)"';
					m =  new RegExp(find);
					span_type = line.match(m)[1];
					span_info = {"start": tid, "type": span_type};
					span_buffer.push(span_info);
				}
				for (var a in import_annos){
					if (line.includes(' ' + a +'=')){
						m =  new RegExp(' ' + a + '="([^"]*)"');
						anno_val = line.match(m)[1];
						m =  new RegExp(/<([^\s]+)/);
						elem = line.match(m)[1];
						if (!(elem in anno_buffer)){anno_buffer[elem] = [];}
						anno_buffer[elem].push({"start":tid,"key":a, "val":anno_val});
					}
				}
				if (line.includes(' group:')){  // coref/other group information is available
					group_info = [];
					var regex = / group:([^=]+)="([^"]+)"/g;
					match = regex.exec(line);
					while (match != null) {
					  group_info.push(match[1] + "=" + match[2]);
					  if (!(match[1] in groups)){
						  groups[match[1]] = {0:[]};
					  }
					  match = regex.exec(line);
					}
					if (group_info.length>0){
						// apply to most recent span
						existing_groups = [];
						if ("groups" in span_buffer[span_buffer.length-1]){
							existing_groups = span_buffer[span_buffer.length-1]["groups"].split(">");
						}
						span_buffer[span_buffer.length-1]["groups"] = group_info.concat(existing_groups).join(">");
						//span_info["groups"] = group_info.join(">");
					}
				}
			} else if (line.startsWith('</'+config["span_tag"]+">")) { // closing tag
				queue = span_buffer.pop();
				span_toks = Array.from(range(parseInt(queue["start"]), tid));
				e_id =  queue["start"].toString() + "-" + (tid-1).toString();
				e2tok[e_id] = span_toks;
				e2type[e_id] = queue["type"];
				if ("groups" in queue){
					sgml_groups = queue["groups"].split(">");
					e2groups[e_id] = {};
					for (var g of sgml_groups){
						gtype = g.split("=")[0];
						color_modes.add(gtype);
						groups[gtype] = {0:[]};  // make sure group type is initialized
						gval = parseInt(g.split("=")[1]);
						e2groups[e_id][gtype] = gval;
					}
				}
			} else if (line.startsWith('</'+config["sent"]+">")){  // sentence has ended
				sent += 1;
				toknum_in_sent = 1;
				new_sent = true;
			} else if (line.startsWith('</')){ // a key-value annotation has possibly closed
				elem = line.replace(/[</>]/g,'');
				if (elem in anno_buffer){
					if (anno_buffer[elem].length > 0){
						last_anno = anno_buffer[elem].pop();
						anno_span = last_anno["start"] + "-" +(tid-1);
						if (! (anno_span in all_annos)){all_annos[anno_span] = [];}
						all_annos[anno_span].push({key: last_anno["key"], val: last_anno["val"]});
						if (!(last_anno["key"] in anno_values)) {anno_values[last_anno["key"]] = new Set();}
						anno_values[last_anno["key"]].add(last_anno["val"]);
					}
				}
			}
			if (config["tok"] != null){
				if (line.includes(' ' + config["tok"] + '="')){ // only process target tags
					find = ' ' + config["tok"] + '="([^"]*)"';
					m =  new RegExp(find);
					word = line.match(m)[1];
					tok = new Token(tid.toString(), toknum_in_sent, word,new_sent,sent,sent_tooltip);
					sent_tooltip = "";
					tokens[tid.toString()] = tok;
					tok_array.push(make_token_div(tok));
					tid += 1;
					toknum_in_sent += 1;
					new_sent = null;
				}
			}
		}	else if (config["tok"] == null) { // not markup, and we are looking for plain tokens
			word = $.trim(line);
			tok = new Token(tid.toString(), toknum_in_sent, word,new_sent,sent,sent_tooltip);
			sent_tooltip = "";
			tokens[tid.toString()] = tok;
			tok_array.push(make_token_div(tok));
			tid += 1;
			toknum_in_sent += 1;
			new_sent = null;
		}
	}
	
	// Create token divs
	$("#selectable").append(tok_array.join("\n\t\t"));
	
	// Add entities
	for (var mode of color_modes){
		if (!(mode in groups) && mode != "entities"){ groups[mode] = {};}
	}
	for (var e_id in e2tok){
		e_type = e2type[e_id];
		tok_span = e2tok[e_id];
		new_entity = add_entity(tok_span,null,true);
		if (e_id in all_annos){
			for (var a of all_annos[e_id]){
				new_entity.annos[a["key"]] = a["val"];
			}
		} else{
			for (var a in default_annos){
				new_entity.annos[a] = default_annos[a];
			}
		}
		change_entity(e_type);
		for (var m of color_modes){  // make sure this entity is at least in group 0 of each group type
			if (m != "entities"){
				assign_group(new_entity,m,0);
			}
		}
		if (e_id in e2groups){
			new_entity.groups = {...new_entity.groups, ...e2groups[e_id]}; // update groups object
			for (var gtype in e2groups[e_id]){
				let gid = e2groups[e_id][gtype];
				assign_group(new_entity,gtype,gid);
			}
		} 
	}

	// set up additional key-value anno choosers
	anno_opts = "";
	val_opts = "";
	for (var anno_key in import_annos){
		anno_opts += '<option value="'+anno_key+'">'+anno_key+'</option>\n';
	}
	$("#sel_anno_key").html(anno_opts);

	// set up color modes
		sel_opts = '<option value="entities" selected="selected">entity types</option>\n';
	for (var m of color_modes){
		if (m != "entities"){
			sel_opts += '<option value="'+m+'">' + m + '</option>\n';
		}
	}
	$("#color_mode").html(sel_opts);

	set_entity_classes();
	init_doc();
}

function show_import() {
    $('#import_dialog').find('textarea').val(''); // clear textarea on modal open
    $("#import_dialog").dialog("option", "title", "Loading....").dialog("open");
    $("span.ui-dialog-title").text('Import data');
}

function show_export() {
    $('#export_dialog').find('textarea').val(''); // clear textarea on modal open
    $("#export_dialog").dialog("option", "title", "Loading....").dialog("open");
    $("span.ui-dialog-title").text('Export data');
} 

function show_annotation(e) {
    //$('#annotation_dialog').find('textarea').val(''); // clear textarea on modal open
	let div_id = $(this).attr("id");
	document.getElementById("active_entity").value = div_id;
	/*ent = entities[div_id];
	active_anno = $("#sel_anno_key").val();
	if (active_anno in ent.annos){
		$("#sel_anno_value").val(ent.annos[active_anno]);
	}*/

    $("#annotation_dialog").dialog("option", "title", "Loading....").dialog("open");
    $("span.ui-dialog-title").text('Annotate entity');
	select_anno_key();
	e.stopPropagation();
	
}

function get_identities(){
	let identities = $(window.frameElement).contents().find("#DOC_ENTITY_LIST").val();
	let lookup = {};
	for (var row of identities.split("|")){
		let parts = row.split("+");
		lookup[parts[0].replace(/%%quot%%/g,'"') + "+" + parts[1]] = parts[2].replace(/%%quot%%/g,'"')
	}
	for (var div_id in entities){
		ent = entities[div_id];
		let ent_text = ent.get_text();
		ent.identity = "_";
		if (ent_text + "+" + ent.type in lookup){
			let ident = lookup[ent_text + "+" + ent.type];
			if (ident.toLowerCase() == "pass" || ident.toLowerCase() == "(pass)"){continue;}
			ent.identity = lookup[ent_text + "+" + ent.type].replace(/ /g,"_").replace("|","%7C");
		}
	}
}

function write_webanno(config){
	
	// TODO: move this to config
	// PRODUCTION SETTING AZ
	export_identities = false;

	function postprocess_annos(ent, instructions, isfirst){
		// transform an entity's additional key-value annotations based on initial/non-initial chain position and instructions
		for (var inst of instructions){
			if ((isfirst && inst[0] =="nonfirst")||(inst[0] == "first" && !isfirst)){continue;}
			if (!(inst[2] in ent.annos)){continue;}
			if (ent.annos[inst[2]] != inst[3]){continue;}
			if (inst[1]!=null){
				re = new RegExp(inst[1]);
				if (!(re.test(ent.get_text().toLowerCase()))){ continue;}
			}
			ent.annos[inst[2]] = inst[4];
		}
	}
	
	if (config==null){
		config = {fountain_edge_types:"bridge",
						postprocess: {  // each instruction: edgetype: [[first or not in chain, string filter (lowered), anno key, old anno val, new anno val], ...]
							"bridge": [ ["nonfirst","^(i|you|your|yours|she|her|hers|he|him|his|it|its|we|us|our|ours|them|they|their|theirs)$","infstat","auto","giv"], ["nonfirst",null,"infstat","auto","acc"]],
							"coref": [ ["nonfirst",null,"infstat","auto","giv"],["first",null,"infstat","auto","new"]]
						}
						};
		}  // edge types which link to first member of group, instead of chaining

	output = [];
	buffer = [];
	toknum = 1;
	e_ids = {};
	webanno2div = {};
	chars = 0;
	max_ent_id = 1;
	// preamble
	header = '#FORMAT=WebAnno TSV 3.2\n#T_SP=webanno.custom.Referent|entity';
	extra_fields = '';
	for (var anno_key of anno_keys){
		header += "|" + anno_key;
		extra_fields += "_\t";
	}
	if (export_identities){  // for NER identities we need to collect the latest identities for each entities
		get_identities();
		header += "|identity";
	}

	if (color_modes.size > 1){
		header += "\n#T_RL=webanno.custom.Coref|type|BT_webanno.custom.Referent";
		extra_fields += "_\t_\t";  // columns to store edge types and paths
	}
	output.push(header += "\n");
	
	// Make sure we have no singleton groups
	for (var gtype in groups){
		for (var g_id in groups[gtype]){
			if (parseInt(g_id) == 0){continue;}
			if (groups[gtype][g_id].length==1){
				assign_group(entities[groups[gtype][g_id][0]],gtype,0);
			}
		}
	}
	
	// first pass - build tokens and entities
	sent = '#Text=';
	for (var t in tokens){
		tok = tokens[t];
		if (tok.sent && sent != '#Text='){
			output.push('');
			output.push($.trim(sent));
			output.push(buffer.join("\n"));
			sent = '#Text=';
			buffer = [];
			toknum = 1;
		}
		anno_array = [];
		anno_string = '';
		if (tok.tid in toks2entities){
			overlapped_ents = toks2entities[tok.tid];
			sorted_keys = Object.keys(overlapped_ents).sort(function(a,b){return overlapped_ents[b].length-overlapped_ents[a].length;});
			for (var span_id of sorted_keys){
				e = overlapped_ents[span_id];
				if (!(e.div_id in e_ids)){
					e_ids[e.div_id] = max_ent_id;
					webanno2div[max_ent_id] = e.div_id;
					max_ent_id +=1;
				}
				anno_string += e.type;
				if (e.length > 1 || true){ // Remove true to reproduce older WebAnno behavior with no ID for single token spans
					anno_string += "[" + e_ids[e.div_id] + "]";
				}
				anno_array.push(anno_string);
				anno_string = '';
			}
			anno_string = anno_array.join("|");
		}
		if (anno_string==''){
			anno_string = '_\t';
		} else{
			anno_string += "\t";
		}
		if (tok.sentnum == null){
			let b=4;
		}
		line = [tok.sentnum.toString() + "-" + toknum.toString() + "\t" + chars.toString() + "-" + 
					(chars+ tok.word.length).toString()+"\t" + tok.word + "\t" +
					anno_string + extra_fields];
		buffer.push(line);
		sent += tok.word + " ";
		chars += tok.word.length + 1;
		toknum+=1;
		
	}
	output.push('');
	output.push($.trim(sent));
	output.push(buffer.join("\n"));
	output = output.join("\n");
	
	first_in_component = {};
	
	// PRODUCTION SETTING AZ
	single_token_id_style = false;
	// second pass - add annotations and edges
	if (anno_keys.length>0 || color_modes.size > 1){
		if (color_modes.size >1){
			// reset 'next' attribute of all entities
			for (var div_id in entities){entities[div_id].next = {};}
			// create chains of antecedents
			for (var gtype in groups){
				if (!(gtype in first_in_component)) {first_in_component[gtype] = {};}
				for (var group_num in groups[gtype]){
					// sort by entity start and reverse end
					if (parseInt(group_num)==0){continue;}
					div_ids = groups[gtype][group_num];
					ents_to_sort = [];
					for (var div_id of div_ids){
						ents_to_sort.push(entities[div_id]);
					}
					ents_to_sort.sort(function(a, b){if (a.start == b.start){return b.end - a.end} return a.start - b.start});
					reverse_fountain = false;
					for (var ent of ents_to_sort){
						if ("infstat" in ent.annos){
							if (ent.annos["infstat"]=="split"){
								reverse_fountain = true;
							}
						}
					}
					if (!(config["fountain_edge_types"].includes(gtype))){  // this is a chain-style edge annotation, a <- b <- c...
						for (var i in range(0,ents_to_sort.length-1)){
							// make an edge specification pointing from next member of chain
							i = parseInt(i);
							ent = ents_to_sort[i];
							next_ent = ents_to_sort[i+1];
							first_in_component[gtype][next_ent.div_id] = false;
							next_start = tokens[next_ent.start].sentnum + "-" + tokens[next_ent.start].toknum_in_sent;
							this_webanno_id = (ent.length > 1 || !(single_token_id_style) ? e_ids[ent.div_id] : "0");
							next_webanno_id = (next_ent.length > 1 || !(single_token_id_style) ? e_ids[next_ent.div_id] : "0");
							id_part = "[" + next_webanno_id.toString() + "_" + this_webanno_id.toString()+"]";
							if (id_part == "[0_0]"){id_part = "";}  // edges between single token entities are implicit in webanno, with only the source token number indicating edge source
							edge = next_start + id_part;  // e.g. 3-15[20_18]  meaning an edge from entity 20 which starts at token 3-15, to current entity 18
							ent.next[gtype]  = edge;
						}
					}
					else if (reverse_fountain){
						fountain_edges = [];
						ents_to_sort = ents_to_sort.reverse();
						ent = ents_to_sort[0];  // connect the last entity in the group to all others
						for (var i in range(0,ents_to_sort.length-1)){
							// make an edge specification pointing from next member of chain
							i = parseInt(i);
							next_ent = ents_to_sort[i+1];
							if (!(i==ents_to_sort.length-1)){
								first_in_component[gtype][ents_to_sort[i].div_id] = false;
							}
							next_start = tokens[ent.start].sentnum + "-" + tokens[ent.start].toknum_in_sent;
							this_webanno_id = (ent.length > 1 || !(single_token_id_style) ? e_ids[ent.div_id] : "0");
							next_webanno_id = (next_ent.length > 1 || !(single_token_id_style) ? e_ids[next_ent.div_id] : "0");
							id_part = "[" + this_webanno_id.toString() + "_" + next_webanno_id.toString()+"]";
							if (id_part == "[0_0]"){id_part = "";}  // edges between single token entities are implicit in webanno, with only the source token number indicating edge source
							edge = next_start + id_part;  // e.g. 3-15[20_18]  meaning an edge from entity 20 which starts at token 3-15, to current entity 18
							//fountain_edges.push(edge);
							next_ent.next[gtype]  = edge;
						}
					}
					else{  // this is a fountain-style link anno: a <- b, a <- c, a <- d ...
						fountain_edges = [];
						ent = ents_to_sort[0];  // connect everything to the first entity in the group
						for (var i in range(0,ents_to_sort.length-1)){
							// make an edge specification pointing from next member of chain
							i = parseInt(i);
							next_ent = ents_to_sort[i+1];
							first_in_component[gtype][next_ent.div_id] = false;
							next_start = tokens[next_ent.start].sentnum + "-" + tokens[next_ent.start].toknum_in_sent;
							this_webanno_id = (ent.length > 1 || !(single_token_id_style) ? e_ids[ent.div_id] : "0");
							next_webanno_id = (next_ent.length > 1 || !(single_token_id_style) ? e_ids[next_ent.div_id] : "0");
							id_part = "[" + next_webanno_id.toString() + "_" + this_webanno_id.toString()+"]";
							if (id_part == "[0_0]"){id_part = "";}  // edges between single token entities are implicit in webanno, with only the source token number indicating edge source
							edge = next_start + id_part;  // e.g. 3-15[20_18]  meaning an edge from entity 20 which starts at token 3-15, to current entity 18
							fountain_edges.push(edge);
						}
						ent.next[gtype]  = fountain_edges.join("|");
					}
				}
			}
		}
		
		// Postprocess annotations if needed
		if ("postprocess" in config){
			for (var gtype in config["postprocess"]){
				if (gtype in groups){
					for (var group_num in groups[gtype]){
						div_ids = groups[gtype][group_num];
						ents_to_process = [];
						for (var div_id of div_ids){
							isfirst = true;
							if (gtype in first_in_component){
								if (div_id in first_in_component[gtype]){
									isfirst = first_in_component[gtype][div_id] ;
								}
							}
							postprocess_annos(entities[div_id], config["postprocess"][gtype], isfirst)
						}
					}
				}
			}
		}
		
		lines = output.split("\n");
		edge_types = [];
		for (var m of color_modes){
			if (m!="entities"){edge_types.push(m);}
		}
		output = [];
		
		for (var line of lines){
			anno_holder = Array.apply(null, Array(anno_keys.length)).map(function () {return [];});
			edge_holder = [[],[]];  // one array for edge types, one for edge links
			ent_identities = [];
			if (line.includes("\t")){
				fields = line.split("\t");
				ents = fields[3].split("|");
				for (var e of ents){
					if (e == "_"){ // no entity for this line, just append underscores as needed
						for (var i in anno_keys){
							fields[4+parseInt(i)] = "_";
						}
						for (var j in edge_types){
							fields[4+parseInt(i)+parseInt(j)] = "_";
						}
					} else{
						e = e.replace(/.*\[/,'').replace(/\].*/,'');
						div_id = webanno2div[e];
						this_ent = entities[div_id];
						for (var i in anno_keys){
							anno_key = anno_keys[i];
							if (anno_key in this_ent.annos){
								anno_holder[i].push(this_ent.annos[anno_key]+"["+e+"]");
							} 
						}
						if (this_ent.identity != "_"){
							ent_identities.push(this_ent.identity+"["+e+"]")
						}
						for (var e_type of color_modes){
							if (e_type in this_ent.next){
								edge_holder[0].push(e_type);
								edge_holder[1].push(this_ent.next[e_type]);
								delete this_ent.next[e_type];  // Every entity only realizes edge annotation on its first token
							}
						}
					}
				}
				for (var i in anno_holder){
					if (anno_holder[i].length>0){
						fields[4+parseInt(i)] = anno_holder[i].join("|");
					}
				}
				if (export_identities){
					if (ent_identities.length==0){
						ent_identities="_";
					}else{
						ent_identities = ent_identities.join("|");
					}
					fields.splice(4+anno_holder.length, 0, ent_identities);
				}
				if (edge_holder[1].length > 0){
					edge_labels = [];
					fields[fields.length-2] = edge_holder[1].join("|");
					for (var edge_idx in edge_holder[1]){
						edge_idx = parseInt(edge_idx);
						num_edges = (edge_holder[1][edge_idx].split("|").length)
						for (let edge_num = 0; edge_num < num_edges; edge_num++){
							edge_labels.push(edge_holder[0][edge_idx]);
						}
						fields[fields.length-3]  = edge_labels.join("|");
					}
				} else{ // no edge annotations
					fields[fields.length-3] = "_";
					fields[fields.length-2] = "_";
				}
				output.push(fields.join("\t"));
			}
			else{output.push(line);}
		}
		output = output.join("\n").trim() + "\t" + "\n";
	}
	return output;
}

function reset_coref_groupids(){ // "entities" and "groups"
	new_groups = {};
	group_mapping = {};
	group_id = 1;
	for (var ent_id in entities){
		ent = entities[ent_id];
		cur_coref_group = ent.groups.coref;

		if (cur_coref_group in group_mapping){
			new_groups[ent_id] = group_mapping[cur_coref_group];
		} else {
			if (cur_coref_group == '0'){
				new_groups[ent_id] = group_id;
			} else {
				group_mapping[cur_coref_group] = group_id;
				new_groups[ent_id] = group_mapping[cur_coref_group];
			}
			group_id ++;
		}
	}
	return new_groups;
}

function write_conllu(){
	output = [];
	buffer = [];
	toknum = 1;
	e_ids = {};
	webanno2div = {};
	chars = 0;
	max_ent_id = 1;
	sent_id = 1;

	new_coref_groups = reset_coref_groupids();

	// reset 'next' attribute of all entities
	for (var div_id in entities){entities[div_id].next = {};}
	// create chains of antecedents
	for (var gtype in groups){
		for (var group_num in groups[gtype]){
			// sort by entity start and reverse end
			if (parseInt(group_num)==0){continue;}
			div_ids = groups[gtype][group_num];
			ents_to_sort = [];
			for (var div_id of div_ids){
				ents_to_sort.push(entities[div_id]);
			}
			ents_to_sort.sort(function(a, b){if (a.start == b.start){return b.end - a.end} return a.start - b.start});
			for (var i in range(0,ents_to_sort.length-1)){
				// make an edge specification pointing from next member of chain
				i = parseInt(i);
				ent = ents_to_sort[i];
				next_ent = ents_to_sort[i+1];
				next_start = tokens[next_ent.start].sentnum + "-" + tokens[next_ent.start].toknum_in_sent;
				// this_webanno_id = (ent.length > 1 ? e_ids[ent.div_id] : "0");
				// next_webanno_id = (next_ent.length > 1 ? e_ids[next_ent.div_id] : "0");
				// id_part = "[" + next_webanno_id.toString() + "_" + this_webanno_id.toString()+"]";
				// if (id_part == "[0_0]"){id_part = "";}  // edges between single token entities are implicit in webanno, with only the source token number indicating edge source
				edge = next_ent;  // e.g. 3-15[20_18]  meaning an edge from entity 20 which starts at token 3-15, to current entity 18
				ent.next[gtype] = edge;

				ante_edge = ent;
				next_ent.ante[gtype] = ante_edge;
			}
		}
	}

	output.push('# newdoc id = 001');

	sent = '# text = ';
	for (var t in tokens){
		tok = tokens[t];
		if (sent != '# text = ' && tok.toknum_in_sent == 1){
			if (tok.sent != 2) {
				output.push('');
			}
			output.push('# sent_id = 001-' + sent_id);
			output.push($.trim(sent));
			output.push(buffer.join("\n"));
			sent = '# text = ';
			buffer = [];
			toknum = 1;
			sent_id ++;
		}

		anno_array = [];
		bridge_array = [];
		anno_string = '';
		bridge_string = '';
		if (tok.tid in toks2entities){
			overlapped_ents = toks2entities[tok.tid];
			for (var span_id in overlapped_ents){
				e = overlapped_ents[span_id];
				if (!(e.div_id in e_ids)){
					e_ids[e.div_id] = max_ent_id;
					webanno2div[max_ent_id] = e.div_id;
					max_ent_id +=1;
				}
				tok_id = tok.tid;
				coref_type = '';
				identity = '';
				bridge_string = '';

				// Deal with coreference
				coref_g = e.groups.coref;
				if (coref_g != '0'){
					identity = 'coref';
				} else {
					identity = 'sgl';
				}

				if (tok_id == e.start == e.end){ // entity=()
					anno_string += '(' + e_ids[e.div_id] + '-' + e.type + '-' + e.annos.infstat + '-' + new_coref_groups[e.div_id] + '-' + identity + ')';
				} else if (tok_id == e.start){ // entity=(
					anno_string += '(' + e_ids[e.div_id] + '-' + e.type + '-' + e.annos.infstat + '-' + new_coref_groups[e.div_id] + '-' + identity;
				} else if (tok_id == e.end){ // entity=)
					anno_string += e_ids[e.div_id] + ')';
				}

				// Deal with bridgings
				if (tok_id == e.start && 'bridge' in e.ante){
					ante_e = e.ante.bridge;
					ante_e_id = e_ids[ante_e.div_id];
					bridge_string += ante_e_id.toString() + '<' + e_ids[e.div_id];
					bridge_array.push(bridge_string);
				}
				// find the beginning and ending of the entity

				// anno_string += e.type;
				// if (e.length > 1 || true){ // Remove true to reproduce older WebAnno behavior with no ID for single token spans
				// 	anno_string += e_ids[e.div_id];
				// }
				anno_array.push(anno_string);
				anno_string = '';
				bridge_string = '';
			}
			anno_string = anno_array.join("");
			if (bridge_array.length != 0) {
				bridge_string = bridge_array.join(",");
			} else {
				bridge_string = '';
			}
		}
		if (bridge_string != ''){
			bridge_string = 'Bridge:' + bridge_string + '|';
		}
		if (anno_string==''){
			anno_string = '_';
		} else{
			anno_string = bridge_string + 'Entity=' + anno_string;
			anno_string += "";
		}
		line = [toknum.toString() + "\t" + tok.word + "\t_\t_\t_\t_\t_\t_\t_\t" + anno_string];
		buffer.push(line);
		sent += tok.word + " ";
		chars += tok.word.length + 1;
		toknum+=1;

	}

	if (tok.sent != 1) {
		output.push('');
	}
	output.push('# sent_id = 001-' + sent_id);
	output.push($.trim(sent));
	output.push(buffer.join("\n"));
	output = output.join("\n");

	return output;
}

function write_tt(sent_tag){

	output = [];
	buffer = [];
	open_spans = [];
	prev_sent = 0;
	first_sent = true;
	sent = '#Text=';
	for (var t in tokens){
		tok = tokens[t];
		
		// close all needed spans
		if (tok.tid in toks2entities){
			overlapped_ents = toks2entities[tok.tid];
		} else{
			overlapped_ents = [];
		}
		to_close = []
		keys = Array.from(open_spans);
		for (var span_id of keys){
			if (!(span_id in overlapped_ents)){ // open span no longer extends to this token
				output.push('</entity>');
				var index = open_spans.indexOf(span_id); // remove id from open_spans
				if (index !== -1) open_spans.splice(index, 1);
			}
		}

		// open sent if needed 
		if (tok.sent){
			if (!(first_sent)){
				output.push("</"+sent_tag+">")
			}
			output.push("<"+sent_tag+">")
			first_sent = false;
		}

		// open all needed spans
		if (tok.tid in toks2entities){
			overlapped_ents = toks2entities[tok.tid];
			//overlapped_ents = Object.values(overlapped_ents).sort((a, b) => a.length < b.length);
			sorted_ids = Object.keys(overlapped_ents).sort((a, b) => overlapped_ents[b].end - overlapped_ents[a].end);
			for (var span_id of sorted_ids){
				if (open_spans.includes(span_id)){
					continue;
				}
				e = overlapped_ents[span_id];
				open_spans.push(span_id);
				entity_string = '<entity entity="'+e.type+'"';
				for (var a in e.annos) {
					if (e.annos[a] != ""){
						entity_string += ' ' + a + '="'+e.annos[a].toString()+'"'; 
					}
				}
				for (var gtype in e.groups){
					if (e.groups[gtype] != 0){
						entity_string += ' group:' + gtype + '="'+e.groups[gtype].toString()+'"'; 
					}
				}
				entity_string += '>';
				output.push(entity_string);
			}
		}
		
		// print the token
		output.push(tok.word);
		
	}
	for (var span_id of open_spans){
		output.push('</entity>');
	}

	output.push('</' + sent_tag + '>');
	return output.join("\n");
}

function list_entities(pos_list, pos_filter){
	pos_list = pos_list.replace("&quot;",'"').split("|");
	pos_filter = pos_filter.split("|");
	list_groups = {}
	seen = {};
	right_headed = true;
	for (var i of range(1,Object.keys(tokens).length+1)){
		pos = pos_list[i-1].replace("&#124;","|");
		if (pos_filter.includes(pos)){ // this is a tageted pos
			if (!(i in toks2entities)){continue;}
			covering = toks2entities[i];
			head = tokens[i].word;
			if (Object.keys(covering).length>0){
				ks = Object.keys(covering).sort(function(a, b) { return covering[a].length - covering[b].length });
				smallest = covering[ks[0]];
				if (!(smallest.type in list_groups)){
					list_groups[smallest.type] = [];
					seen[smallest.type] = [];
				}
				entity_spanned_text = smallest.get_text().replace(/&amp;/g,"&");
				if (!(seen[smallest.type].includes(entity_spanned_text))){
					list_groups[smallest.type].push(entity_spanned_text+"|||"+head);
					seen[smallest.type].push(entity_spanned_text);
				} else{
					if (right_headed){ // replace existing entity head with new head candidate further to the right
						new_list = [];
						for (var entry of list_groups[smallest.type]){
							if (entry.split("|||")[0] != entity_spanned_text){
								new_list.push(entry);
							}
						}
						list_groups[smallest.type] = new_list;
						list_groups[smallest.type].push(entity_spanned_text+"|||"+head);
					}
				}
			}
		}
	}
	
	return list_groups;
}

export function entities_read_conllu(entities_conllu){
	read_webanno(`#FORMAT=WebAnno TSV 3
#T_SP=webanno.custom.Referent|entity|infstat
#T_RL=webanno.custom.Coref|type|BT_webanno.custom.Referent


#Text=Greek court rules worship of ancient Greek deities is legal
1-1	0-5	Greek	event[1]|organization[2]	new[1]|new[2]	coref|coref	3-1[6_1]|3-1[7_2]	
1-2	6-11	court	event[1]|organization[2]	new[1]|new[2]	_	_	
1-3	12-17	rules	event[1]	new[1]	_	_	
1-4	18-25	worship	event[1]|abstract[3]	new[1]|new[3]	bridge|bridge	3-6[8_3]|3-8[9_3]	
1-5	26-28	of	event[1]|abstract[3]	new[1]|new[3]	_	_	
1-6	29-36	ancient	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	coref	6-16[20_4]	
1-7	37-42	Greek	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	_	_	
1-8	43-50	deities	event[1]|abstract[3]|abstract[4]	new[1]|new[3]|new[4]	_	_	
1-9	51-53	is	event[1]	new[1]	_	_	
1-10	54-59	legal	event[1]	new[1]	_	_	

#Text=Monday , March 27 , 2006
2-1	60-66	Monday	time[5]	acc[5]	_	_	
2-2	67-68	,	time[5]	acc[5]	_	_	
2-3	69-74	March	time[5]	acc[5]	_	_	
2-4	75-77	27	time[5]	acc[5]	_	_	
2-5	78-79	,	time[5]	acc[5]	_	_	
2-6	80-84	2006	time[5]	acc[5]	_	_	

#Text=Greek court has ruled that worshippers of the ancient Greek religion may now formally associate and worship at archeological sites .
3-1	85-90	Greek	event[6]|organization[7]	giv[6]|giv[7]	coref	4-3[11_6]	
3-2	91-96	court	event[6]|organization[7]	giv[6]|giv[7]	_	_	
3-3	97-100	has	event[6]	giv[6]	_	_	
3-4	101-106	ruled	event[6]	giv[6]	_	_	
3-5	107-111	that	event[6]	giv[6]	_	_	
3-6	112-123	worshippers	event[6]|person[8]	giv[6]|acc[8]	coref	6-14[19_8]	
3-7	124-126	of	event[6]|person[8]	giv[6]|acc[8]	_	_	
3-8	127-130	the	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	coref	4-6[13_9]	
3-9	131-138	ancient	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-10	139-144	Greek	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-11	145-153	religion	event[6]|person[8]|organization[9]	giv[6]|acc[8]|acc[9]	_	_	
3-12	154-157	may	event[6]	giv[6]	_	_	
3-13	158-161	now	event[6]	giv[6]	_	_	
3-14	162-170	formally	event[6]	giv[6]	_	_	
3-15	171-180	associate	event[6]	giv[6]	_	_	
3-16	181-184	and	event[6]	giv[6]	_	_	
3-17	185-192	worship	event[6]	giv[6]	_	_	
3-18	193-195	at	event[6]	giv[6]	_	_	
3-19	196-209	archeological	event[6]|place[10]	giv[6]|new[10]	_	_	
3-20	210-215	sites	event[6]|place[10]	giv[6]|new[10]	_	_	
3-21	216-217	.	_	_	_	_	

#Text=Prior to the ruling , the religion was banned from conducting public worship at archeological sites by the Greek Ministry of Culture .
4-1	218-223	Prior	_	_	_	_	
4-2	224-226	to	_	_	_	_	
4-3	227-230	the	event[11]	giv[11]	_	_	
4-4	231-237	ruling	event[11]	giv[11]	_	_	
4-5	238-239	,	_	_	_	_	
4-6	240-243	the	event[12]|organization[13]	new[12]|giv[13]	coref|bridge	5-5[16_13]|5-3[0_12]	
4-7	244-252	religion	event[12]|organization[13]	new[12]|giv[13]	_	_	
4-8	253-256	was	event[12]	new[12]	_	_	
4-9	257-263	banned	event[12]	new[12]	_	_	
4-10	264-268	from	event[12]	new[12]	_	_	
4-11	269-279	conducting	event[12]	new[12]	_	_	
4-12	280-286	public	event[12]	new[12]	_	_	
4-13	287-294	worship	event[12]	new[12]	_	_	
4-14	295-297	at	event[12]	new[12]	_	_	
4-15	298-311	archeological	event[12]	new[12]	_	_	
4-16	312-317	sites	event[12]	new[12]	_	_	
4-17	318-320	by	_	_	_	_	
4-18	321-324	the	organization[14]	new[14]	_	_	
4-19	325-330	Greek	organization[14]	new[14]	_	_	
4-20	331-339	Ministry	organization[14]	new[14]	_	_	
4-21	340-342	of	organization[14]	new[14]	_	_	
4-22	343-350	Culture	organization[14]	new[14]	_	_	
4-23	351-352	.	_	_	_	_	

#Text=Due to that , the religion was relatively secretive .
5-1	353-356	Due	_	_	_	_	
5-2	357-359	to	_	_	_	_	
5-3	360-364	that	event	acc	_	_	
5-4	365-366	,	_	_	_	_	
5-5	367-370	the	organization[16]	giv[16]	coref	9-19[37_16]	
5-6	371-379	religion	organization[16]	giv[16]	_	_	
5-7	380-383	was	_	_	_	_	
5-8	384-394	relatively	_	_	_	_	
5-9	395-404	secretive	_	_	_	_	
5-10	405-406	.	_	_	_	_	

#Text=The Greek Orthodox Church , a Christian denomination , is extremely critical of worshippers of the ancient deities .
6-1	407-410	The	organization[17]	new[17]	coref|appos	8-1[30_17]|6-6[18_17]	
6-2	411-416	Greek	organization[17]	new[17]	_	_	
6-3	417-425	Orthodox	organization[17]	new[17]	_	_	
6-4	426-432	Church	organization[17]	new[17]	_	_	
6-5	433-434	,	_	_	_	_	
6-6	435-436	a	organization[18]	giv[18]	_	_	
6-7	437-446	Christian	organization[18]	giv[18]	_	_	
6-8	447-459	denomination	organization[18]	giv[18]	_	_	
6-9	460-461	,	_	_	_	_	
6-10	462-464	is	_	_	_	_	
6-11	465-474	extremely	_	_	_	_	
6-12	475-483	critical	_	_	_	_	
6-13	484-486	of	_	_	_	_	
6-14	487-498	worshippers	person[19]	giv[19]	bridge	7-3[22_19]	
6-15	499-501	of	person[19]	giv[19]	_	_	
6-16	502-505	the	person[19]|abstract[20]	giv[19]|giv[20]	coref	7-7[24_20]	
6-17	506-513	ancient	person[19]|abstract[20]	giv[19]|giv[20]	_	_	
6-18	514-521	deities	person[19]|abstract[20]	giv[19]|giv[20]	_	_	
6-19	522-523	.	_	_	_	_	

#Text=Today , about 100,000 Greeks worship the ancient gods , such as Zeus , Hera , Poseidon , Aphrodite , and Athena .
7-1	524-529	Today	time	acc	_	_	
7-2	530-531	,	_	_	_	_	
7-3	532-537	about	person[22]|abstract[23]	acc[22]|new[23]	coref	8-6[31_23]	
7-4	538-545	100,000	person[22]|abstract[23]	acc[22]|new[23]	_	_	
7-5	546-552	Greeks	person[22]	acc[22]	_	_	
7-6	553-560	worship	_	_	_	_	
7-7	561-564	the	abstract[24]	giv[24]	bridge|bridge|bridge|bridge|bridge	7-22[0_24]|7-19[0_24]|7-17[0_24]|7-15[0_24]|7-13[0_24]	
7-8	565-572	ancient	abstract[24]	giv[24]	_	_	
7-9	573-577	gods	abstract[24]	giv[24]	_	_	
7-10	578-579	,	_	_	_	_	
7-11	580-584	such	_	_	_	_	
7-12	585-587	as	_	_	_	_	
7-13	588-592	Zeus	person	acc	_	_	
7-14	593-594	,	_	_	_	_	
7-15	595-599	Hera	person	acc	_	_	
7-16	600-601	,	_	_	_	_	
7-17	602-610	Poseidon	person	acc	_	_	
7-18	611-612	,	_	_	_	_	
7-19	613-622	Aphrodite	person	acc	_	_	
7-20	623-624	,	_	_	_	_	
7-21	625-628	and	_	_	_	_	
7-22	629-635	Athena	person	acc	_	_	
7-23	636-637	.	_	_	_	_	

#Text=The Greek Orthodox Church estimates that number is closer to 40,000 .
8-1	638-641	The	organization[30]	giv[30]	_	_	
8-2	642-647	Greek	organization[30]	giv[30]	_	_	
8-3	648-656	Orthodox	organization[30]	giv[30]	_	_	
8-4	657-663	Church	organization[30]	giv[30]	_	_	
8-5	664-673	estimates	_	_	_	_	
8-6	674-678	that	abstract[31]	giv[31]	_	_	
8-7	679-685	number	abstract[31]	giv[31]	_	_	
8-8	686-688	is	_	_	_	_	
8-9	689-695	closer	_	_	_	_	
8-10	696-698	to	_	_	_	_	
8-11	699-705	40,000	_	_	_	_	
8-12	706-707	.	_	_	_	_	

#Text=Many neo-pagan religions , such as Wicca , use aspects of ancient Greek religions in their practice ; Hellenic polytheism instead focuses exclusively on the ancient religions , as far as the fragmentary nature of the surviving source material allows .
9-1	708-712	Many	organization[32]	acc[32]	ana|bridge	9-16[0_32]|9-7[0_32]	
9-2	713-722	neo-pagan	organization[32]	acc[32]	_	_	
9-3	723-732	religions	organization[32]	acc[32]	_	_	
9-4	733-734	,	_	_	_	_	
9-5	735-739	such	_	_	_	_	
9-6	740-742	as	_	_	_	_	
9-7	743-748	Wicca	organization	acc	_	_	
9-8	749-750	,	_	_	_	_	
9-9	751-754	use	_	_	_	_	
9-10	755-762	aspects	abstract[34]	new[34]	_	_	
9-11	763-765	of	abstract[34]	new[34]	_	_	
9-12	766-773	ancient	abstract[34]|organization[35]	new[34]|giv[35]	coref	9-25[38_35]	
9-13	774-779	Greek	abstract[34]|organization[35]	new[34]|giv[35]	_	_	
9-14	780-789	religions	abstract[34]|organization[35]	new[34]|giv[35]	_	_	
9-15	790-792	in	_	_	_	_	
9-16	793-798	their	organization	giv	_	_	
9-17	799-807	practice	_	_	_	_	
9-18	808-809	;	_	_	_	_	
9-19	810-818	Hellenic	organization[37]	acc[37]	_	_	
9-20	819-829	polytheism	organization[37]	acc[37]	_	_	
9-21	830-837	instead	_	_	_	_	
9-22	838-845	focuses	_	_	_	_	
9-23	846-857	exclusively	_	_	_	_	
9-24	858-860	on	_	_	_	_	
9-25	861-864	the	organization[38]	giv[38]	_	_	
9-26	865-872	ancient	organization[38]	giv[38]	_	_	
9-27	873-882	religions	organization[38]	giv[38]	_	_	
9-28	883-884	,	_	_	_	_	
9-29	885-887	as	_	_	_	_	
9-30	888-891	far	_	_	_	_	
9-31	892-894	as	_	_	_	_	
9-32	895-898	the	_	_	_	_	
9-33	899-910	fragmentary	_	_	_	_	
9-34	911-917	nature	_	_	_	_	
9-35	918-920	of	_	_	_	_	
9-36	921-924	the	abstract[39]	new[39]	_	_	
9-37	925-934	surviving	abstract[39]	new[39]	_	_	
9-38	935-941	source	abstract[39]	new[39]	_	_	
9-39	942-950	material	abstract[39]	new[39]	_	_	
9-40	951-957	allows	_	_	_	_	
9-41	958-959	.	_	_	_	_	
`);

}