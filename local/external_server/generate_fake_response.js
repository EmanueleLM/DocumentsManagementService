// Generate fake response to GET requests for documents

module.exports = {
    // generate n random json documents
    // returns the json object if 
    elencoDocumenti: function(token, param) {

        var elencoDocumenti = {
            "GLOBAL_LAST_UPDATE": "",
            "LISTA_BANCHE": [{
                "ID_BANCA": 1,
                "LISTA_SEZIONI": [
                {
                    "NOME_SEZIONE": "AC - Aperture di Credito",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "420",
                        "CODICE_DOCUMENTO": "AC1",
                        "NOME_DOCUMENTO": "Apertura di credito",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1543666666"
                    },
                    {
                        "ID_DOCUMENTO": "466",
                            "CODICE_DOCUMENTO": "AC1",
                            "NOME_DOCUMENTO": "Apertura di credito",
                            "CREATION_DATE": "1442899102",
                            "LAST_UPDATE": "1543666666"
                    },
                    {
                    "ID_DOCUMENTO": "499",
                        "CODICE_DOCUMENTO": "AC1",
                        "NOME_DOCUMENTO": "Chiusura di credito",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898889"
                    }      
                    ]
                },
                {
                    "NOME_SEZIONE": "AF - Altri Finanziamenti",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "440",
                        "CODICE_DOCUMENTO": "AF1",
                        "NOME_DOCUMENTO": "Altri prestiti personali",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898889"
                    }
                ]
                }      
                ]
            },
            {
                "ID_BANCA": 2,
                "LISTA_SEZIONI": [
                {
                    "NOME_SEZIONE": "AC - Aperture di Credito",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "12",
                        "CODICE_DOCUMENTO": "AC1",
                        "NOME_DOCUMENTO": "Apertura di credito",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    }       
                    ]
                },
                {
                    "NOME_SEZIONE": "AF - Altri Finanziamenti",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "17",
                        "CODICE_DOCUMENTO": "AF1",
                        "NOME_DOCUMENTO": "Altri prestiti personali",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    },
                    {
                    "ID_DOCUMENTO": "18",
                        "CODICE_DOCUMENTO": "AF2",
                        "NOME_DOCUMENTO": "Altri prestiti personali",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    }
                ]
                }      
                ]
            },
            {
                "ID_BANCA": 3,
                "LISTA_SEZIONI": [
                {
                    "NOME_SEZIONE": "AC - Aperture di Credito",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "12",
                        "CODICE_DOCUMENTO": "AC1",
                        "NOME_DOCUMENTO": "Apertura di credito",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    }       
                    ]
                },
                {
                    "NOME_SEZIONE": "AF - Altri Finanziamenti",
                    "LISTA_DOCUMENTI": [
                    {
                    "ID_DOCUMENTO": "17",
                        "CODICE_DOCUMENTO": "AF1",
                        "NOME_DOCUMENTO": "Altri prestiti personali",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    },
                    {
                    "ID_DOCUMENTO": "18",
                        "CODICE_DOCUMENTO": "AF2",
                        "NOME_DOCUMENTO": "Altri prestiti personali",
                        "CREATION_DATE": "1442899102",
                        "LAST_UPDATE": "1542898859"
                    }
                ]
                }      
                ]
            }
            ]
            }

        global_last_update = new Date().getTime().toString();
        elencoDocumenti['GLOBAL_LAST_UPDATE'] = global_last_update;

        return elencoDocumenti;

    }
    
};
