import * as express from "express";
import * as cors from 'cors';
import { http } from ".";
import { VERSION } from "../config";

const PORT = process.env.PORT || 3004;

const parsePackage = function(rawPackage:string) {
  const dotSplittedSub = rawPackage.split('.');
  dotSplittedSub.pop();

  const removedJsonPath = dotSplittedSub.join('.');

  const slantSplittedSub = removedJsonPath.split('/');
  const version = slantSplittedSub.pop();

  return slantSplittedSub.join('/') + `@${version}`;
};

const app = express();
app.use(cors());
// @ts-ignore
app.use(express.json());
// @ts-ignore
app.use(express.urlencoded());

app.get(`/v${VERSION}/packages/*`, (req, res) => {
  const rawPackage = req.params[0];
  http(
    {
      pathParameters: {
        packages: parsePackage(rawPackage)
      },
    },
    null,
    (error, data) => {
        res.send(data);
    },
  );
});

app.post(`/*`, (req, res) => {
  const rawPackage = decodeURIComponent(req.params[0]);
  
  http(
    {
      pathParameters: {
        packages: rawPackage
      },
    },
    null,
    (error, data) => {
        res.send(data);
    },
  );
});

app.listen(PORT, () => {
  console.log("API Listening on " + PORT);
});
