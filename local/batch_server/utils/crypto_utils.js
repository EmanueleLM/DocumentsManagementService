// Decrypt-Encrypt utilities

module.exports = {

  hash: function(timestamp, algorithm, salt1, salt2){

    let crypto = require('crypto');

    var stream = salt1.concat(':', timestamp, ':', salt2);
    var cipher = crypto.createHash(algorithm);
    var crypted = cipher.update(stream).digest('hex');
    return crypted;

    }
  
}