// Batch system server: this server has those main duties:
// - keeps on pooling from the external service and every t seconds, the list of updated documents (HTTP GET through 'localhost/documentsList');
// - keeps on pooling the .pdf documents their 'LAST_UPDATE' is not 'up to date' (HTTP GET through 'localhost//downloadDocument/:id');
// - saves the list of updated documents in the db;
// - saves each single updated document (.pdf) in the db;
// - expose two HTTP GET to the localhost so everybody can download the documents list and each single .pdf (not authenticated). 
// The first 2 requests must be authenticated, the latter is not: while the formers are intended as server-to-server calls,
//  the latter is a frontend-to-backend api.


// module's dependencies
var cron = require('cron');
var crypto_module = require('./utils/crypto_utils.js');
var utils_db = require('./utils/utils_db.js');  // 'abstraction-layer' between db and backend
var utils_json = require('./utils/utils_json.js');

// Server parameters
const listening_port = 3001;

// crypto parameters
const algorithm = 'sha256';
const shared_secret_1 = 'aaa';
const shared_secret_2 = 'bbb';

// buffer that contains the documents retrieved from the mockup server:
var mockup_documents_list = Buffer.alloc(1e4, '.');

// mockup connections' parameters
const cron_interval = '*/60 * * * * *';  // a request every 60 seconds
var request_header =  {
                      'Content-Type': 'application/json', 
                      "token": "",  // here goes the token to authenticate the request
                      "param": "timestamp="  // here goes the timestamp of the request
                    };

// options for the documents list's request                    
var options = {
  hostname: "external_service",  // docker dns resolves automatically the name->ip
  port: 3002,
  path: '/documentsList',
  method: 'GET',
  headers: request_header
};


// call to retrieve the updated documents from the external service, every <cron_interval> seconds
function retrieveDocumentsFromMockup() {

  // compose the token as 'hash1'+'secret'+'hash2'
  var timestamp_token = new Date().getTime();
  request_header['token'] = crypto_module.hash(timestamp_token, algorithm, shared_secret_1, shared_secret_2);
  request_header['param'] = 'timestamp=' + parseInt(timestamp_token);

  // request the json from the mockup server
  var req = http.request(options, function(res) {

    console.log("statusCode: ", res.statusCode);
    console.log("parameters: ", options);

    res.on('data', function(d) {

      var glu_current_mockup = undefined;
      var glu_current_db = undefined;

      try {

        // retrieve the documents' list from mockup's services
        mockup_documents_list = Buffer.from(d);
        glu_current_mockup = JSON.parse(mockup_documents_list.toString())['GLOBAL_LAST_UPDATE'];

      // global last update not present, save a enabling-all value to the db
      } catch(err) {

        console.log("Mockup server is unavailable, try again later..");
        req.end();

      }

      console.log("CURRENT GLU FORM MOCKUP: " + glu_current_mockup);

      // retrieve glu from db
      let p1 = new Promise(function(resolve) {

        resolve(utils_db.retrieveGLU());
    
      });
      
      // once the db call for glu has ended, check if GLU is up to date
      p1.then(function(res_glu_db) {
       
        try {

          glu_current_db = JSON.parse(JSON.stringify(res_glu_db));
          glu_current_db = glu_current_db['GLOBAL_LAST_UPDATE'];

          if (glu_current_db === undefined || parseInt(glu_current_mockup) > parseInt(glu_current_db)) {

            console.log("Update past glu, from value " + glu_current_db + " to value " + glu_current_mockup);
            utils_db.insertGLU({'GLOBAL_LAST_UPDATE': glu_current_mockup});

            // call all the routines to save the document into the db
            let p2 = new Promise(function(resolve) {

              resolve(utils_db.insertDocumentsList(JSON.parse(mockup_documents_list.toString('utf8'))));

            });

            // update pdf section (insertions/delitions etc.)
            p2.then(function() {

              console.log(new Date().toLocaleString() + " : succesfully queried and saved to db the documents'list.");
              updatePdfCollection();

            }).catch(function(error) { 

              console.log("FATAL ERROR: Unable toupdate documents. Check server's log for more info.");
    
             }
          );

          }
          
        } catch(error) {

          console.log("No glu has been detected: create one with value '0'");
          utils_db.insertGLU({'GLOBAL_LAST_UPDATE': '0'});

          // call all the routines to save the document into the db
          utils_db.insertDocumentsList(JSON.parse(mockup_documents_list.toString('utf8')));
          console.log(new Date().toLocaleString() + " : succesfully queried and saved to db the documents'list.");

        }
    
      }).catch(function(error) { 

          console.log("FATAL ERROR: Unable to update GLU/documents. Check server's log for more info.", error);

         }
      );

    });

  });
  
  req.end();  // end up the request

  req.on('error', function(e) {

    console.error(e);

  });

}


