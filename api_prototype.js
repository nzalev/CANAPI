'use strict'

/* remember to run export NODE_ENV=production */

const express = require('express')

const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
client.connect();
const db = client.db('canmsgs');


const API_KEY = ''


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
app.use(express.json({limit: '50mb', inflate: true}));

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

    if (req.body.length == undefined || req.body.length == 0) {
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

app.post('/compressedframes', (req, res) => {

    if ( ! checkAPIKey(req) ) {
        res.status(403);
        return res.send('Forbidden\n');
    }

    if ( ! checkNulls(req.body,
            ['vehicle_id', 'frames']) ) {
        res.status(400);
        return res.send('Missing\n');
    }

    var frame_list = [];
    var time_received = new Date();

    var { vehicle_id, frames } = req.body;

    if (frames.length == undefined || frames.length == 0) {
        res.status(400);
        return res.send('Invalid Format\n');
    }

    // frames: array of b64 encoded packed frames
    /* packing:
        u_short  u_char  u_longlong  double
        aid      len     data        time
    */
    frames.forEach(f => {
        var buffer = Buffer.from(f, 'base64');

        var arbitration_id =  buffer.readUInt16LE(0);
        var data_len = buffer.readUInt8(2);
        var time_d = buffer.readDoubleLE(11);

        var record_date = new Date(0);
        record_date.setUTCSeconds(time_d);

        var data_bytes = buffer.slice(3, 3 + data_len);
        var hex = [];
        data_bytes.forEach(byte => {
            hex.push( byte.toString(16).toUpperCase().padStart(2, '0') );
        });
        var data_string = hex.join(' ');


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
        const collection = db.collection("vehicle_" + String(vehicle_id));
        collection.insertMany(frame_list);
    } catch (e) {
        console.log(e);
        res.status(500);
        return res.send('err\n');
    }

    res.status(200);
    return res.send('ack\n');
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
