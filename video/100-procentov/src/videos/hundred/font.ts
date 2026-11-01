// Montserrat (Latin + Cyrillic, variable weight) served from public/fonts, so renders never depend on the network.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

export const FONT = "MontserratLocal";
const faces = [
  new FontFace(FONT, `url(${staticFile("fonts/montserrat-cyr.woff2")}) format("woff2")`, { weight: "100 900", unicodeRange: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" }),
  new FontFace(FONT, `url(${staticFile("fonts/montserrat-lat.woff2")}) format("woff2")`, { weight: "100 900" }),
];
let ready = false;
export const fontReady = () => ready;
const readyPromise = Promise.all(faces.map((f) => f.load().then((ff) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff)))).then(() => { ready = true; });

export const useFontReady = () => {
  const [ok, setOk] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender("font")));
  useEffect(() => {
    if (ready) { if (handle !== null) continueRender(handle); return; }
    readyPromise.then(() => { setOk(true); if (handle !== null) continueRender(handle); });
  }, [handle]);
  return ok;
};
