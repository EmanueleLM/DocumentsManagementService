// External server: this 'fake, external' server has those main duties:
// - through 'localhost/documentsList': exposing the list of updated documents through a HTTP GET;
// - through 'localhost//downloadDocument/:id': exposing each single document and its .pdf blob. 
// All the requests must be authenticated, look at 'batch_system/batch_server.js' for an authenticated request


var crypto = require('crypto');
var express = require('express');
var gfr = require('./generate_fake_response.js');
var crypto_module = require('./crypto_utils.js');

// crypto parameters (of course secrets should be put into a separate config file)
const algorithm = 'sha256';
const shared_secret_1 = 'aaa';
const shared_secret_2 = 'bbb';

// parameters of the external server
const listening_port = 3002;

// instantiate the external service
var external_server = express();


// Service to retrieve the list of updated documents
//  example of usage: connect to 127.0.0.1/documentsList *with credentials*
external_server.get('/documentsList', function (req, res) {

  // get token and parameters from request
  try {
    
    var headers = JSON.parse(JSON.stringify(req.headers));
    console.log(headers);

    if (!headers.hasOwnProperty('token') || !headers.hasOwnProperty('param')) {

      res.statusCode = 400;
      res.end("Invalid request, variables status: " + "\nToken: " + headers['token'] + "\nParams: " + headers['Param']);

    } else {

      var get_variables = {"token": headers['token'], 
                            "param": headers['param'].split('=')[1]
                          };

      
      // check if the timestamp is in an interval of +/-60 seconds wrt the request timsestamp
      actual_timestamp = new Date().getTime();
      request_time_validity = (parseInt(get_variables['param'])+6000 >= parseInt(actual_timestamp) && parseInt(get_variables['param']) < parseInt(actual_timestamp));
      console.log("Actual timestamp: " + actual_timestamp + "\n" + "Request's timestamp: " + get_variables['param']);

      // check the token autenticity
      var checksum_request = crypto_module.hash(get_variables['param'], algorithm, shared_secret_1, shared_secret_2);
      console.log("Request checksum: " + checksum_request + '\n' + "Response checksum: " + get_variables['token']);

      if (request_time_validity && (checksum_request.localeCompare(get_variables['token']) == 0)) {

        var response_documents = gfr.elencoDocumenti(get_variables[0], get_variables[1]);
        res.end(JSON.stringify(response_documents));
        res.statusCode = 200;

      } else {

        if (!request_time_validity) {

          res.statusCode = 400;
          res.end("Request's timestamp is in an invalide range.");

        } else if (checksum_request.localeCompare(get_variables['token']) != 0) {

          res.statusCode = 400;
          res.end("Incorrect keys.");

        } else {

          res.statusCode = 400;
          res.end("Invalid request.");

        }

      }

    }
    
  } catch(err) {

    res.statusCode = 400;
    res.end("Invalid request" + err);

  }

});

// Service to retrieve a document (pdf), given the id in the request
//  example of usage: connect to 127.0.0.1/downloadDocument/1 *with credentials*
external_server.get('/downloadDocument/:id', function (req, res) {

  // get token and parameters from request
  try {
    
    var headers = JSON.parse(JSON.stringify(req.headers));
    console.log(headers);

    if (!headers.hasOwnProperty('token') || !headers.hasOwnProperty('param')) {

      res.statusCode = 400;
      res.end("Invalid request, variables status: " + "\nToken: " + headers['token'] + "\nParams: " + headers['Param']);

    } else {

      var get_variables = {"token": headers['token'], 
                            "param": headers['param'].split('=')[1]
                          };      

      // check the token autenticity
      var checksum_request = crypto_module.hash(get_variables['param'], algorithm, shared_secret_1, shared_secret_2);
      console.log("Request checksum: " + checksum_request + '\n' + "Response checksum: " + get_variables['token']);

      // send back the pdf for the document
      if (checksum_request.localeCompare(get_variables['token']) == 0) {

        // res.end("Download allowed for document with id " + req.params.id);
        res.end('<pdf> pdf blob for document ' + req.params.id + '</pdf>');
        res.statusCode = 200;

      } else {

        res.statusCode = 400;
        res.end("Invalid token");

      }

    }
    
  } catch(err) {

    res.statusCode = 400;
    res.end("Invalid request" + err);

  }

});

// Global server listener
external_server.listen(listening_port, function () {

  var hello = '\nI\'m the external server, listening on port ' + listening_port.toString() + '!\n';
  var instructions = 'Send GET requests with \'token\' parameter (string) and \'param\' (string)\n';
  console.log(hello + instructions);

});