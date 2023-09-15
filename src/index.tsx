import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import html from "@elysiajs/html";
import crypto from "crypto";
import { Elysia } from "elysia";
import * as elements from "typed-html";

const app = new Elysia()
  .use(html())
  .get("/", () => (
    <BaseHtml>
      <body class="flex flex-col space-x-2 w-full h-screen justify-center items-center">
        <h1>Bun + Elysia + htmx + cognito</h1>
        <div class="flex flex-row space-x-3">
          <button hx-get="/sign-up" hx-target="closest div">
            sign up
          </button>
          <button hx-get="/sign-in" hx-target="closest div">
            sign in
          </button>
        </div>
      </body>
    </BaseHtml>
  ))
  .get("/sign-up", () => (
    <form class="flex flex-col space-y-2" hx-post="/sign-up">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <input
        type="text"
        name="password"
        placeholder="password"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        sign-up
      </button>
    </form>
  ))
  .post("/sign-up", async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (password.length === 0) {
      return <div class="text-red-600">password cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });

    const clientSecret = process.env.AWS_COGNITO_APP_CLIENT_SECRET as string;
    const clientId = process.env.AWS_COGNITO_APP_CLIENT_ID as string;
    const hash = crypto
      .createHmac("sha256", clientSecret)
      .update(email.concat(clientId))
      .digest("base64");

    const signUpCommand = new SignUpCommand({
      ClientId: clientId,
      SecretHash: hash,
      Password: password,
      Username: email,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    });

    try {
      const response = await client.send(signUpCommand);
      return (
        <pre class="text-green-600">{JSON.stringify(response, null, 3)}</pre>
      );
    } catch (error) {
      return <div class="text-red-600">{error}</div>;
    }
  })
  .get("/sign-in", () => (
    <form class="flex flex-col space-y-2" hx-post="/sign-in">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <input
        type="text"
        name="password"
        placeholder="password"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        sign-in
      </button>
    </form>
  ))
  .post("/sign-in", async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (password.length === 0) {
      return <div class="text-red-600">password cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });

    const clientSecret = process.env.AWS_COGNITO_APP_CLIENT_SECRET as string;
    const clientId = process.env.AWS_COGNITO_APP_CLIENT_ID as string;
    const hash = crypto
      .createHmac("sha256", clientSecret)
      .update(email.concat(clientId))
      .digest("base64");

    const signInCommand = new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: hash,
      },
    });

    try {
      const response = await client.send(signInCommand);
      return (
        <pre class="text-green-600">{JSON.stringify(response, null, 3)}</pre>
      );
    } catch (error) {
      return <div class="text-red-600">{error}</div>;
    }
  })
  .listen(3333);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

const BaseHtml = ({ children }: elements.Children) => `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bun + Elysia + htmx + cognito</title>
  <script src="https://unpkg.com/htmx.org@1.9.5"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>

${children}
`;
