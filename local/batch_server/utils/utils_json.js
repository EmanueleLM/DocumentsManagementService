// filter and extract information form json

module.exports = {

    // data is the json (parsed), type is the section's name, val is the section we want to retrieve
    getDocumentsByABI: function(data, type, abi) {

        data = JSON.parse(JSON.stringify(data)).LISTA_BANCHE;

        return data.filter(function (el) {

            return el[type] == abi;

        });
    }

}