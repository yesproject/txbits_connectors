The first step is to follow the instructions in the parent directory.
Once that is done copy config.json.default to config.json and edit it to suit your settings.

If you're not supporting both golos and steem, make sure to go through and comment out the relevant sections.
Next do an npm install to download the dependencies.

Finally create a cron job to call steemservice.sh every couple of minutes and make sure to make it executable.
That's it!

Feel free to use this as a reference for how to connect your favorite currency and if you add some new currencies make sure to add it to it's own directly and share the love by submitting a PR.

Thanks!

p.s.  This does not update the crypto wallet balance at all.  Ideally that should be done in a balance.js script, but it's left as an exercise to the reader on how to do that.
All the needed pieces are there, it's up to you to put them together.