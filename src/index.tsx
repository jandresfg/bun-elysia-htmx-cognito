import {
  AdminConfirmSignUpCommand,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
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
          <button
            hx-get="/sign-up"
            hx-target="closest div"
            class="border border-black"
          >
            sign up
          </button>
          <button
            hx-get="/sign-up-admin"
            hx-target="closest div"
            class="border border-black"
          >
            sign up (admin)
          </button>
          <button
            hx-get="/sign-in"
            hx-target="closest div"
            class="border border-black"
          >
            sign in
          </button>
          <button
            hx-get="/sign-in-admin"
            hx-target="closest div"
            class="border border-black"
          >
            sign in (admin)
          </button>
          <button
            hx-get="/confirm-email"
            hx-target="closest div"
            class="border border-black"
          >
            confirm email
          </button>
          <button
            hx-get="/confirm-sign-up-admin"
            hx-target="closest div"
            class="border border-black"
          >
            confirm sign up (admin)
          </button>
          <button
            hx-get="/verify-email-admin"
            hx-target="closest div"
            class="border border-black"
          >
            verify email (admin)
          </button>
          <button
            hx-get="/change-password"
            hx-target="closest div"
            class="border border-black"
          >
            change password
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
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/sign-up-admin", () => (
    <form class="flex flex-col space-y-2" hx-post="/sign-up-admin">
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
        admin sign-up
      </button>
    </form>
  ))
  .post("/sign-up-admin", async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (password.length === 0) {
      return <div class="text-red-600">password cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
      },
    });

    const signUpCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID as string,
      Username: email,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    });
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      Password: password,
      Username: email,
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID as string,
      Permanent: true,
    });

    try {
      const signUpResponse = await client.send(signUpCommand);
      const setPasswordResponse = await client.send(setPasswordCommand);
      return (
        <div class="text-green-600">
          <h1>Sign up response:</h1>
          <pre>{JSON.stringify(signUpResponse, null, 3)}</pre>
          <h1>Set password response:</h1>
          <pre>{JSON.stringify(setPasswordResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
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
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/sign-in-admin", () => (
    <form class="flex flex-col space-y-2" hx-post="/sign-in-admin">
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
        sign-in (admin)
      </button>
    </form>
  ))
  .post("/sign-in-admin", async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (password.length === 0) {
      return <div class="text-red-600">password cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
      },
    });

    const clientSecret = process.env.AWS_COGNITO_APP_CLIENT_SECRET as string;
    const clientId = process.env.AWS_COGNITO_APP_CLIENT_ID as string;
    const hash = crypto
      .createHmac("sha256", clientSecret)
      .update(email.concat(clientId))
      .digest("base64");

    const signInCommand = new AdminInitiateAuthCommand({
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      ClientId: clientId,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
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
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/confirm-email", () => (
    <form class="flex flex-col space-y-2" hx-post="/confirm-email">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <input
        type="text"
        name="code"
        placeholder="code received"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        confirm
      </button>
    </form>
  ))
  .post("/confirm-email", async ({ body }) => {
    const { email, code } = body as { email: string; code: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (code.length === 0) {
      return <div class="text-red-600">code cannot be empty</div>;
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

    const signInCommand = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      SecretHash: hash,
    });

    try {
      const response = await client.send(signInCommand);
      return (
        <pre class="text-green-600">{JSON.stringify(response, null, 3)}</pre>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/confirm-sign-up-admin", () => (
    <form class="flex flex-col space-y-2" hx-post="/confirm-sign-up-admin">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        admin confirm
      </button>
    </form>
  ))
  .post("/confirm-sign-up-admin", async ({ body }) => {
    const { email } = body as { email: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
      },
    });

    const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID as string;

    // this confirms the sign up, but the email would still be unverified
    const adminConfirmSignUpCommand = new AdminConfirmSignUpCommand({
      Username: email,
      UserPoolId: userPoolId,
    });

    try {
      const confirmSignUpResponse = await client.send(
        adminConfirmSignUpCommand
      );
      return (
        <div class="text-green-600">
          <h1>Admin confirm sign up response:</h1>
          <pre>{JSON.stringify(confirmSignUpResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/verify-email-admin", () => (
    <form class="flex flex-col space-y-2" hx-post="/verify-email-admin">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        admin confirm
      </button>
    </form>
  ))
  .post("/verify-email-admin", async ({ body }) => {
    const { email } = body as { email: string };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
      },
    });

    const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID as string;

    // this makes the email verified
    const adminUpdateUserAttributesCommand =
      new AdminUpdateUserAttributesCommand({
        Username: email,
        UserPoolId: userPoolId,
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "True",
          },
        ],
      });

    try {
      const updateEmailVerifiedResponse = await client.send(
        adminUpdateUserAttributesCommand
      );
      return (
        <div class="text-green-600">
          <h1>Admin update email_verified response:</h1>
          <pre>{JSON.stringify(updateEmailVerifiedResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>{String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/change-password", () => (
    <form class="flex flex-col space-y-2" hx-post="/change-password">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <input
        type="text"
        name="oldPassword"
        placeholder="old password"
        class="border border-black"
      />
      <input
        type="text"
        name="newPassword"
        placeholder="new password"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        change password
      </button>
    </form>
  ))
  .post("/change-password", async ({ body }) => {
    const { email, oldPassword, newPassword } = body as {
      email: string;
      oldPassword: string;
      newPassword: string;
    };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }
    if (oldPassword.length === 0) {
      return <div class="text-red-600">old password cannot be empty</div>;
    }
    if (newPassword.length === 0) {
      return <div class="text-red-600">new password cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
      },
    });

    const hash = crypto
      .createHmac("sha256", process.env.AWS_COGNITO_APP_CLIENT_SECRET as string)
      .update(email.concat(process.env.AWS_COGNITO_APP_CLIENT_ID as string))
      .digest("base64");

    const signInCommand = new InitiateAuthCommand({
      ClientId: process.env.AWS_COGNITO_APP_CLIENT_ID as string,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: oldPassword,
        SECRET_HASH: hash,
      },
    });

    let signInResponse;
    try {
      signInResponse = await client.send(signInCommand);
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error validating old password: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      Password: newPassword,
      Username: email,
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID as string,
      Permanent: true,
    });

    try {
      const setPasswordResponse = await client.send(setPasswordCommand);
      return (
        <div class="text-green-600">
          <h1>Set password response:</h1>
          <pre>{JSON.stringify(setPasswordResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error setting new password: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
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
