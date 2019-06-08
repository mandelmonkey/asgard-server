"use strict";

var RateLimit = require('express-rate-limit');

var request = require('request');

var crypto = require("crypto");

var cors = require('cors')
const express = require('express');  

const PORT = process.env.PORT || 8080;
//app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

var limiter = new RateLimit({
	windowMs: 60 * 1000, // 1 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	delayMs: 0 // disable delaying - full speed until the max limit is reached
});


var app = express(); 

//  apply to all requests
app.use(limiter);

app.use(cors());


const auth = require('./auth');
app.use(auth)

var bodyParser = require("body-parser");  

app.use(bodyParser.urlencoded({
	extended: true
})); // support encoded bodies

app.use(bodyParser.json({
	limit: '10mb',
	extended: true
}))


var maxTipAmount = 1;
var smallTipAmount = 1;
var grpc = require('grpc');
var fs = require("fs");

var lnrpc = grpc.load('assets/rpc.proto').lnrpc;
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

var lndCert = fs.readFileSync('assets/tls.cert');

var sslCreds = grpc.credentials.createSsl(lndCert);

var macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args, callback) {
    var macaroon = fs.readFileSync("assets/mainnet/admin.macaroon").toString('hex');

    var metadata = new grpc.Metadata()

    metadata.add('macaroon', macaroon);
    callback(null, metadata);
});
var creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
var lightning = new lnrpc.Lightning("13.58.198.168:10009", creds);


console.log(lightning);
 
app.get("/getMonsters", function(req, res) {

   
    db.any("SELECT * FROM twitter_accounts WHERE active = $1", ["true"])
        .then(data => { 

            res.status(200).json(data);

        })
        .catch(function(error) {
            
            res.status(501).json(error);
        });

});
 

var call = lightning.getInfo({}, function (err, response) {
    if (err != undefined) {
        console.error("error:" + err);

    }
    console.log('GetInfo: ', response);

})


var http = require('http');



var pgp = require('pg-promise')( /*options*/);
pgp.pg.defaults.ssl = true;

var cn = databaseAuth;
var db = pgp(cn); // database instance;s
 
var server = app.listen(PORT, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});

app.get("/getAssets", function (req, res) {


    db.any("SELECT * FROM takara_go_types WHERE active = $1", ["true"])
        .then(data => {

            res.status(200).json(data);

        })
        .catch(function (error) {

            res.status(501).json(error);
        });

});



function getTwitterProfile(handle) {


    var uri = "https://api.twitter.com/1.1/users/show.json?screen_name=" + handle;
    request({
        uri: uri,
        method: 'GET',
        headers: {
            'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAExJ%2BgAAAAAAI4q6t55lh2RBXx29XJjcAcUOcjE%3DLIR87crE2aQQBrvdw0uigSNzB1mUQsox0AfGy4yH1SsK8XJ8eN',
        }
    }, function (err, res, body) {

        console.log(JSON.parse(body));


    });

}
//getTwitterProfile("mandelduck");


function getTweets(handle) {

    var uri = "https://api.twitter.com/1.1/statuses/user_timeline.json?count=10&screen_name=" + handle;
    request({
        uri: uri,
        method: 'GET',
        headers: {
            'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAExJ%2BgAAAAAAI4q6t55lh2RBXx29XJjcAcUOcjE%3DLIR87crE2aQQBrvdw0uigSNzB1mUQsox0AfGy4yH1SsK8XJ8eN',
        }
    }, function (err, res, body) {
        if (err != null) {
            console.error(err);
        } else {

            var data = JSON.parse(body);
            console.log(body);

            var newData = [];
            var profile = "";
            for (var i = 0; i < data.length; i++) {


                profile = data[i]["user"]["profile_image_url_https"].replace("_normal", "");

                newData.push({ "text": data[i].text });
            }


            db.task(function* (t) {


                yield t.none('UPDATE "twitter_accounts" SET tweets = $1, profile = $2 WHERE handle = $3', [JSON.stringify(newData), profile, handle]);

            }).then(events => {
                console.log("finished");
            })
                .catch(error => {
                    console.error("error " + error);
                });

        }


    });

}
function updateTweets() {

    db.any("SELECT * FROM twitter_accounts WHERE active = $1", ["true"])
        .then(data => {

            console.log(data.length);

            for (var i = 0; i < data.length; i++) {
                var aData = data[i];
                console.log(aData);
                getTweets(aData.handle);
            }

        })
        .catch(function (error) {


        });
}
//updateTweets(); 

function decrypt(encryptedText) {

    var keyBuffer = new Buffer(tipKey);
    var ivBuffer = new Buffer(tipVector);
    var decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, ivBuffer);

    var encryptdata = new Buffer(encryptedText, 'base64').toString('binary');
    var decoded = decipher.update(encryptdata, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;

}


app.post("/sendPayment", function (req, res) {

    try {
 
    db.any("SELECT COUNT(*) FROM takara_go_sends WHERE error = $1",[null])
    .then(data => { 

        if(data[0].count > maxTipAmount){
            res.status(501).json({
                "error": "tipping is currently over!"
            });
            return;

        }
         
        var data = decrypt(req.body.data);
        data = JSON.parse(data);
        var payment_req = data.payment_request;

        console.log("payment_req", payment_req);

        var lnrequest = {
            pay_req: payment_req,
        }

        call = lightning.decodePayReq(lnrequest, function (err, LNresponse) {
            if (err != undefined) {
                console.error("error:" + err);
                res.status(501).json({
                    "error": "no response"
                });
                return;

            }

            console.log("decoded", LNresponse.num_satoshis);

            console.log(" smallTipAmount", smallTipAmount);
            if (LNresponse.num_satoshis != smallTipAmount) {
                res.status(501).json({
                    "error": "incorrect invoice amount"
                });
                return;
            }



            var call = lightning.sendPayment({});

            call.on('data', function (message) {
                console.log("on data", message);
                console.log(message.payment_error);
                console.log(message.payment_preimage);

                if (message.payment_error != "") {
                    console.error("error", message.payment_error)

                    var dateNow = new Date();
							db.none('INSERT INTO takara_go_sends(payment_request, amount, error, created_at, updated_at) VALUES($1, $2, $3, $4, $5)', [payment_req, LNresponse.num_satoshis,  message.payment_error, dateNow, dateNow])
								.then(() => {
									
                                    res.status(400).json(message.payment_error);
								})
								.catch(error => {
									
                                    res.status(400).json(message.payment_error);
								});

                    return;
                }

                if (message.payment_error == "" && message.payment_preimage != undefined) {

                    var preimage = toHexString(message.payment_preimage);
                    console.log("preimage", preimage);

                    var dateNow = new Date();
                    db.none('INSERT INTO takara_go_sends(payment_request, amount, error, created_at, updated_at) VALUES($1, $2, $3, $4, $5)', [payment_req, LNresponse.num_satoshis,  null, dateNow, dateNow])
								.then(() => {
									
                                    res.status(200).json(preimage);
								})
								.catch(error => {
									
                                    res.status(200).json(preimage);
								});

                }
            });

            call.write({
                payment_request: payment_req,
            });

        });
    

})
.catch(function(error) {
    res.status(501).json({
        "error": "error"
    });
});
    } catch (e) {
        console.error(e);
    }


});

function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

