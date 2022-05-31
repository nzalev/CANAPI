'use strict'

const express = require('express')

const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
client.connect();
const db = client.db('canmsgs');


const API_KEY = 'YdCsCdCh5eFE9Aq4gopdo'


function checkAPIKey(req) {
    if (req.headers['apikey'] === API_KEY)
        return true;

    return false;
}

function checkNulls(body, propertyList) {
    for (var i = 0; i < propertyList.length; i++) {
        var prop = propertyList[i];
        if (body[prop] == null)
            return false;
    }

    return true;
}


var app = express()
app.use(express.json());

app.post('/frames', (req, res) => {

    if ( ! checkAPIKey(req) ) {
        res.status(403);
        return res.send('Forbidden\n');
    }

    if ( ! checkNulls(req.body,
            ['vehicle_id', 'arbitration_id', 'data_len', 'data_string']) ) {
        res.status(400);
        return res.send('Missing\n');
    }


    var { vehicle_id, arbitration_id, data_len, data_string } = req.body;
    var frame = { vehicle_id, arbitration_id, data_len, data_string };

    // Just use vehicle ID as collection name for now
    const collection = db.collection("vehicle_" + String(frame['vehicle_id']));
    collection.insertOne(frame);

    res.status(200);
    return res.send('ack\n');
});

app.listen(3000)