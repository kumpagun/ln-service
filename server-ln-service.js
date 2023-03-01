const { lightning, invoice, router, walletkit } = require("./lnd/lightning");
const SHA256 = require("crypto-js/sha256");
const crypto = require("crypto");
const lnService = require("ln-service");
const { extractTransaction, finalizePsbt } = require("psbt");
const tinysecp = require("tiny-secp256k1");
const { decodePsbt } = require("psbt");
const { Transaction } = require("bitcoinjs-lib");

const {
  createSeed,
  unauthenticatedLndGrpc,
  createChainAddress,
  fundPsbt,
  signPsbt,
  getChainAddresses,
  pay,
  payViaPaymentRequest,
  decodePaymentRequest,
  getUtxos,
  broadcastChainTransaction,
  partiallySignPsbt,
  unlockUtxo,
  getPeers,
} = lnService;
const fs = require("fs");
const address = "bc1qqlmf8g5w60gqlglrxxkl274j2sdqa58el0ljw6"; // อันนี้ address ของกันที่สร้างบน lnd ของอั๊มมีเงินอยู่

// เอาไว้ดูรายละเอียดของ lightning node
const getInfo = async (lnd) => {
  lnService.getWalletInfo({ lnd }, (err, result) => {
    console.log(err, result);
  });
  return {};
};

// สร้าง address
const createAddress = async (lnd) => {
  const format = "p2wpkh";
  const { address } = await createChainAddress({ format, lnd });
  return address;
};

const chainList = async (lnd) => {
  getChainAddresses({ lnd }, (err, result) => {
    console.log(err, result);
  });
};

const getTransactions = async (lnd) => {
  const { transactions } = await lnService.getChainTransactions({ lnd });
  console.log(transactions);
};

// Unspent Transaction Output หรือ UTXO หมายถึง จำนวนเงินดิจิทัลที่เหลือจากการทำธุรกรรมคริปโตฯ เปรียบได้กับเงินทอน ที่สามารถนำไปใช้ในธุรกรรมถัดไปได้
const getListUnspend = async (lnd) => {
  const { utxos } = await getUtxos({ lnd });
  return utxos;
};

// สร้าง PSBT
const createPsbt = async (lnd, address) => {
  const [utxo] = (await getUtxos({ lnd })).utxos;
  const ecp = (await import("ecpair")).ECPairFactory(tinysecp);
  const tokens = 20000;
  const funded = await fundPsbt({
    lnd,
    inputs: [
      {
        transaction_id: utxo.transaction_id,
        transaction_vout: utxo.transaction_vout,
      },
    ],
    outputs: [{ address, tokens }],
  });

  console.log(`fundPsbt`);
  console.log(funded);
  const finalized = await signPsbt({ lnd: lnd, psbt: funded.psbt });
  console.log(`finalized`);
  console.log(finalized);
  const tx = Transaction.fromHex(finalized.transaction);
  console.log(`tx`);
  console.log(tx);

  return { psbt: finalized, transaction: tx };
};

// ขั้นตอนการสร้าง psbt
const startPSBT = async (lnd) => {
  try {
    // ดูเหรียญที่สามารถส่งได้ทั้งหมด ถ้าเรามี address ในใจแล้ว
    const listUnspend = await getListUnspend(lnd);
    let balance = 0;
    listUnspend.map((val) => {
      if (val.address == address && val.confirmation_count > 0)
        balance += val.tokens;
    });
    console.log(balance);
    if (balance < 20000) throw "tokens < 20,000";
    // Creating/funding a PSBT and Signing and finalizing a PSBT
    const datas = await createPsbt(lnd, address);

    return datas;
  } catch (error) {
    console.log(error);
  }
};

// สร้าง Channel
const openPendingChannel = async (lnd, psbt) => {
  const { fundPendingChannels, openChannels } = require("ln-service");
  const publicKey =
    "026165850492521f4ac8abd9bd8088123446d126f648ca35e60f88177dc149ceb2";
  const hostIp = "104.196.200.39";
  const portNumber = 9735;
  const socket = hostIp + ":" + portNumber;
  const tokens = 20000;
  const channelsToOpen = [
    { capacity: tokens, partner_public_key: publicKey, partner_socket: socket },
  ];
  openChannels(
    { lnd, channels: channelsToOpen },
    async function (err, response) {
      console.log(err, response);
      const channels = response.pending.map((n) => n.id);
      console.log(channels);
      fundPendingChannels(
        { lnd, channels, funding: psbt },
        function (fund_err, fund_res) {
          console.log(fund_err, fund_res);
        }
      );
    }
  );
};

const start = async function () {
  const HOST = "ec2-18-141-211-232.ap-southeast-1.compute.amazonaws.com:10009";
  const MACAROON_HEX =
    "0201036c6e6402f801030a10733fb91edd02ecb84d309ca402d68b831201301a160a0761646472657373120472656164120577726974651a130a04696e666f120472656164120577726974651a170a08696e766f69636573120472656164120577726974651a210a086d616361726f6f6e120867656e6572617465120472656164120577726974651a160a076d657373616765120472656164120577726974651a170a086f6666636861696e120472656164120577726974651a160a076f6e636861696e120472656164120577726974651a140a057065657273120472656164120577726974651a180a067369676e6572120867656e657261746512047265616400000620ac38cc5e2715fc8963f8278b90d9c068aece24ed63afadba55ccfda434ff62a9";
  const TLS_PATH = "lnd/tls.cert";

  // Connect LND
  const { lnd } = lnService.authenticatedLndGrpc({
    cert: fs.readFileSync(TLS_PATH).toString("hex"),
    macaroon: MACAROON_HEX,
    socket: HOST,
  });

  // const address = await createAddress(lnd);
  // console.log(`Your address is: ${address}`);

  const data_psbt = await startPSBT(lnd);

  // อันนี้กันจะเอาไว้เทสเปิด channel บน lnd ของอั๊มกำลังอยู่ในช่วงเทสอยู่
  // await openPendingChannel(lnd);
};

start();
