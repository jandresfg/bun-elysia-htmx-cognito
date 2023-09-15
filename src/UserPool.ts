import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData = {
  // personal
  UserPoolId: "us-east-2_G9iAT1N63",
  ClientId: "3393ih1cu96j3n7hm2dfdjtd55",
};

export default new CognitoUserPool(poolData);
