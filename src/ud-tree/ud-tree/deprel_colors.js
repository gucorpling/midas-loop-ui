import distinctColors from "distinct-colors";

const index = {};
// To update, go to 
// https://universaldependencies.org/ext-dep-index.html
// https://universaldependencies.org/u/dep/index.html
// and execute:
// JSON.stringify(Array.from(document.querySelectorAll("a.doclink.doclabel")).map(x => x.innerText))
const deprels = ["nsubj","obj","iobj","csubj","ccomp","xcomp","obl","vocative","expl","dislocated","advcl","advmod","discourse","aux","cop","mark","nmod","appos","nummod","acl","amod","det","clf","case","conj","cc","fixed","flat","compound","list","parataxis","orphan","goeswith","reparandum","punct","root","dep","acl","acl:relcl","advcl","advmod","advmod:emph","advmod:lmod","amod","appos","aux","aux:pass","case","cc","cc:preconj","ccomp","clf","compound","compound:lvc","compound:prt","compound:redup","compound:svc","conj","cop","csubj","csubj:pass","dep","det","det:numgov","det:nummod","det:poss","discourse","dislocated","expl","expl:impers","expl:pass","expl:pv","fixed","flat","flat:foreign","flat:name","goeswith","iobj","list","mark","nmod","nmod:poss","nmod:tmod","nsubj","nsubj:pass","nummod","nummod:gov","obj","obl","obl:agent","obl:arg","obl:lmod","obl:tmod","orphan","parataxis","punct","reparandum","root","vocative","xcomp"]
const extendedDeprels = ["acl:adv","acl:attr","acl:cleft","acl:inf","acl:relat","acl:relcl","advcl:abs","advcl:cau","advcl:cleft","advcl:cmpr","advcl:cond","advcl:coverb","advcl:eval","advcl:lcl","advcl:lto","advcl:mcl","advcl:pred","advcl:relcl","advcl:sp","advcl:svc","advcl:tcl","advmod:arg","advmod:cau","advmod:comp","advmod:deg","advmod:det","advmod:df","advmod:emph","advmod:eval","advmod:foc","advmod:freq","advmod:lfrom","advmod:lmod","advmod:lmp","advmod:locy","advmod:lto","advmod:mmod","advmod:mode","advmod:neg","advmod:obl","advmod:que","advmod:tfrom","advmod:tlocy","advmod:tmod","advmod:to","advmod:tto","amod:att","amod:attlvc","amod:flat","appos:trans","aux:aff","aux:aspect","aux:caus","aux:clitic","aux:cnd","aux:exhort","aux:imp","aux:nec","aux:neg","aux:opt","aux:part","aux:pass","aux:pot","aux:q","aux:tense","case:acc","case:adv","case:det","case:gen","case:loc","case:pred","case:voc","cc:nc","cc:preconj","ccomp:cleft","ccomp:obj","ccomp:obl","ccomp:pmod","ccomp:pred","compound:a","compound:affix","compound:dir","compound:ext","compound:lvc","compound:nn","compound:preverb","compound:prt","compound:quant","compound:redup","compound:smixut","compound:svc","compound:vo","compound:vv","conj:expl","conj:extend","conj:svc","cop:expl","cop:locat","cop:own","csubj:cleft","csubj:cop","csubj:pass","dep:aff","dep:agr","dep:alt","dep:ana","dep:aux","dep:comp","dep:conj","dep:cop","dep:emo","dep:infl","dep:mark","dep:mod","dep:pos","dep:ss","det:adj","det:noun","det:numgov","det:nummod","det:poss","det:predet","det:pron","det:rel","discourse:emo","discourse:filler","discourse:intj","discourse:sp","dislocated:cleft","dislocated:csubj","dislocated:nsubj","dislocated:obj","dislocated:subj","expl:comp","expl:impers","expl:pass","expl:poss","expl:pv","expl:subj","flat:abs","flat:dist","flat:foreign","flat:gov","flat:name","flat:num","flat:range","flat:repeat","flat:sibl","flat:title","flat:vv","iobj:agent","iobj:appl","iobj:patient","mark:adv","mark:advmod","mark:aff","mark:plur","mark:prt","mark:q","mark:rel","nmod:agent","nmod:appos","nmod:arg","nmod:att","nmod:attlvc","nmod:attr","nmod:bahuv","nmod:cau","nmod:comp","nmod:flat","nmod:gen","nmod:gobj","nmod:gsubj","nmod:lfrom","nmod:lmod","nmod:npmod","nmod:obj","nmod:part","nmod:poss","nmod:pred","nmod:prp","nmod:relat","nmod:subj","nmod:tmod","nsubj:advmod","nsubj:aff","nsubj:bfoc","nsubj:caus","nsubj:cleft","nsubj:cop","nsubj:ifoc","nsubj:lfoc","nsubj:lvc","nsubj:nc","nsubj:obj","nsubj:pass","nsubj:periph","nummod:det","nummod:entity","nummod:flat","nummod:gov","obj:advmod","obj:advneg","obj:agent","obj:appl","obj:caus","obj:lvc","obj:obl","obj:periph","obl:advmod","obl:agent","obl:appl","obl:arg","obl:cau","obl:cmp","obl:cmpr","obl:comp","obl:dat","obl:freq","obl:inst","obl:lfrom","obl:lmod","obl:lmp","obl:lto","obl:lvc","obl:mcl","obl:mod","obl:npmod","obl:orphan","obl:own","obl:patient","obl:pmod","obl:poss","obl:prep","obl:sentcon","obl:smod","obl:tmod","orphan:missing","parataxis:appos","parataxis:conj","parataxis:coord","parataxis:deletion","parataxis:discourse","parataxis:dislocated","parataxis:hashtag","parataxis:insert","parataxis:mod","parataxis:newsent","parataxis:nsubj","parataxis:obj","parataxis:parenth","parataxis:rel","parataxis:rep","parataxis:restart","parataxis:rt","parataxis:sentence","parataxis:trans","parataxis:url","vocative:cl","vocative:mention","xcomp:cleft","xcomp:ds","xcomp:obj","xcomp:pred","xcomp:sp","xcomp:subj"];
const colors = distinctColors({
    count: deprels.length + 1,
    chromaMin: 30
});
for (let i = 0; i < deprels.length; i++) {
  index[deprels[i]] = colors[i].hex();
}
index["extended"] = colors[colors.length - 1];

// Get a distinct color for each deprel
export default function getDeprelColor(deprel) {
    if (index[deprel]) {
        return index[deprel];
    } else {
        return index["extended"];
    }
}
