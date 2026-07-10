import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
//
// The app is served from the "/catan" subpath. Hand-written absolute asset
// paths must include that base (the bundler only rewrites paths it manages).
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/catan/CatanBalancer120-transparent.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/catan/CatanBalancer152-transparent.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/catan/CatanBalancer180-transparent.png"
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}
