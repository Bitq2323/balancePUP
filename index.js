const bitcoin = require('bitcoinjs-lib');
const ElectrumClient = require('electrum-client');

// Example xpub converted from zpub
const xpub = 'xpub6CNxs8mWy9uKn8Ez8moBw9sk6iPmSBTCWhg6P4HDijRmpWyFkndkGAUbxQj3BrerzmxAbu4R7NvCiDPe7o3Dtop15SMik9pJCkYMohHanQ1';
const client = new ElectrumClient(50002, 'bolt.schulzemic.net', 'ssl');
const network = bitcoin.networks.bitcoin; // Make sure this is correct for your use case

// Add this function to convert zpub to a node compatible with segwit addresses
const zpubToNode = (zpub, network) => {
  const data = Buffer.from(zpub, 'base64');
  // Modify the version bytes to make it compatible with bitcoinjs-lib
  data.writeUInt32BE(network.bip32.public, 0);
  return bitcoin.bip32.fromBuffer(data, network);
};

// Correct approach to derive addresses from zpub
const deriveAddresses = (xpub, network, from, to) => {
    let node = bitcoin.bip32.fromBase58(xpub, network); // Use the converted xpub here
    let addresses = [];
    for (let i = from; i < to; i++) {
        let child = node.derive(0).derive(i);
        let { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network });
        addresses.push(address);
    }
    return addresses;
};
    
const checkTransactions = async (address) => {
  try {
    await client.connect();
    const script = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
    const hash = bitcoin.crypto.sha256(script);
    const reversedHash = Buffer.from(hash.reverse());
    const history = await client.blockchainScripthash_getHistory(reversedHash.toString('hex'));
    await client.close();
    return history.length > 0;
  } catch (error) {
    console.error('Error checking transactions:', error);
    await client.close();
    throw error;
  }
};

const main = async () => {
    try {
      let hasTransactions = true;
      let index = 0;
  
      while (hasTransactions) {
        // Use `xpub` here instead of `zpub`
        const addresses = deriveAddresses(xpub, bitcoin.networks.bitcoin, index, index + 1);
        console.log(`Checking transactions for address ${addresses[0]}...`);
        hasTransactions = await checkTransactions(addresses[0]);
        if (hasTransactions) {
          console.log(`Address ${addresses[0]} has transactions.`);
        } else {
          console.log(`Address ${addresses[0]} does not have transactions. Stopping.`);
        }
        index++;
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };
  
  main();
  