// Clean documents' collection from unused documents.
// This function is invoked *after* the documents' collection has been fully updated and
//  deletes all the unused documents in the collection, i.e. all the documents for which
//  there's no match between the id in documents'list and documents' collection.
function cleanUnusedDocsFromCollection() {

  // get all the documents' id from collection
  let p0 = new Promise(function(resolve) { 

    resolve(utils_db.retrieveAllDocuments());

  });

  p0.then(function(documents_id_from_collection) {

    // map the documents' collection to the ids, as a set
    var documents_id_from_collection = documents_id_from_collection.map(documents_id_from_collection => documents_id_from_collection._id);
    documents_id_from_collection = new Set(documents_id_from_collection);

    // get last version of documents'list from db
    let p1 = new Promise(function(resolve) {

      resolve(utils_db.retrieveDocumentsList());

    });

    // clean unused documents,
    // i.e. for all documents in the list, if there's no such a document in the database with that id, remove it.
    p1.then(function(items) {

      // set for documents' id
      var documents_id_from_doclist = new Set();

      // foreach bank
      for (var i = 0; i < items['LISTA_BANCHE'].length; i++) {

        var bank_docs_sections = items['LISTA_BANCHE'][i]['LISTA_SEZIONI'];

        // foreach section
        for (var j = 0; j < bank_docs_sections.length; j++) {

          var docs_section = bank_docs_sections[j]['LISTA_DOCUMENTI'];

          // foreach document, save the id to the documents' id set
          for (var n = 0; n < docs_section.length; n++) {
    
            let id = items['LISTA_BANCHE'][i]['ID_BANCA'] + '-' + docs_section[n]['ID_DOCUMENTO'];
            documents_id_from_doclist.add(id);    

          }

        }

      }

      // list of promises: for each doc, it contains true if the document is used, otherwise false (i.e. can be deleted)
      var isDocumentUsed = [];
      documents_id_from_collection.forEach(function(el) {
        
        isDocumentUsed.push(documents_id_from_doclist.has(el));

      });
      
      // once all the documents have been checked, solve the inconsistencies
      var documents_to_be_deleted = new Array();

      for (i=0; i<isDocumentUsed.length; i++) {      
          
        let tmp = Array.from(documents_id_from_collection);

        if (isDocumentUsed[i] == false) {

          documents_to_be_deleted.push(tmp[i]);
        
        }

      }

      // delete unused documents
      if (documents_to_be_deleted.length > 0) {

        utils_db.deletePdfDocuments(documents_to_be_deleted);
      
      }

    });

  }).catch(function(error) { 

    console.log("FATAL ERROR: Unable to clean database from unused documents. Check server's log for more info.", error);

   }
  );

}


