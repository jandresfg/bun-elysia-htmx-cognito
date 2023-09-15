import html from "@elysiajs/html";
import { Elysia } from "elysia";
import * as elements from "typed-html";
import UserPool from "./UserPool";

const app = new Elysia()
  .use(html())
  .get("/", () => (
    <BaseHtml>
      <body class="flex flex-col space-x-2 w-full h-screen justify-center items-center">
        <h1>Bun + Elysia + htmx + cognito</h1>
        <div class="flex flex-row space-x-3">
          <button hx-get="/sign-up" hx-swap="outerHTML">
            sign up
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
  .post("/sign-up", ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (email.length === 0) {
      throw new Error("email cannot be empty");
    }
    if (password.length === 0) {
      throw new Error("password cannot be empty");
    }

    // attempt sign up
    // this fails because client was configured with secret, see https://stackoverflow.com/a/71287987/2109083
    UserPool.signUp(email, password, [], null, (err, result) => {
      if (err) {
        console.error(err);
      }
      console.log(result);
    });

    return <div>sign up attempted</div>;
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
