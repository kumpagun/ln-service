const request = require("request");

const REST_HOST = "ec2-18-141-211-232.ap-southeast-1.compute.amazonaws.com:8080";
// const REST_HOST = "ip-172-31-8-254.local:8080";
// const REST_HOST = "localhost:8080";
const MACAROON_PATH =
  "0201036c6e6402f801030a10733fb91edd02ecb84d309ca402d68b831201301a160a0761646472657373120472656164120577726974651a130a04696e666f120472656164120577726974651a170a08696e766f69636573120472656164120577726974651a210a086d616361726f6f6e120867656e6572617465120472656164120577726974651a160a076d657373616765120472656164120577726974651a170a086f6666636861696e120472656164120577726974651a160a076f6e636861696e120472656164120577726974651a140a057065657273120472656164120577726974651a180a067369676e6572120867656e657261746512047265616400000620ac38cc5e2715fc8963f8278b90d9c068aece24ed63afadba55ccfda434ff62a9";

let options = {
  url: `${REST_HOST}/v1/aliases/list`,
  // Work-around for self-signed certificates.
  rejectUnauthorized: false,
  json: true,
  headers: {
    "Grpc-Metadata-macaroon": MACAROON_PATH,
  },
};

request.get(options, function (error, response, body) {
  console.log(error, response, body);
});
