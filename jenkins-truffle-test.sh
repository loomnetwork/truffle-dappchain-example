#!/bin/bash

set -euo pipefail

sleep 10

echo ""
echo "==================================="
echo " Running truffle tests on $CLUSTER "
echo "==================================="
echo ""

yarn

CHAIN_ID=default

case $CLUSTER in

test-z-asia1.dappchains.com)
  CHAIN_ID=asia1
  CLUSTER=https://${CLUSTER}
  ;;
  
#gamechain-staging.dappchains.com|nocf-plasma.dappchains.com|plasma.dappchains.com)
#  CLUSTER=https://${CLUSTER}
#  ;;

gamechain.dappchains.com)
  CLUSTER=http://${CLUSTER}
  ;;

extdev-plasma-us1.dappchains.com)
  CHAIN_ID=extdev-plasma-us1
  CLUSTER=https://${CLUSTER}
  ;;

nocf-gamechain-staging.dappchains.com)
  CLUSTER=http://nocf-gamechain-staging.dappchains.com:46658
  ;;
  
ansible-lb-61f80af9a760db19.elb.us-west-2.amazonaws.com)
  CHAIN_ID=ansible
  CLUSTER="http://ansible-lb-61f80af9a760db19.elb.us-west-2.amazonaws.com:46658"
  ;;
  
loom-example-lb-faecfc39259a55ad.elb.ap-southeast-1.amazonaws.com)
  CLUSTER="http://loom-example-lb-faecfc39259a55ad.elb.ap-southeast-1.amazonaws.com:46658"
  ;;

loom-example-2-lb-fa56c3dc41defa92.elb.ap-southeast-1.amazonaws.com)
  CLUSTER="http://loom-example-2-lb-fa56c3dc41defa92.elb.ap-southeast-1.amazonaws.com:46658"
  ;;
  
*)
  CLUSTER=https://${CLUSTER}
  ;;

esac

echo CLUSTER URL: ${CLUSTER}

sed -ie "s|const chainId = 'default'|const chainId = '${CHAIN_ID}'|" truffle-config.js
sed -ie "s|http:\/\/127\.0\.0\.1:46658|${CLUSTER}|" truffle-config.js

echo "==================================="
echo " truffle-config.js                        "
echo "==================================="

cat truffle-config.js

wget -q http://private.delegatecall.com/loom/linux/latest/loom
chmod +x loom

for i in `seq 1 ${REPEAT}`; do

  echo ""
  echo "==================================="
  echo "Running loop $i..."
  echo "==================================="
  echo ""

  if [ "${CLUSTER}" != "extdev-plasma-us1.dappchains.com" ] || [ "${CLUSTER}" != "plasma.dappchains.com" ]; then
    ./loom genkey -k private_key -a public_key
  elif [ "${CLUSTER}" = "extdev-plasma-us1.dappchains.com" ]; then
    cat extdev-cluster-whitelist.txt
  elif [ "${CLUSTER}" = "plasma.dappchains.com" ]; then
    cat plasma-cluster-whitelist.txt
  fi

  yarn deploy

  yarn test

  yarn deploy:reset
  
  yarn test

  if [ ${REPEAT} -gt 1 ]; then
    echo "==================================="
    echo "Sleeping..."
    echo "==================================="

    sleep 15
  fi

done

