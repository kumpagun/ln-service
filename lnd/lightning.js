const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const GRPC_HOST =
  "ec2-18-141-211-232.ap-southeast-1.compute.amazonaws.com:10009";
const MACAROON_HEX =
  "0201036c6e6402f801030a10733fb91edd02ecb84d309ca402d68b831201301a160a0761646472657373120472656164120577726974651a130a04696e666f120472656164120577726974651a170a08696e766f69636573120472656164120577726974651a210a086d616361726f6f6e120867656e6572617465120472656164120577726974651a160a076d657373616765120472656164120577726974651a170a086f6666636861696e120472656164120577726974651a160a076f6e636861696e120472656164120577726974651a140a057065657273120472656164120577726974651a180a067369676e6572120867656e657261746512047265616400000620ac38cc5e2715fc8963f8278b90d9c068aece24ed63afadba55ccfda434ff62a9";
const TLS_PATH = "lnd/tls.cert";

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(
  [
    "lnd/lightning.proto",
    "lnd/invoicesrpc/invoices.proto",
    "lnd/routerrpc/router.proto",
    "lnd/signrpc/signer.proto",
    "lnd/walletrpc/walletkit.proto",
  ],
  loaderOptions
);
const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc;
const invoicesrpc = grpc.loadPackageDefinition(packageDefinition).invoicesrpc;
const routerrpc = grpc.loadPackageDefinition(packageDefinition).routerrpc;
const walletrpc = grpc.loadPackageDefinition(packageDefinition).walletrpc;
const signrpc = grpc.loadPackageDefinition(packageDefinition).signrpc;

process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";
const tlsCert = fs.readFileSync(TLS_PATH);
// const test = fs.readFileSync(TLS_PATH).toString("hex");
const sslCreds = grpc.credentials.createSsl(tlsCert);
const macaroon = MACAROON_HEX;
const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (
  args,
  callback
) {
  let metadata = new grpc.Metadata();
  metadata.add("macaroon", macaroon);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(
  sslCreds,
  macaroonCreds
);
const lightning = new lnrpc.Lightning(GRPC_HOST, creds);
const invoice = new invoicesrpc.Invoices(GRPC_HOST, creds);
const router = new routerrpc.Router(GRPC_HOST, creds);
const singer = new signrpc.Signer(GRPC_HOST, creds);
const walletkit = new walletrpc.WalletKit(GRPC_HOST, creds);

module.exports = {
  lightning,
  invoice,
  router,
  walletkit,
  singer,
};
