# Truffle DappChain Example

Simple example of Truffle interacting with Loom DappChain, this example uses [loom-truffle-provider](https://github.com/loomnetwork/loom-truffle-provider) (check LoomTruffleProvider repository for more details)

## Requirements

```bash
Node >= 8
```

## Install

Download the Truffle DappChain Example

```bash
git clone https://github.com/loomnetwork/truffle-dappchain-example
```

```bash
cd truffle-dappchain-example

yarn install
# or
npm install
```

## Start DappChain

```bash
# Download
wget https://storage.googleapis.com/private.delegatecall.com/loom/osx/build-161/loom
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

## Current limitations

* Events declared on smart contracts should have an named parameter like `NewValueSet(uint _value)` in the contract `SimpleStore.sol`. Also it helps to dealing with events

* Loom Truffle Provider is currently compatible only with Truffle `v4.1.8`. Support for newer versions will be added soon.

Loom Network
----
[https://loomx.io](https://loomx.io)


License
----

BSD 3-Clause License
