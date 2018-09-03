# Truffle DappChain Example

Simple example of Truffle interacting with Loom DappChain, this example uses [loom-truffle-provider](https://github.com/loomnetwork/loom-truffle-provider) (check LoomTruffleProvider repository for more details)

![](https://dzwonsemrish7.cloudfront.net/items/0a1N05043p1Y1G3K1Y2L/Screen%20Recording%202018-07-17%20at%2011.26%20AM.gif?v=df873ac3)


## Requirements

```bash
Node >= 8
```

## Install

In order to download the Truffle DAppChain Example there're two methods Git or Unbox

### Git method
```bash
git clone https://github.com/loomnetwork/truffle-dappchain-example
```

```bash
cd truffle-dappchain-example

yarn install
# or
npm install
```

### Unbox method
```bash
# Install Truffle if not installed
npm install -g truffle

mkdir truffle-dappchain-example
cd truffle-dappchain-example

truffle unbox loomnetwork/truffle-dappchain-example
```

## Start DappChain

```bash
# Download
wget https://private.delegatecall.com/loom/osx/build-404/loom
chmod +x loom

# Run
./loom init
./loom run
```

## Deploy Truffle

```bash
# On second terminal

# Deploy Migrations.sol and SimpleStore.sol
yarn deploy

# Running test on directory /test
yarn test
```

> In order to correctly redeploy the contracts there's a command "yarn deploy:reset"

> Also is possible to call truffle command directly by call "yarn truffle"

> We're not versioning the build directory for this particular example, although is recommended to versioning, the limitation can be removed by editing .gitignore

## Web interface

The web interface is build with React using webpack to compile and generate the page

```bash

# On a third terminal

yarn serve
```

The web interface will be available on http://localhost:8080

## Current limitations

* Events declared on smart contracts should have an named parameter like `NewValueSet(uint _value)` in the contract `SimpleStore.sol`. Also it helps to dealing with events

Loom Network
----
[https://loomx.io](https://loomx.io)


License
----

BSD 3-Clause License
