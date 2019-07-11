
# Truffle DappChain Example

This simple example shows how you can use `Truffle` and the [Loom Truffle Provider](https://github.com/loomnetwork/loom-truffle-provider) to build a simple Web UI that interacts with the Loom PlasmaChain.

![](https://dzwonsemrish7.cloudfront.net/items/0a1N05043p1Y1G3K1Y2L/Screen%20Recording%202018-07-17%20at%2011.26%20AM.gif?v=df873ac3)


## Requirements

Make sure the following requirements are met and then follow the steps in the next section:

```text
Recommended Node version v10.15.3
yarn or npm
```

## Install

First, let's clone this repository. Open a terminal, `cd` into the directory where you store your projects, and run the following command:

```bash
git clone https://github.com/loomnetwork/truffle-dappchain-example
```

Next, `cd` into `truffle-dappchain-example`:

```bash
cd truffle-dappchain-example
```

and run:

```bash
yarn install
```

## Run against Loom Testnet

### Generate the Loom private key

The following command will download the `loom` binary and generate the private key for you:

```bash
yarn gen:extdev-key
```

This will download the loom binary and generate a private key. The private key will be saved into a file called `extdev_private_key`.


### Deploy to extdev_plasma_us1

As an example, we will deploy and run our application against `extdev_plasma_us1`.

Run the following command:

```bash
yarn deploy:extdev
```

>The above command will **compile and then deploy** our smart contract to `extdev_plasma_us1`


### Test

Run this command below to send transactions to the smart contract deployed to `extdev_plasma_us1`:


```test
yarn test:extdev
```

If everything looks good, let's spin up a web server and interact with our smart contract.

### Start the web interface

The web interface is built with React and Webpack. Open a new terminal and run the following command:

```bash
yarn serve:extdev
```

> The web interface is available on http://localhost:8080.



## Run against local Loom chain

First, you have to generate a private key using:

```bash
yarn gen:loom-key
```

This will download the loom binary and write a private key to a file called  `loom_private_key`

### Spin up Loom Chain

In a new terminal, run:

```bash
yarn loom:init
```

and then:

```bash
yarn loom:run
```

### Deploy the smart contract

To deploy, run the following command:

```bash
yarn deploy
```

### Test


```bash
yarn test
```

## Web interface

We're ready to start the web server. In a new terminal, run:

```bash
yarn serve
```

## Useful information

1. In order to correctly redeploy the contracts, there's a command `yarn deploy:reset`.

2. Also is possible to call truffle command directly with `yarn truffle`.

2. We're not versioning the build directory for this particular example, although is recommended to versioning, the limitation can be removed by editing the `.gitignore` file.


## Current limitations

* Events declared on smart contracts should have an named parameter like `NewValueSet(uint _value)` in the contract `SimpleStore.sol`. Also, it helps in dealing with events.

Loom Network
----
[https://loomx.io](https://loomx.io)


License
----

BSD 3-Clause License
