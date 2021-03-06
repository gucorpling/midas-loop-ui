export default class Api {
    /**
     * Create a new API wrapper object.
     * @param {string} baseUrl - point to the `/api` endpoint, e.g. `"http://localhost:3000/api"`
     * @param {string} token   - security token. Required for all API methods except `checkToken`.
     */
    constructor (token = null) {
        // defined in webpack.dev.js and webpack.prod.js
        this.baseUrl = API_ENDPOINT;
        this.token = token;
    }

    async _getRequest(endpoint) {
        const url = this.baseUrl + endpoint;
        const opts = {
            method: "GET",
            headers: {"Authorization": `Token ${this.token}`},
            mode: "cors"
        }
        const resp = await fetch(url, opts);
        return resp;
    }

    async _postRequest(endpoint, body) {
        const url = this.baseUrl + endpoint;
        const opts = {
            method: "POST",
            headers: {
                "Authorization": `Token ${this.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            mode: "cors"
        }
        const resp = await fetch(url, opts);
        return resp;
    }

    async _putRequest(endpoint, body) {
        const url = this.baseUrl + endpoint;
        const opts = {
            method: "PUT",
            headers: {
                "Authorization": `Token ${this.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            mode: "cors"
        }
        const resp = await fetch(url, opts);
        return resp;
    }

    // --------------------------------------------------------------------------------
    // Gets
    // --------------------------------------------------------------------------------
    /**
     * Ask the server for metadata about documents. Use to support a browsing UI.
     * 
     * @param {int} offset - offset from the start of all the server's documents
     * @param {int} limit - the maximum number of documents to return from the offset
     * @param {string} orderBy - ordering criterion. Matches this regex: /(name|((xpos|upos|head)-gold)|((xpos|upos|head)-mean-top-proba))-(inc|dec)/. 
     *                           xpos, upos, and head refer to the proportion of gold annotations.
     * @return {Object} Key `total` has total count of all docs in the database, key `docs` has the requested docs.
     */
    queryDocuments(offset = 0, limit = 25, orderBy = "name-inc") {
        return this._getRequest(`/conllu/document?offset=${offset}&limit=${limit}&order-by=${orderBy}`)
            .then(result => result.json());
    }

    /**
     * Get the full information for a document
     * @param {string} id - document ID
     * @param {string} format - either "json" or "conllu" (defaults to "json")
     */
    getDocument(id, format = "json") {
        const onSuccess = (result) => {
            if (result.status !== 200) {
                return null
            } else {
                return format === "json" ? result.json() : result.text()
            }
        }
        return this._getRequest(`/conllu/document/id/${id}?format=${format}`).then(onSuccess);
    }

    /**
     * Produce JSON representation of a sentence.
     * @param {string} id 
     */
    getSentence(id) {
        return this._getRequest(`/conllu/sentence/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a CoNLL-U metadata line.
     * @param {string} id 
     */
    getConlluMetadata(id) {
        return this._getRequest(`/conllu/conllu-metadata/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a token.
     * @param {string} id 
     */
    getToken(id) {
        return this._getRequest(`/conllu/token/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a form.
     * @param {string} id 
     */
    getForm(id) { 
        return this._getRequest(`/conllu/form/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a lemma annotation.
     * @param {string} id 
     */
    getLemma(id) { 
        return this._getRequest(`/conllu/lemma/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a xpos annotation.
     * @param {string} id 
     */
    getXpos(id) { 
        return this._getRequest(`/conllu/xpos/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a upos annotation.
     * @param {string} id 
     */
    getUpos(id) { 
        return this._getRequest(`/conllu/upos/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a feats annotation.
     * @param {string} id 
     */
    getFeats(id) { 
        return this._getRequest(`/conllu/feats/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a head annotation.
     * @param {string} id 
     */
    getHead(id) { 
        return this._getRequest(`/conllu/head/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a deprel annotation.
     * @param {string} id 
     */
    getDeprel(id) { 
        return this._getRequest(`/conllu/deprel/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Produce JSON representation of a misc annotation.
     * @param {string} id 
     */
    getMisc(id) { 
        return this._getRequest(`/conllu/misc/id/${id}`)
            .then(result => result.json());
    }

    /**
     * Download a CoNLL-U file.
     * @param {string} documentId 
     */
    downloadConlluFile(documentId) {
        return this._getRequest(`/conllu/files/download/${documentId}`);
    }

    /**
     * Helper: download a CoNLL-U file and immediately start a download prompt for it
     * @param {string} documentId
     */
    async downloadConlluFileWithPrompt(documentId) {
        const result = await this.downloadConlluFile(documentId)
        const doc = await this.getDocument(documentId)
        const blob = await result.blob()
        const url = await URL.createObjectURL(blob)
        Object.assign(document.createElement('a'), {
            href: url,
            download: doc.name + '.conllu',
        }).click();
    }
  

    // --------------------------------------------------------------------------------
    // Posts
    // --------------------------------------------------------------------------------
    /**
     * Ask the server if a given token is valid.
     * @param {string} token 
     */
    checkToken(token) {
        return this._postRequest("/check-token", {"token": token});
    }

    /**
     * Begin a new sentence at the given token ID.
     * @param {string} tokenId 
     */
    splitSentence(tokenId) {
        return this._postRequest("/conllu/sentence/split", {"token-id": tokenId});
    }

    /**
     * Merge the sentence into the sentence to its left.
     * @param {string} sentenceId 
     */
    mergeSentenceLeft(sentenceId) {
        return this._postRequest("/conllu/sentence/merge-left", {"sentence-id": sentenceId});
    }

    /**
     * Merge the sentence into the sentence to its right.
     * @param {string} sentenceId 
     */
    mergeSentenceRight(sentenceId) {
        return this._postRequest("/conllu/sentence/merge-right", {"sentence-id": sentenceId});
    }

    /**
     * Given a document ID and two versions of its CoNLL-U, send them to the server and have the server
     * bring its current state of the document in line with the annotations in `newConllu`. Note the
     * following constraints:
     * - Token and sentence boundaries in oldConllu and newConllu must match exactly
     * - Forms must match exactly in oldConllu and newConllu
     * - DEPS will be ignored
     * - oldConllu must match the server's current state of the document, or else the request will be rejected
     * 
     * @param {string} documentId - the ID of the document we are diffing
     * @param {string} oldConllu - the state of the CoNLL-U before edits were applied
     * @param {string} newConllu - the state of the CoNLL-U after edits were applied
     */
    postAnnotationDiff(documentId, oldConllu, newConllu) {
        return this._postRequest("/conllu/document/diff", {"id": documentId, "old-conllu": oldConllu, "new-conllu": newConllu});
    }

    // --------------------------------------------------------------------------------
    // Puts
    // --------------------------------------------------------------------------------
    /**
     * Update the value of a head with the given Id.
     * @param {string} headId 
     * @param {string} value 
     */
    updateHead(headId, value) {
        return this._putRequest("/conllu/head/id/" + headId, {"value": value});
    }

    /**
     * Update the value of a deprel with the given Id.
     * @param {string} deprelId 
     * @param {string} value 
     */
    updateDeprel(deprelId, value) {
        return this._putRequest("/conllu/deprel/id/" + deprelId, {"value": value});
    }

    /**
     * Update the value of an xpos with the given Id.
     * @param {string} xposId 
     * @param {string} value 
     */
    updateXpos(xposId, value) {
        return this._putRequest("/conllu/xpos/id/" + xposId, {"value": value});
    }

    /**
     * Update the value of a lemma with the given Id.
     * @param {string} lemmaId 
     * @param {string} value 
     */
    updateLemma(lemmaId, value) {
        return this._putRequest("/conllu/lemma/id/" + lemmaId, {"value": value});
    }

}

// for debugging
window.ConlluRestApi = Api;
