'use strict'

/* remember to run export NODE_ENV=production */

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
app.use(express.json({limit: '50mb'}));

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
    var frame = {
        vehicle_id,
        arbitration_id,
        data_len,
        data_string,
        time_received: new Date()
    };

    // Just use vehicle ID as collection name for now
    const collection = db.collection("vehicle_" + String(frame['vehicle_id']));
    collection.insertOne(frame);

    res.status(200);
    return res.send('ack\n');
});

app.post('/frames/bulk', (req, res) => {

    if ( ! checkAPIKey(req) ) {
        res.status(403);
        return res.send('Forbidden\n');
    }

    if (req.body.length == undefined) {
        res.status(400);
        return res.send('Invalid Format\n');
    }

    var frames = req.body;
    var time_received = new Date();
    var frame_list = [];

    frames.forEach(f => {
        if ( ! checkNulls(f,
                ['vehicle_id', 'arbitration_id', 'data_len', 'data_string']) ) {
            res.status(400);
            return res.send('Missing parameters\n');
        }

        var { vehicle_id, arbitration_id, data_len, data_string, time_recorded } = f;

        var record_date = new Date(0);
        record_date.setUTCSeconds(time_recorded);

        var frame = {
            vehicle_id,
            arbitration_id,
            data_len,
            data_string,
            time_recorded: record_date,
            time_received: time_received
        };
        frame_list.push(frame);
    });

    try {
        var vid = frame_list[0]['vehicle_id'];
        const collection = db.collection("vehicle_" + String(vid));
        collection.insertMany(frame_list);
    } catch (e) {
        console.log(e);
        res.status(500);
        return res.send('err\n');
    }

    res.status(200);
    res.send('ack\n');
});


// Error middleware

app.use((err, req, res, next) => {
    
    // Silence the stack trace - this is an expected behaviour
    if (err.type === 'entity.too.large') {
        res.status(413);
        res.send('');
    } else {
        next(err);
    }
});


app.listen(3000, 'localhost');