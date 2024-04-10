import { Frog } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);
const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=View+on+Drakula&icon=link-external&actionType=post&postUrl=https://drakula.vercel.app/";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

app.hono.post("/drakula", async (c) => {
  const {
    trustedData: { messageBytes },
  } = await c.req.json();

  const result = await neynarClient.validateFrameAction(messageBytes);

  if (result.valid) {
    const {
      interactor: { username: interactorUsername },
      cast: {
        author: { username: authorUsername },
        hash
      },
    } = result.action;

    let reply = `Hey @${interactorUsername}, view this on Drakula:\n`;

    await neynarClient.publishCast(
      process.env.SIGNER_UUID!,
      reply,
      {
        embeds: [{
          url: `https://drakula.app/user/${authorUsername}`
        }],
        replyTo: hash,
      }
    );

    return c.json({ message: "Replied with a link! ✅" });
  } else {
    return c.json({ message: "Error, please try again!" }, 401);
  }
});

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const POST = handle(app);