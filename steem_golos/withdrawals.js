var steem = require('steem');
var postgres = require("pg-promise")();
var config = require("./config.json");

var db = postgres(config);

var me = config.account;

var network;
var key;
var query;
const args = process.argv;

args.forEach((val)=>{
    if(val.indexOf("network") !== -1){
        network = val.split("=")[1];
    }
});


networks = {
    steem : {
        key : config.steemkey,
        endpoint : "wss://node.steem.ws"
    },
    golos : {
        key : config.goloskey,
        endpoint : "wss://node.golos.ws"
    }
}

function send_funds(pending){
    pending.forEach((withdrawal,idx)=>{
        let done = idx == pending.length -1;
        let network;
        switch (withdrawal.currency){
           case 'SBD' :
           case 'STEEM':
                network = networks['steem'];
           break;
           case 'GBG' :
           case 'GOLOS':
                network = networks['golos'];
           break;
           default :
                console.log("Unknown network for "+withdrawal.currency);
                return;
           break;
        }
        steem.api.setWebSocket(network.endpoint);
        console.log("sending "+withdrawal.expected+ " "+withdrawal.currency+" to "+withdrawal.address+" using key "+network.key);
        steem.broadcast.transfer(network.key, 'tradeqwik', withdrawal.address, withdrawal.expected+ " "+withdrawal.currency, withdrawal.id, (err, result)=>{
            if(err){
                console.error(err);
            }
            //Mark the transaction as complete and confirmed
            console.log(result);
            if(done){
                process.exit(0);
            }
        })(done);
    });
}
function process_results(results){
    let pending = [];
    results.forEach((result)=>{
        console.log("Processing: ",result);
        let withdrawal = {
            id: result.id,
            address: result.address.replace('@','').toLowerCase(),
            amount: parseFloat(result.amount),
            created: new Date(result.created),
            user_id: result.user_id,
            currency: result.currency,
            fee: parseFloat(result.fee) 
        }
        if(withdrawal.currency == 'USD'){
            withdrawal.currency = 'SBD';
        }
        if(withdrawal.currency == 'XAU'){
            withdrawal.currency = 'GBG';
        }
        withdrawal.expected = (withdrawal.amount - withdrawal.fee).toFixed(3);
        //Guard against sending crappy amounts from JS's absolutely shitty math skills
        if(withdrawal.expected >= 0.001 && withdrawal.expected <= 100000){
            pending.push(withdrawal);
        }
    });
    console.log(pending);
    send_funds(pending);
}

//Find addresses for pending withdrawals
db.query("select withdrawals_crypto.id, withdrawals_crypto.address,  withdrawals.amount, withdrawals.created, withdrawals.user_id, withdrawals.currency, withdrawals.fee from withdrawals_crypto join withdrawals on withdrawals.id=withdrawals_crypto.id WHERE withdrawals_crypto_tx_id is null order by currency ASC, amount DESC")
.then((results)=>{
    if(results.length == 0){
        //Nothing waiting
        process.exit(0);
    }
    console.log(results);
    db.func("create_withdrawal_tx",['SBD',0])
    .then((result)=>{
        console.log(result);
        networks['steem']['SBD'] = result.create_withdrawal_tx;
        db.func("create_withdrawal_tx",['STEEM',0])
        .then((result)=>{
            console.log(result);
            networks['steem']['STEEM'] = result.create_withdrawal_tx;
            db.func("create_withdrawal_tx",['GBG',0])
            .then((result)=>{
                console.log(result);
                networks['golos']['GBG'] = result.create_withdrawal_tx;
                db.func("create_withdrawal_tx",['GOLOS',0])
                .then((result)=>{
                    console.log(result);
                    networks['golos']['GOLOS'] = result.create_withdrawal_tx;
                    process_results(results);
                });
            });
        });
    });
});