// ask for a download request to the mockup server, given the document's id
// and save the document in the database
// The new version will implement MS SHarePoint authentication + document's download:
//  the document is saved as binary file into the database.
function downloadPdfFromMockup(id) {

  // compose the token as 'hash1'+'secret'+'hash2'
  var timestamp_token = new Date().getTime();
  var tmp_request_header =  {
                              'Content-Type': 'application/json', 
                              "token": crypto_module.hash(timestamp_token, algorithm, shared_secret_1, shared_secret_2),
                              "param": 'timestamp=' + parseInt(timestamp_token)
                            };

  var tmp_options_download_doc = { 
                                    hostname: "external_service",  // here docker's dns turns name into ip
                                    port: 3002,
                                    path: '/downloadDocument/' + id,
                                    method: 'GET',
                                    headers: tmp_request_header,
                                  };

  // allocate 5 megabytes for each document's blob                                    
  var blob_pdf_from_mockup = Buffer.alloc(5e6, '.');

  // here goes the ms sharepoint async request
  return new Promise(function(resolve) {

      var rq= http.request(tmp_options_download_doc, function(res) {
    
        res.on('data', function(d) {
          // retrieve here the pdf blob
          blob_pdf_from_mockup = Buffer.from(d);
        });

        res.on('end', function(){
          console.log("\n \n utf8: " + blob_pdf_from_mockup.toString('utf8'));
          resolve(blob_pdf_from_mockup.toString('utf8'));
        });

      });

      rq.end();

    });

}


// this function checks the documents' list and for each document (pdf) that is not present in the db,
//  saves it in the appropriate section.
// At the end of the update, check if for each document in the collection, there's an entry with the same id in the list.
//  If there's no corrispondence, delete the pdf since it is unused (it has been removed or moved to another section --> changed the id)
function updatePdfCollection() {

  var documents_list = utils_db.retrieveDocumentsList().then(function(items) {

    //console.log("\n\nDOCUMENTS'S LIST HAS BEEN SAVED, STARTING PDFs UPDATES...\n\n" + items);

    // foreach bank
    for (var i = 0; i < items['LISTA_BANCHE'].length; i++) {

      var bank_docs_sections = items['LISTA_BANCHE'][i]['LISTA_SEZIONI'];

      // foreach section
      for (var j = 0; j < bank_docs_sections.length; j++) {

        var docs_section = bank_docs_sections[j]['LISTA_DOCUMENTI'];

        // foreach document
        for (var n = 0; n < docs_section.length; n++) {

          function getPdfArgs(n) {

            // check if the document is saved on the proper collection:
            //  if it is so, check the update field to see if it is a newer version
            //  if it is not, save the document
            let args = [items['LISTA_BANCHE'][i]['ID_BANCA'] + '-' + docs_section[n]['ID_DOCUMENTO'], docs_section[n]['LAST_UPDATE']];

            return args;

          }

          let p0 = new Promise(function(resolve) {

            resolve(getPdfArgs(n));

          });

          p0.then(function(pdf_args) {

            let p1 = new Promise(function(resolve) {
            
              resolve(utils_db.isDocumentUpdated(pdf_args[0], pdf_args[1]));
            
            });
  
            p1.then(function(up_to_date) {
              
              console.log("UPDATE STATUS FOR DOC-ID " + pdf_args[0] + ": " + up_to_date);
              if (up_to_date == false) {
  
                // check if doc is up to date
                // TODO: ask for pdf's blob if it needs to be updated
                console.log("Doc with id " + pdf_args[0] + ", last update " + pdf_args[1] + ", is being updating/inserting.");
                            
                downloadPdfFromMockup(pdf_args[0]).then(function(pdf_blob_result){

                  console.log("Blob pdf from mockup: " + pdf_blob_result);
                  utils_db.insertDocument(pdf_args[0], pdf_args[1], pdf_blob_result);

                });
              
              } else {
  
                console.log("Doc with id " + pdf_args[0] + ", last update " + pdf_args[1] + ", is up to date.");
  
              }
  
            }).catch(function(error) { 

              console.log("ERROR: Unable to update document with id " + pdf_args[0] + ". Check server's log for more info.", error);
          
             }
            );

          });

        }

      }

    }

  });

}


// expose a REST API to retrieve the updated documents
var express = require('express');
var batch_server = express();
var http = require('http');

