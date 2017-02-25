var steem = require('steem');
var postgres = require("pg-promise")();
var config = require("./config.json");

var db = postgres(config);

var me = config.account;

var network;
const args = process.argv;

args.forEach((val)=>{
    if(val.indexOf("network") !== -1){
        network = val.split("=")[1];
    }
});

if(network == "steem"){
    steem.api.setWebSocket("wss://node.steem.ws");
    console.log("Network is steem");
}else{ 
    if(network == "golos"){
        steem.api.setWebSocket("wss://node.golos.ws");
        console.log("Network is golos");
    }else{
        console.error("You must specify a network, either steem or golos");
        process.exit(1);
    }
}

var add_deposit = function(xfr,done){
    console.log(xfr);
    db.func("add_fiat_money",[xfr.memo,xfr.currency,xfr.amount,xfr.id])
    .then((res)=>{
        console.log(JSON.stringify(res));
        if(done){
            process.exit(0);
        }
    })
    .catch((err)=>{
        console.error(err);
        if(done){
            process.exit(0);
        }
    });
}

var processHistory = function(err,history){

    //console.log(err,history);
    if(err){
        console.error("Websocket crashed, exiting now! ",err);
        return;
    }

    if(history.length){
        db.any("SELECT reason FROM deposits_other")
        .then((results)=>{
            console.log(results);
            let deposits =[];
            results.forEach((result)=>{
                let deposit = result.reason;
                deposits.push(deposit);
                console.log(deposit);
            });
            
            let transfers = []
            history.forEach((obj,idx,arr)=>{
                if(obj[1].op[0] == "transfer"){
                    let xfr = obj[1].op[1];
                    if(xfr.from == me){
                        return false;
                    }
                    
                    xfr.id = obj[1].trx_id;
                    console.log("Found an incoming transfer!,"+xfr.id+" checking to see if it's new.");
                    if(deposits.indexOf(xfr.id) != -1){
                        console.log("We've seen it before");
                        return false;
                    }else{
                        console.log("Looks new!");
                    }

                    xfr.timestamp = obj[1].timestamp;
                    xfr.block = obj[1].block;
                    let amount, currency;
                    let tmp = xfr.amount.split(" ");
                    xfr.amount = tmp[0];
                    xfr.currency = tmp[1] != "" ? tmp[1].toUpperCase() : "";


                    console.log(xfr);
                    //Check the DB for the transaction hash first and 
                    //bail out if we've seen it before
                    if(xfr.from !== me && xfr.to == me){
                        if(xfr.memo != ""){
                            if(!isNaN(xfr.memo)){
                                transfers.push(xfr);
                            }else{
                                return false;
                            }
                        }else{
                            return false;
                        }
                    
                    }else{
                        return false;
                    } 
                }
            });
            if(transfers.length >0){
                console.log("There are "+transfers.length+" new transfers to process...");
                transfers.forEach((xfr,idx)=>{
                    add_deposit(xfr,(idx == transfers.length -1));
                });   
            }else{
                process.exit(0);
            }
        });
    }
}

steem.api.start();
steem.api.getAccountHistory(config.account,Number.MAX_SAFE_INTEGER,2000,processHistory);
