import {
  AdminConfirmSignUpCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminInitiateAuthCommandOutput,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RevokeTokenCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Elysia } from "elysia";
import { cookie, SetCookieOptions } from "@elysiajs/cookie";
import { html } from "@elysiajs/html";
import crypto from "crypto";
import * as elements from "typed-html";

const AUTH_COOKIE_NAME = "auth";

function setAuthCookie(
  setCookie: (
    name: string,
    value: string,
    options?: SetCookieOptions | undefined
  ) => void,
  response: AdminInitiateAuthCommandOutput
) {
  const date = new Date();
  date.setDate(date.getDate() + 30); // 30 days from now (refresh token expiration date)

  setCookie(
    AUTH_COOKIE_NAME,
    JSON.stringify({
      AccessToken: response.AuthenticationResult?.AccessToken,
      IdToken: response.AuthenticationResult?.IdToken,
      RefreshToken: response.AuthenticationResult?.RefreshToken,
    }),
    {
      httpOnly: true,
      expires: date,
    }
  );
}

const app = new Elysia()
  .use(html())
  .use(cookie())
  .get("/cookie", async ({ setCookie, cookie }) => {
    const sampleTokensObject = {
      $metadata: {},
      AuthenticationResult: {
        AccessToken:
          "eyJraWQiOiIzMEt6Z3V6MjNvNjBraHFubDNYZ0Vkck9CMkpxV3FaWmREQ09Ud1F1NXpZPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwYzRjNDk0Zi1lZjc5LTQyOTQtYTkwMS0xZTg1ZGNlYTUzZDciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9rRW1vclJ2RUgiLCJjbGllbnRfaWQiOiI1N2gyN2JrOWQ3NWRrM3Y0a2k1c3ZwNWVyNiIsIm9yaWdpbl9qdGkiOiI3YmQ3YmU5Ni1mZDNiLTRlODAtYjAxZS1mOThlYWM4OWQ3ZjMiLCJldmVudF9pZCI6Ijc5NTc4NTI1LWI5OWYtNDE3ZC1iZWQ5LTIwNTgzZTU2NzdlMSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE2OTk5MzE3NDYsImV4cCI6MTY5OTkzNTM0NiwiaWF0IjoxNjk5OTMxNzQ2LCJqdGkiOiI0MzJhZjhjNy1hYmFhLTRkZjAtYmY4OS1iNGIzOGJkZDI4OTIiLCJ1c2VybmFtZSI6IjBjNGM0OTRmLWVmNzktNDI5NC1hOTAxLTFlODVkY2VhNTNkNyJ9.DF-1PxYTf-RJH-raQvNoBXspathEIj5nLn67AjN2w2P3WVxPfXuqz3CQ_g_F2QGgJilWvtM166QuIZMhgJss7ZDIVyuOWkmkN89L6bwM6tijJPxYGQ_M9yAktTyBpdVVbYAu-4SRiXh5RJMRfWn6_gBp2godU6Xisy3D4YfWBgOMjq5aIodCIZXt-gkP8klHbVNWmmpMRdtCwovbE17X_r8akb94rrLnROODcl9R_joIJKI1iKa-JufmDoFXogfb5pzdH5UCz0wJPIDvf_gOohKVWntzVNDg73LXMnJeH-8_F1866Smj9r8QTXWWBmPwsusrYuJrIo8kN0tpmw70-g",
        IdToken:
          "eyJraWQiOiJkSDNyR0pLY3RNTStFNjRweGFSYWVlSmRCcHYwd2Y0YnRmMUloYnhmYkswPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwYzRjNDk0Zi1lZjc5LTQyOTQtYTkwMS0xZTg1ZGNlYTUzZDciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfa0Vtb3JSdkVIIiwiY29nbml0bzp1c2VybmFtZSI6IjBjNGM0OTRmLWVmNzktNDI5NC1hOTAxLTFlODVkY2VhNTNkNyIsIm9yaWdpbl9qdGkiOiI3YmQ3YmU5Ni1mZDNiLTRlODAtYjAxZS1mOThlYWM4OWQ3ZjMiLCJhdWQiOiI1N2gyN2JrOWQ3NWRrM3Y0a2k1c3ZwNWVyNiIsImV2ZW50X2lkIjoiNzk1Nzg1MjUtYjk5Zi00MTdkLWJlZDktMjA1ODNlNTY3N2UxIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2OTk5MzE3NDYsIm5hbWUiOiJhbmRyZXMgZmVybmFuZGV6IiwiZXhwIjoxNjk5OTM1MzQ2LCJpYXQiOjE2OTk5MzE3NDYsImp0aSI6ImY2NmMwMWI2LWNhNmItNGRlYi05NzIwLWE4NGMyNjM1YzViNCIsImVtYWlsIjoiYW5kcmVzLmZlcm5hbmRleituYW1lQG1lZGxpZnkuY29tIn0.U0Nh-r2iyfN3ijiMAULzJ-auxvBrNYE7eJdba0_aTarrd0PCN_QuXD_XWREikKNu3XmPlld6JUqRSNJQ1k_APrugj4TW9xJoeUHywtgMNGFiSnPhSE0lQyr6TjeG5Y2aJjJokNoUeubwP5Q83fbsc15O2jt6Oh90OjA7nU0JssGDBSYc7H1ehM5hDTQSXxJS6zC8ycRJVj5dJjSqYL59powx6W_TBQP-0Hd6mimuLZbbmRqjNU1K8z3erVpfjH0fGueSTMdVJocLZqfo-9wN5aM4g-_Mrf_5HzvcHERoa_HwOhObPp_xyZKPHk9lypypzgmFAmjHVtgGIZNKbvn5XA",
        RefreshToken:
          "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.ZuOFKONeG0_g04RKQWPdN4SyJhll1oorHP9rqRCBMIHtG_8fHobmFBAN6c_ykTzaAyNWf7AcuXPwugJO8S6eHV02VvFuyI1kSYxCOQUUniHz_Yq3fnykVb_nDS4w786HlBNL0hbvHO69VCxBVSIKvki9ggHYpjPaO0fFNAi2eUYOofH7a8v3FcRXYFnuO2ekgfWhSePmGzY1vkawuEzzqzDoIDIfg1mdV0s7NxEy-AiLA08eSaQyGHKcH-cnDzVGuepgM_1S8PWGpqbvTe8H7LgMY5k_pXsvxd3u3fNlSUCVRumvm7nF8u-yY84u5kOiETDqpqUokAynrB9FqBjxxA.rMwbEC-wO2_no7ja.y9BM0gN26hT-poilRZuEamipKT4XCi_AtNHBbT-YZh4hSSCJXQzPJL2laNHAYAc6WLzOZ2QucrPoK-H02ZoKW369eWnv6lRfwPJfNLKvpY8qOGGVxsgEXGsDqsYGAHwKp1WZ_zcdIA22Yr5xUuIAQowmwZ_XiEeQZD9rnoofFRveJ8boWLnhSkW-BkjfGb5CNAL4MCu_Tc3SrEuLPcmi0S0POq-F-hQNcKuueZCTbB2GQeTNCmOheWYffJkf3MDw4PAfygGK1Gq74INsyOSP9rMVQGGhreatAKIFmsIenywkSxpRxEjiNOfoWo4LqxOHD_ao1k9dtovM9aoVTt_fQb5EnQTvpLfpdUqhu9QbpbbVxRQM_EttoqXWc5njT4pwW2cV9jr5-JeXl8_Zh8XkWBkuUPnUtPNeyMBeoT08B8E1f8g5hjgJbKzHhWEAsInpTLuHuxjyV0a2ZAV8FmReRyOljRZiW_rZeN1GY20G4LUmM0Vbm6POpsZWz2CVQBLlPOegLXeP5rUddSaAv4jZVxYxelbVqRfa-JyXdUuL-B32f785zLt7ZgPkDZ4EHmfa2VEFfPWMlxj4FqDvAC666zQhDmrDQhBtj9hd8IdIKHq1c-TUKlRO2YygHGhufQXR22pLH099zGCTotxtPnFTZplXkSN78esA7ZmCfszPRMj-TNE5jKFpvGaUbFUFwDhRK6m_qdEiFFs1wtCyTAGX_fQVe2AE69yOTBElRDhZlnVV4KUSscnFIolg3xt0C78eZFXEo7Px17MYIENqOXxUf_9N9ysfr8nrJFFds7OdNt5QsYF36GF2lkQBloGUE-wTCzuHVYm4HVKdwHhy2lVxYLMdQuHnyu-v8QGsbDPgZ5zirGzfJxLlMIjYGfgslmu21TMMxmaxxPOGDarPz-y5HxthX9LzRLFD_yE-DTQ4jh8p2KzIVLuRZr-9FQFmNlOQI4AhBCl6ITyrKUKuoK0h_82tznLRl6ESIdGOMBm0lTrGFCfedgz97NbKrSmTNV1eKbxS_AuIZTiUVhWHGj9bHZJhOQU8qOcRuvgg7_C4FrWH3QLhIZ3t8nKZDHVRaFWsuFNVfKDJt9piKD343PrwvZtq5nOL3isaoZaIObMia7J6SXqv9761YKdKctYwjTmHaxCXgnmHannm8uwX-kKb8gb9-gygo98VzTQto-lt4k7yWGUVk3FxBM-MpPo7JelQqhMdLKDkMbHGWGDv8CFBZthc7NSiY9ZCDNXoPg1EfHS3vJ4VA6Ze-m48z4qAPIJrOE2g65KGhXpUZcR7pr2YhLZoHGBDj7ut43aSCG5myFsZWhu_zjXWUZPn0Fk.RqNhBbj4uaqNMLUtjKfObw",
        ExpiresIn: 3600,
        TokenType: "Bearer",
      },
    };
    setAuthCookie(setCookie, sampleTokensObject);
    return (
      <BaseHtml>
        <h1>cookie '{AUTH_COOKIE_NAME}' set to:</h1>
        <pre class="w-screen overflow-x-auto">
          {JSON.stringify(JSON.parse(cookie[AUTH_COOKIE_NAME]), null, 2)}
        </pre>
        <button
          class="border border-black w-fit"
          hx-delete="/cookie"
          hx-target="body"
        >
          delete cookie
        </button>
      </BaseHtml>
    );
  })
  .delete("/cookie", async ({ removeCookie }) => {
    removeCookie(AUTH_COOKIE_NAME);

    return <h1>cookie "{AUTH_COOKIE_NAME}" deleted</h1>;
  })
  .get("/", ({ cookie }) => (
    <BaseHtml>
      <body class="flex flex-col space-x-2 w-full h-screen justify-center items-center">
        <div hx-get="/cookie" hx-target="body">
          {cookie[AUTH_COOKIE_NAME] ? (
            <pre class="text-green-600 w-screen overflow-x-auto">
              "{AUTH_COOKIE_NAME}" cookie:{" "}
              {JSON.stringify(JSON.parse(cookie[AUTH_COOKIE_NAME]), null, 2)}
            </pre>
          ) : (
            <pre class="text-red-600 w-screen overflow-x-auto">
              "{AUTH_COOKIE_NAME}" cookie not found ❌
            </pre>
          )}
        </div>
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
          <button
            hx-get="/get-user-admin"
            hx-target="closest div"
            class="border border-black"
          >
            get user (admin)
          </button>
          <button
            hx-get="/refresh-token"
            hx-target="closest div"
            class="border border-black"
          >
            refresh token
          </button>
          <button
            hx-get="/revoke-token"
            hx-target="closest div"
            class="border border-black"
          >
            revoke token
          </button>
          <button
            hx-get="/passwordless-sign-in"
            hx-target="closest div"
            class="border border-black"
          >
            passwordless sign in (admin)
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
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
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
  .post("/sign-in-admin", async ({ body, setCookie }) => {
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
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
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
      setAuthCookie(setCookie, response);
      return (
        <pre class="text-green-600 w-screen overflow-x-auto">
          {JSON.stringify(response, null, 3)}
        </pre>
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
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
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
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
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
  .get("/get-user-admin", () => (
    <form class="flex flex-col space-y-2" hx-post="/get-user-admin">
      <input
        type="text"
        name="email"
        placeholder="email"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        get user
      </button>
    </form>
  ))
  .post("/get-user-admin", async ({ body }) => {
    const { email } = body as {
      email: string;
    };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });

    const getUserCommand = new AdminGetUserCommand({
      Username: email,
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID as string,
    });

    try {
      const getUserResponse = await client.send(getUserCommand);
      return (
        <div class="text-green-600">
          <h1>Get user response:</h1>
          <pre>{JSON.stringify(getUserResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error getting user: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/refresh-token", () => (
    <form class="flex flex-col space-y-2" hx-post="/refresh-token">
      <input
        type="text"
        name="sub"
        placeholder="sub"
        class="border border-black"
      />
      <input
        type="text"
        name="refreshToken"
        placeholder="refresh token"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        refresh token
      </button>
    </form>
  ))
  .post("/refresh-token", async ({ body }) => {
    const { sub, refreshToken } = body as {
      sub: string;
      refreshToken: string;
    };
    if (refreshToken.length === 0) {
      return <div class="text-red-600">refresh token cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });

    const hash = crypto
      .createHmac("sha256", process.env.AWS_COGNITO_APP_CLIENT_SECRET as string)
      .update(sub.concat(process.env.AWS_COGNITO_APP_CLIENT_ID as string))
      .digest("base64");

    const refreshTokenCommand = new AdminInitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: process.env.AWS_COGNITO_APP_CLIENT_ID as string,
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID as string,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: hash,
      },
    });

    try {
      const refreshTokenResponse = await client.send(refreshTokenCommand);
      return (
        <div class="text-green-600">
          <h1>refresh token response:</h1>
          <pre>{JSON.stringify(refreshTokenResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error refreshing token: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/revoke-token", () => (
    <form class="flex flex-col space-y-2" hx-post="/revoke-token">
      <input
        type="text"
        name="refreshToken"
        placeholder="refresh token"
        class="border border-black"
      />
      <button type="submit" class="border border-black w-fit">
        revoke token
      </button>
    </form>
  ))
  .post("/revoke-token", async ({ body }) => {
    const { refreshToken } = body as {
      refreshToken: string;
    };
    if (refreshToken.length === 0) {
      return <div class="text-red-600">refresh token cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });

    const revokeTokenCommand = new RevokeTokenCommand({
      ClientId: process.env.AWS_COGNITO_APP_CLIENT_ID as string,
      ClientSecret: process.env.AWS_COGNITO_APP_CLIENT_SECRET as string,
      Token: refreshToken,
    });

    try {
      const revokeTokenResponse = await client.send(revokeTokenCommand);
      return (
        <div class="text-green-600">
          <h1>revoke token response:</h1>
          <pre>{JSON.stringify(revokeTokenResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error revoking token: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .get("/passwordless-sign-in", () => (
    <>
      <form class="flex flex-col space-y-2" hx-post="/passwordless-sign-in">
        <div>
          Make sure you have set up the Define auth challenge Lambda trigger and
          other user pool configurations (
          <a
            class="text-blue-600"
            href="https://medium.com/@phamduchoang.eee/aws-cognito-sign-in-passwordless-cfe6eb7f61b4"
          >
            more details
          </a>
          )
        </div>
        <input
          type="text"
          name="email"
          placeholder="email"
          class="border border-black"
        />
        <button type="submit" class="border border-black w-fit">
          passwordless sign in (admin)
        </button>
      </form>
    </>
  ))
  .post("/passwordless-sign-in", async ({ body, setCookie }) => {
    const { email } = body as {
      email: string;
    };
    if (email.length === 0) {
      return <div class="text-red-600">email cannot be empty</div>;
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      // credentials are needed only for admin commands such as the ones we're about to perform
      credentials: {
        accessKeyId: process.env.AWS_COGNITO_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_COGNITO_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });
    const hash = crypto
      .createHmac("sha256", process.env.AWS_COGNITO_APP_CLIENT_SECRET as string)
      .update(email.concat(process.env.AWS_COGNITO_APP_CLIENT_ID as string))
      .digest("base64");

    const passwordlessSignInCommand = new AdminInitiateAuthCommand({
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      ClientId: process.env.AWS_COGNITO_APP_CLIENT_ID,
      AuthFlow: "CUSTOM_AUTH",
      AuthParameters: {
        USERNAME: email,
        SECRET_HASH: hash,
      },
    });

    try {
      const passwordlessSignInResponse = await client.send(
        passwordlessSignInCommand
      );
      setAuthCookie(setCookie, passwordlessSignInResponse);
      return (
        <div class="text-green-600 w-screen overflow-x-auto">
          <h1>passwordless sign in response:</h1>
          <pre>{JSON.stringify(passwordlessSignInResponse, null, 3)}</pre>
        </div>
      );
    } catch (error) {
      return (
        <div class="text-red-600">
          <h1>Error doing passwordless sign in: {String(error)}</h1>
          <pre>{JSON.stringify(error, null, 3)}</pre>
        </div>
      );
    }
  })
  .listen(3333);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
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
