# Swarmbot

An experimental bot for swarmfight. It's running on the official server at <http://swarmfight.com>.

# Usage

If you want to launch two bots, you can do so with this command line:

    $ node run_bots.js --url http://swarmfight.com/ --api-keys 1df3731e054b4a4d4e2c84c6da4790fb,8512c964d9166285f9095d382e49b7c1 --color red

This will launch the two bots. One with the api key `1df3731e054b4a4d4e2c84c6da4790fb` and another one with `8512c964d9166285f9095d382e49b7c1`.

# Api Keys

For testing, you may use one of those api-keys (the bots are named after citys):

* 1df3731e054b4a4d4e2c84c6da4790fb (Hamburg)
* 8512c964d9166285f9095d382e49b7c1 (Madrid)
* 5ef7720eaa92fc393441d6611ea9f622 (Peking)
* 1158a1ce5bbc89182776558c8ae7bcd7 (Washington) 
* d2a3c1a3752a1f74a94003a2b3e719b8 (Palma)
* 94daeb502689c83b48704fd830c24838 (Chicago)
* 3f81c006e9e8ed851c638281ed322f97 (Munich)
* cb7432fd099d3760b3fd6a7d2249fb1d (Vienna)

# Changelog

- 2012/03/03
  - handle the case, when no friend can be part of the aim. Result is: random target!
  - invalidate target position, if the color changed
  - added pathfinding
- 2012/02/29
  - refactored strategy into several functions
  - added debugging and renamed onTick into executeStrategy
  - executeStrategy will be only called, if the bot is not disabled and the bot is still on the field
  - refactored the SwarmFightBot into SwarmFightBot and Field
  - split up into run_bots.js, SwarmFightBot.js and HttpClient.js
  - new HttpClient-class, to have a replaceable server communication class
- 2012/02/28
  - initial release

# License

Copyright 2012 by DracoBlue (<http://dracoblue.net>) and licensed under the terms of MIT License.
