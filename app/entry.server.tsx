import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { addDocumentResponseHeaders } from "./shopify.server";
import { i18n } from "./i18n/i18next.server";
import { resources } from "./i18n/resources";
import { defaultNS, fallbackLng, supportedLngs } from "./i18n/config";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  // i18n: resolve o locale do request e inicializa uma instância isolada por request.
  const lng = await i18n.getLocale(request);
  const ns = i18n.getRouteNamespaces(remixContext);

  const instance = createInstance();
  await instance.use(initReactI18next).init({
    supportedLngs: [...supportedLngs],
    fallbackLng,
    defaultNS,
    resources,
    lng,
    ns,
    interpolation: { escapeValue: false },
    // useSuspense:false é essencial — o renderToPipeableStream não pode suspender.
    react: { useSuspense: false },
  });

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <RemixServer
          context={remixContext}
          url={request.url}
        />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