/*
batch_server.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

// front-end REST API to expose the documents' list
// abi is the 'ABI' of the bank whose documents are requested
batch_server.get('/documentsList/:abi', function (req, res) {
  
  try {

    // call the db to retrieve the documents' list
    let p1 = new Promise(function(resolve) {

      resolve(utils_db.retrieveDocumentsList());

    });

    p1.then(function(result) {

      // return the documents for the selected abi
      result = utils_json.getDocumentsByABI(result, 'ID_BANCA', req.params.abi);
      res.end(JSON.stringify(result));
      res.statusCode = 200;
      console.log("Document's list with ABI " + req.params.abi + " successfully donwloaded");

    }).catch(function(error) { 

      console.log("ERROR: Unable to retrieve document's list with abi " + req.params.abi + ". Check server's log for more info.", error);
  
     }
    );

  } catch(err) {

    res.end("Wrong request. Error: " + err);
    res.statusCode = 400;

  }

});

// front-end REST API to download a document, given its id
batch_server.get('/downloadDocument/:id', function (req, res) {
  
  try {

    // call the db to retrieve the document's pdf
    let p1 = new Promise(function(resolve) {

      //console.log("\n\nDOCUMENT'S PDF WITH ID "+ req.params.id + " IS BEING QUERIED.\n\n");
      resolve(utils_db.retrievePdfDocument(JSON.stringify({_id: req.params.id})));

    });

    p1.then(function(result) {

      res.end(JSON.stringify(result));
      res.statusCode = 200;
      console.log("Document's list with ABI " + req.params.id + " successfully donwloaded");

    }).catch(function(error) { 

      console.log("ERROR: Unable to retrieve document's pdf with id " + req.params.id + ". Check server's log for more info.", error);
  
     }
    );

  } catch(err) {
    
    res.statusCode = 400;
    res.end("Wrong request. Error: " + err);

  }

});

// request the updated json from the mockup server, every n seconds
batch_server.listen(listening_port, function () {

  var hello = '\nI\'m the backend server, listening on port ' + listening_port +'\n';
  var instructions = 'This server automatically calls the mockup server every <t> seconds for updates.';
  console.log(hello + instructions);

  // Function to retrieve docs from mockup:
  // - start querying documents' list from mockup;
  // - get the list, save it into the db;
  // - expose the document's list (REST API), filtered by 'ABI' (:id).
  // - keep on querying documents from the mockup server and update the db accordingly to new insertions/deletions.
  var cronjob_update_documentslist = cron.job(cron_interval, function(){

    let p0 = new Promise(function(resolve) {

      resolve(retrieveDocumentsFromMockup());

    });

    // clean unused documents (i.e. all those documents whose id doesn't match with one present in the db)
    p0.then(function() {

      cleanUnusedDocsFromCollection();

    }).catch(function(error) { 

      console.log("FATAL ERROR: Unable to start cronjob for documents update. Check server's log for more info.", error);
  
     }
    );

  });
 
  // This is the configuration for the deploy:
  // - create the db;
  // - create the collections;
  // - start cron activity (querying service for documents' list).
  let p1 = new Promise(function(resolve) {

    resolve(utils_db.isConnectionReady());

  });
  
  p1.then(function() {

    let p2 = new Promise(function(resolve) {

      resolve(utils_db.createDB());

    }).catch(function(error) { 

      console.log("FATAL ERROR: Unable to connect to the db. Check server's log for more info.", error);
      process.exit(1);
  
     }
    );
    
    p2.then(function() {

      let p3 = new Promise(function(resolve) {

      resolve(utils_db.createDocumentsCollection(),
              utils_db.createInfoMockupCollection(),
              utils_db.createDocumentsListCollection());

      }).catch(function(error) { 

        console.log("FATAL ERROR: Unable to create collections. Check server's log for more info.", error);
        process.exit(1);
    
       }
      );
      
      p3.then(function() {
        
        cronjob_update_documentslist.start();   

      }).catch(function(error) { 

        console.log("FATAL ERROR: Unable to query updated documents. Check server's log for more info.", error);
        process.exit(1);

    
       }
      );
      
    });
    
  });

});
