import html from "@elysiajs/html";
import { Elysia } from "elysia";
import * as elements from "typed-html";

const app = new Elysia()
  .use(html())
  .get("/", () => (
    <BaseHtml>
      <button hx-post="/clicked" hx-swap="outerHTML">
        click me
      </button>
    </BaseHtml>
  ))
  .post("/clicked", () => <div>hello from server</div>)
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
</head>

<body>${children}</body>
`;
