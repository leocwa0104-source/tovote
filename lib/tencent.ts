import * as tencentcloud from "tencentcloud-sdk-nodejs";

const SesClient = tencentcloud.ses.v20201002.Client;

// Use environment variables for credentials
// If not provided, it will fail when trying to send, which is expected behavior
const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID || "",
    secretKey: process.env.TENCENT_SECRET_KEY || "",
  },
  region: process.env.TENCENT_REGION || "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "ses.tencentcloudapi.com",
    },
  },
};

export const sesClient = new SesClient(clientConfig);
