import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
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

        {/* Link the PWA manifest file */}
        <link rel="manifest" href="/manifest.json" />

        <link
          rel="CatanBalancer48-transparent"
          sizes="48x48"
          href="/CatanBalancer48-transparent.png"
        />
        <link
          rel="CatanBalancer120-transparent"
          sizes="120x120"
          href="/CatanBalancer120-transparent.png"
        />
        <link
          rel="CatanBalancer152-transparent"
          sizes="152x152"
          href="/CatanBalancer152-transparent.png"
        />
        <link
          rel="CatanBalancer180-transparent"
          sizes="180x180"
          href="/CatanBalancer180-transparent.png"
        />

        {/* Bootstrap the service worker. */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

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

const sw = `
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
}
`;
