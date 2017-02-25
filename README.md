# txbits_connectors
Connectors to allow TxBits to interface with non-btc derived crypto currencies.

TxBits wasn't really designed to connect with crypto currencies which are not derived directly from BTC.
The connectors here are designed to allow easier connection between your TxBits based exchange and these other cryptos such a [STEEM](www.steemit.com/@tradeqwik) and [GOLOS](www.golos.io/@tradeqwik).

Be advised that these were created to work with [TradeQwik](www.tradeqwik.com) a real working exchange running on the TxBits platform. 
[TradeQwik](www.tradeqwik.com) like all real exchanges has some subtle but critical changes from TxBits.  

Therefore it is strongly advised that you do not use these connectors directly, but feel free to use them as a basis for your own and please feel free to commit connectors for your favorite crypto and submit them here.

It is important that you read the README for each connector to understand fully how it works.

**READ THIS ALL THE WAY THROUGH BEFORE PROCEDING!!!**

TxBits has a design based on an actor model, each of the wallet actors derives from a base that makes a lot of assumptions about your crypto currency.
Specifically it assumes all cryptos are derived from Bitcoin and as such the bitcoin4j RPC connector is used to do it's magic.

For coins which do not derive from bitcoin a whole different method must be used.

At [TradeQwik](www.tradeqwik.com) we use a monitor pattern instead of an actor pattern, for all of our wallets.
This allows the wallet and requisite connector logic to be on a completely different server and isolated from the rest of the exchange.

Because of the differences in actor and monitor patterns, we have to make a few hacks to make this work.

TxBits assumes that all cryptos are derived from bitcoin and as such, withdrawals are batched together into a single TX.
There is no way to change this without changing fundamentally how the DB works and deals with currency.

Thus non-btc derived cryptos such as GOLOS and STEEM, must come in the side door as it were.

We add 2 DB functions to facilitate this.

First step is to turn off evolutions, because this process will break evolutions and you'll be left with a mess.
Evolutions are for people that need to try out schema changes with an easy way to roll them back supposedly.
TradeQwik doesn't use this because of the overhead and the risk of loss of customer funds if an evolution fired.

Since you're going to be messing with your DB, it's easiest to simply take a dump of your DB.
´´´
pg_dump -cCO --inserts --if-exists -d tradeqwik > tradeqwik.dump.sql
cp tradeqwik.dump.sql original.sql
´´´

Unlike other databases, postgres has no penalty for character varying (VARCHAR) fields of any length.
Thus there is no point in keeping it stuck at 4.
Go through and expand the currency fields in your dump to taste.

Once this is done, open the steemservice.sql file and paste the contents into your DB dump somewhere in the functions section.

Next step is to reimport your database using psql or your favorite tool.

You now have 2 new stored functions, add_fiat_money and remove_fiat_money.
We're using fiat here to tell TxBits that it doesn't have an actor for these currencies.

Now you need to add the currencies and wallets to your database.
You can look in globals.scala for an example of what that looks like.
The process is 
select currency_insert('XXX',some offset);
insert into wallets_crypto(currency, last_block_read, balance_min, balance_warn, balance_target, balance_max) values('XXX', 42, 0, 0, 100, 1000);

You want to add crypto wallets for each currency you plan to support, in this case STEEM, SBD, GOLOS and GBG

From this point, you should add deposit and withdrawal fees as well as markets for your currencies, again check globals.scala in the main TxBits repository for examples of how this will work.

