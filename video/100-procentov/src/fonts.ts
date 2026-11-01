import { loadFont } from "@remotion/google-fonts/Montserrat";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const font = loadFont("normal", { weights: ["700", "800", "900"], subsets: ["latin", "cyrillic"] });
export const FONT = font.fontFamily;

// Ждём шрифт перед рисованием текста на 3D-текстурах (экраны, таблички)
let ready = false;
const readyPromise = font.waitUntilDone().then(() => {
  ready = true;
});

export const useFontReady = () => {
  const [ok, setOk] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender("font")));
  useEffect(() => {
    if (ready) {
      if (handle !== null) continueRender(handle);
      return;
    }
    readyPromise.then(() => {
      setOk(true);
      if (handle !== null) continueRender(handle);
    });
  }, [handle]);
  return ok;
};
