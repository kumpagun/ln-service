const { lightning, invoice, router, walletkit } = require("./lnd/lightning");
const SHA256 = require("crypto-js/sha256");
const crypto = require("crypto");
const bip39 = require("bip39");
const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");
const bip32 = BIP32Factory(ecc);
const bitcoinjs = require("bitcoinjs-lib");
const Connection = bitcoinjs.networks["mainnet"];
const ecpair = require("ecpair");
const ECPair = ecpair.ECPairFactory(ecc);

const getInfo = async () => {
  let request = {};
  await lightning.getInfo(request, async function (err, response) {
    console.log(err, response);
    if (err) console.log(err);
    if (response) {
      return response;
    }
  });
};

const getAccounts = () => {
  let request = {};
  walletkit.listChannels(request, function (err, response) {
    console.log(err, response);
  });
};

const getNewAddress = () => {
  let request = {
    type: 0, // p2wkh
  };
  lightning.newAddress(request, function (err, response) {
    console.log(err, response);
    if (err) console.log(err);
    if (response) {
      return response;
    }
  });
};

const listAccounts = () => {
  let request = {};
  walletkit.listAddresses(request, function (err, response) {
    console.log(err, response);
    if (err) console.log(err);
    if (response) {
      return response;
    }
  });
};

const getWalletBalance = () => {
  lightning.walletBalance({}, function (err, response) {
    console.log(err, response);
    if (err) console.log(err);
    if (response) {
      return response;
    }
  });
};

const getChannels = async () => {
  let request = {
    active_only: 1,
    inactive_only: 0,
    public_only: 0,
    private_only: 0,
    peer: "",
  };
  await lightning.listChannels(request, function (err, response) {
    if (err) console.log(err);
    if (response) {
      return response;
    }
  });
};

const createHoldInvoice = async () => {
  const secret = crypto.randomBytes(32);
  const hash = crypto.createHash("sha256").update(secret).digest();

  // Payment request expiry time in seconds. Default is 86400 (24 hours).
  let request = {
    memo: "Gun's invoice for test",
    hash: hash,
    value: 100,
    value_msat: 0.00001,
    description_hash: crypto
      .createHash("sha256")
      .update("Gun's invoice for test")
      .digest(),
    expiry: 3600,
    cltv_expiry: 65535,
    route_hints: [],
    private: 0,
  };
  await invoice.addHoldInvoice(request, function (err, response) {
    if (err) console.log(err);
    if (response) {
      // const hexString = response.payment_addr.toString("hex");
      console.log(response.payment_request);
      // payment_request
      // payment_addr
      return response;
    }
  });
};

const getPayRequest = (payment_request) => {
  let request = {
    pay_req: payment_request,
  };
  lightning.decodePayReq(request, function (err, response) {
    console.log(err, response);
  });
};

const lookupInvoice = (payment_hash) => {
  let request = {
    payment_hash: payment_hash,
    payment_addr: Buffer.from(payment_hash, "hex"),
    lookup_modifier: 0,
  };
  invoice.lookupInvoiceV2(request, function (err, response) {
    console.log(err, response);
  });
};

const sendPayment = async (payment_request) => {
  let request = {
    pay_req: payment_request,
  };
  const pubkey =
    "0387a0ef625c59ee735a6eef7483760b2d75db11bf707d9be79c7f593678eb5b62";
  lightning.decodePayReq(request, function (err, response) {
    if (response) {
      let request = {
        dest: Buffer.from(pubkey, "hex").toString('base64'),
        payment_addr: response.payment_addr,
        payment_request: payment_request,
        timeout_seconds: response.expiry,
        route_hints: response.route_hints,
        allow_self_payment: 1,
        no_inflight_updates: 0,
        amp: 1,
        time_pref: 1,
        outgoing_chan_id: "852906562929950720",
        amt: response.num_satoshis,
      };
      // console.log(response)
      console.log(request);
      let call = router.sendPaymentV2(request);
      call.on("data", function (response) {
        // A response was received from the server.
        console.log(response);
      });
      call.on("status", function (status) {
        // The current status of the stream.
        console.log(status);
      });
      call.on("end", function (err) {
        // The server has closed the stream.
        console.log(err);
      });
    }
  });
};

const start = async function () {
  const payment_request =
    "lnbc1u1p3lwn6mpp5xtd685fxp8fyja34sx05esp8c8ha8670yu9q7c6f5004232chmmsdq2w3jhxapqxgcqzpgxqrrsssp5fcw0nthnrxlgqkqek28aeyj26weugtftulpvwmdncm8mxjg5tw9s9qyyssqqd0txqrjwrwaztxh55ammmgh7rapz8s80adv6ugj0c5c8kszzcsrkjscvnz7l0g4dfmfhjn9jmshaza3hal3hkws2grsykcs7543yggqq6x8e2";
  const pubkey =
    "0387a0ef625c59ee735a6eef7483760b2d75db11bf707d9be79c7f593678eb5b62";
  // getInfo();
  // getWalletBalance();
  // listAccounts();
  // createHoldInvoice();
  // getChannels();
  const datas = await sendPayment(payment_request);
  // const result = await getPayRequest(payment_request);
};

start();
