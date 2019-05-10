// This module is the connection between the backend and the db
// i.e. the backend is agnostic of the particular db used (e.g. mongo, redis etc.)

module.exports = {

    // here are defined the db key-values and returned as json object
    returnDBVariables: function() {

        return {
            nomedb: 'data',
            hostdb: 'mongodb',
            portdb: '27017',
            collezioneDocumenti: 'DOCUMENTI',
            collezioneUpdate: 'INFOMOCKUP',
            collezioneElencoDocumenti: 'ELENCODOCUMENTI',
            documents_unique_id: '_id',
            timeout: 10000,
            interval: 1000
        };
    
    },


    isConnectionReady() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.isConnectionReady(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['interval'], dbVars['timeout']);

    },


    createDB: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.creaDB(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb']);  // if the db exists, this call does not fail

    },


    // list of document's pdf (ID is used to uniquely identify each doc)
    createDocumentsCollection: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.createCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti']); // if the db exists, this call does not fail

    },


    // global last update information
    createInfoMockupCollection: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.createCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneUpdate']); // if the db exists, this call does not fail

    },

    // list of documents (.json with all the documents, pdf files excluded)
    createDocumentsListCollection: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.createCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneElencoDocumenti']); // if the db exists, this call does not fail

    },


    showCollections: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();
        mongo.listAvailableCollections(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb']);


    },


    // insert a pdf for a document whose unique key is composed in this way:
    //  id_document = "ID_BANCA"-"ID_DOCUMENTO" 
    // pdf_blob_result is the pdf blob as result of the download form the mockup server for a specific document 
    // Parameter field_update is used to indicate which field is used to recognize the record to update
    insertDocument: function(id_document, last_update, pdf_blob_result) {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        var document = {};
        document[dbVars['documents_unique_id']] = id_document;
        document['LAST_UPDATE'] = last_update;
        document['pdf'] = pdf_blob_result;

        var field_update = {};
        field_update[dbVars['documents_unique_id']] = id_document;

        console.log("Inserting doc: " + JSON.stringify(document));

        mongo.updateRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti'], field_update, document);

    },


    insertGLU: function(global_last_update) {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        // clear the collection before inserting
        let p1 = new Promise(function(resolve, reject) {
            resolve(mongo.cleanCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneUpdate']));
          });
          
        p1.then(function(value) {
            console.log("GLU has been cleaned..Insert new GLU");
            mongo.insertRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneUpdate'], global_last_update);
        });

    },


    // insert the document's list from mockup service into the collection
    // before doing that, clear the collection
    // documentsList is a JSON that contains the updated list of documents
    insertDocumentsList: function(documentsList) {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        // clear the collection before inserting
        let p1 = new Promise(function(resolve, reject) {
            resolve(mongo.cleanCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneElencoDocumenti']));
          });
          
        p1.then(function(value) {
            console.log("Collection has been cleaned..Insert new documents'list");
            mongo.insertRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneElencoDocumenti'], documentsList);
        });

    },


    retrieveAllDocuments: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        return mongo.queryAllRecords(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti']).then(function(items) {
            console.info('Returning glu..', items);
            return items;
          }, function(err) {
            console.error('The promise was rejected', err, err.stack);
        });

    },


    retrieveGLU: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        return mongo.queryFirstRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneUpdate']).then(function(items) {
            console.info('Returning glu..', items);
            return items;
          }, function(err) {
            console.error('The promise was rejected', err, err.stack);
        });

    },


    // return a json with the documents' list
    retrieveDocumentsList: function() {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        return mongo.queryFirstRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneElencoDocumenti']).then(function(items) {
            console.info('Returning documents collection..', items);
            return items;
          }, function(err) {
            console.error('The promise was rejected', err, err.stack);
        });

    },


    // id_document is in the format {_id: <document_id>}
    retrievePdfDocument: function(id_document) {

        let mongo = require('../database/mongodb.js');

        var dbVars = this.returnDBVariables();

        return mongo.queryRecord(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti'], JSON.parse(id_document)).then(function(items) {
            console.info('Returning document..', items);
            return items;
          }, function(err) {
            console.error('The promise was rejected', err, err.stack);
        });

    },


    clearDocumentsCollection: function() {

        let mongo = require('../database/mongodb.js');
        var dbVars = this.returnDBVariables();

        let p1 = new Promise(function(resolve, reject) {
            resolve(mongo.cleanCollection(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti']));
        });
          
        p1.then(function(value) {
            console.log("Documents'collection has been cleaned");
        });

    },

     
    // delete a single record from a collection, given the id
    // _id is the field used to perform the deletion(s)
    // record is a list in the form [<id>^*]
    deletePdfDocuments: function(records) {

        let mongo = require('../database/mongodb.js');
        var dbVars = this.returnDBVariables();

        let p1 = new Promise(function(resolve, reject) {
            resolve(mongo.deleteManyRecords(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti'], records));
        });
        
        p1.then(function(value) {
            console.log("Documents has been removed from collection.");
        });

    },
    

    // check if a document (pdf) requires to be inserted in the collection:
    // this happens when a document is not present at all in the collection or
    //  it is present but it's field 'LAST_UPDATE' is lower than the new one.
    // return false if the document needs to be downloaded and inserted, true it it is up to date.
    isDocumentUpdated: function(id_document, last_update) {

        let mongo = require('../database/mongodb.js');
        var dbVars = this.returnDBVariables();
        
        return mongo.isDocumentUpdated(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti'], id_document, last_update).then(function(items) {

            return items;

        });

    },


    // check if a document is present in a collection, by its id.
    // return true if the document is present, false otherwise
    isDocumentPresent(id_document) {

        let mongo = require('../database/mongodb.js');
        var dbVars = this.returnDBVariables();
        
        return mongo.isDocumentPresent(dbVars['nomedb'], dbVars['hostdb'], dbVars['portdb'], dbVars['collezioneDocumenti'], id_document).then(function(items) {

            return items;

        });

    }

}