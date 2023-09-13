import html from "@elysiajs/html";
import { Elysia } from "elysia";

const app = new Elysia()
  .use(html())
  .get("/", ({ html }) =>
    html(
      <baseHtml>
        <h1>Hello jsx</h1>
      </baseHtml>
    )
  )
  .listen(3333);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

const BaseHtml = ({ children }) => `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bun + Elysia + htmx + cognito</title>
</head>

<body>${children}</body>
`;
