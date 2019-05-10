// Create the db and the collection for the documents (and their relative info)

module.exports = {

  // check connection the the mongo db:
  //  timeout is the max-time after that connection is considered as failed;
  //  pooling is the time-interval the db is queried to check connection.
  isConnectionReady(nomedb, urldb, port, interval, timeout) {

    let mongo = require('mongodb');
    var MongoClient = mongo.MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/" + nomedb; 

    // Connection URL    
    var conn = false;
    var queryTime = new Date().getTime();

    while(conn == false || conn == undefined) {

      if (new Date().getTime() > queryTime + timeout) {

        throw "Impossible to connect with the database: TIMEOUT";

      }

      // connection error(s)
      let p1 = new Promise(function(resolve) {

        resolve(setInterval(Function.prototype, interval), console.log("Waiting for connection to be estabilished.."));
      
      });
      
      try {

        conn = p1.then(function(value) {

          MongoClient.connect(url, function(err, db) {

            if (err) {db.close(); return false;}

            console.log("Connection with MongoDB estabilished, ready to serve queries.");
            db.close();
            return true;   

          });
        
        }).catch(function(error) {

          console.log("Impossible to estabilish connection with db ", error);
          process.exit(1);

        });

      } catch(error) {

        console.log("ERROR: Unable to connect to db " + error);
        process.exit(1);

      }

    }

  },


  // instantiate the db
  creaDB: function(nomedb, urldb, port) {

    let mongo = require('mongodb');
    var MongoClient = mongo.MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/" + nomedb;    
 
    // Connection URL    
    MongoClient.connect(url, function(err, db) {

      // connection error(s)
      if (err) throw err;
      console.log("Connected correctly to db at url " + url);

      db.close();

    });
    
  },


  // create a collection on an existing db
  createCollection(nomedb, urldb, port, collection) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";

    try {

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(nomedb);
        dbo.createCollection(collection, function(err, res) {
          if (err) throw err;
          console.log("Connected to collection, url: " + url + collection);
          db.close();
        });
      });

    } catch(err) {

        console.log("ERROR: Impossible to create collection " + collection);
        process.exit(1);

      }


  }, 


  // insert a single record into a collection
  // create a collection on an existing db
  insertRecord(nomedb, urldb, port, collection, record) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      dbo.collection(collection).insertOne(record, function(err, res) {
        if (err) throw err;
        console.log("Element inserted");
        db.close();
      });
    }); 

  },

  // insert a single record into a collection
  // if it already exists, pass
  updateRecord(nomedb, urldb, port, collection, update_field, record) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      dbo.collection(collection).updateOne(update_field, { $set: record }, {upsert: true}, function(err, res) {
        if (err) throw err;
        console.log("Element inserted/updated");
        db.close();
      });
    }); 

  },


  // query an entire collection from an existing db
  queryAllRecords: function(nomedb, urldb, port, collection) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";

    return MongoClient.connect(url).then(function(db) {
      dbo = db.db(nomedb);
      var res = dbo.collection(collection).find().toArray(); 
      db.close();
      return res;
      
    }).then(function(items) {
      console.log(items);
      return items;
    });

  },


  // query the first element from collection
  queryFirstRecord: function(nomedb, urldb, port, collection) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    
    return MongoClient.connect(url).then(function(db) {
      var dbo = db.db(nomedb);
      var res = dbo.collection(collection).findOne();
      db.close();
      return res;
      
    }).then(function(items) {
      console.log(items);
      return items;
    });

  },  

  // query the first element from collection, given (part) of its json
  queryRecord: function(nomedb, urldb, port, collection, query) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    
    return MongoClient.connect(url).then(function(db) {
      var dbo = db.db(nomedb);
      var res = dbo.collection(collection).findOne(query);
      db.close();
      return res;
      
    }).then(function(items) {
      return items;
    });

  }, 


  // instantiate the db
  listAvailableCollections: function(nomedb, urldb, port) {

    let mongo = require('mongodb');

    var MongoClient = mongo.MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    console.log("Connecting to DB: " + url);
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      // List all the available databases
      dbo.listCollections().toArray(function(err, collInfos) {
        if (err) throw err;
        // collInfos is an array of collection info objects that look like:
        // { name: 'test', options: {} }
        console.log("List of collections: " + JSON.stringify(collInfos));
        db.close();
      });
    });
  
    },


  // clean all the elements in a collection
  cleanCollection: function(nomedb, urldb, port, collection) {

    let mongo = require('mongodb');

    var MongoClient = mongo.MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    console.log("Connecting to DB: " + url);
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      // remove all the elements in the collection
      dbo.collection(collection, {}, function(err, elements) {
        if (err) throw err;
        elements.remove({}, function(err, result) {
            if (err) {
                console.log("Impossible to clean collection " + collection);
            }
            console.log("Clean has been succesful, result's logs: " + result);
            db.close();
        });
    }); 
  });

  },

 
  // delete a single record from a collection, given the id
  // record is a json in the form {_id: <id>}
  deleteRecord(nomedb, urldb, port, collection, record) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      dbo.collection(collection).deleteOne(record, function(err, res) {
        if (err) throw err;
        console.log("Element " + record +"has been removed");
        db.close();
      });
    }); 

  },


  // delete many records from a collection, given the id(s)
  // _id is used to delete the elements
  // record is a list of values in the form [<id>^*]
  deleteManyRecords(nomedb, urldb, port, collection, records) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    
    var delete_query = { _id: { $in: records } };

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(nomedb);
      dbo.collection(collection).deleteMany(delete_query, function(err, res) {
        if (err) throw err;
        console.log("Elements with id in [" + records + "] have been removed.");
        db.close();
      });
    }); 

  },
  

  // check if a document (pdf) requires to be inserted in the collection:
  // this happens when a document is not present at all in the collection or
  //  it is present but it's field 'LAST_UPDATE' is lower than the new one.
  // return true if the document is up to date, false if it needs to be downloaded and inserted.
  isDocumentUpdated: function(nomedb, urldb, port, collection, id_document, last_update) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    var record = {'_id': id_document};

    return MongoClient.connect(url).then(function(db) {
      var dbo = db.db(nomedb);
      var res = dbo.collection(collection).find(record).toArray();
      db.close();
      return res;
      
    }).then(function(items) {

      if (items.length > 0) {

        // TODO: check 'LAST_UPDATE_FIELD'
        console.log("parseInt(items[0]['LAST_UPDATE']) < parseInt(last_update) " + parseInt(items[0]['LAST_UPDATE']) + "---" + parseInt(last_update));
        if (parseInt(items[0]['LAST_UPDATE']) < parseInt(last_update)) { 
          
          console.log("Element is already present and not up to date");
          return false;
        
        } else {

          console.log("Element is already present and up to date");
          return true;

        }

      } else {

        console.log("Element is not present");
        return false;

      }

    });    

  },


  // check if a document (pdf) is present in the collection:
  isDocumentPresent: function(nomedb, urldb, port, collection, id_document) {

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://" + urldb + ':' + port + "/";
    var record = {'_id': id_document};

    return MongoClient.connect(url).then(function(db) {
      var dbo = db.db(nomedb);
      var res = dbo.collection(collection).find(record).toArray();
      db.close();
      return res;
      
    }).then(function(items) {

      if (items.length > 0) {

        return true;

      } else {

        console.log("Element is not present");
        return false;

      }

    });    

  }
  
}