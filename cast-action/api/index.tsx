import { Button, Frog, TextInput } from 'frog'
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

const getResult = async (c: any) => {
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
    return interactorUsername;
  }
  return null;
}

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  // browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

app.frame('/view', (c) => {
  const castAuthor = c.var.cast?.author.username;
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 30,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {`View @${castAuthor} on Drakula:`}
        </div>
      </div>
    ),
    intents: [
      <Button.Link href={`https://drakula.app/user/${castAuthor}`}>View @{castAuthor!}</Button.Link>,
    ],
  })
})

app.frame("/v2", (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: "center",
          background: "black",
          backgroundSize: "100% 100%",
          height: "100%",
          textAlign: "center",
          width: "100%",
          display: "flex",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 60,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          Add View on Drakula
        </div>
      </div>
    ),
    intents: [
      <Button.AddCastAction action="/drakula2">Add</Button.AddCastAction>,
    ],
  });
});

app.castAction("/drakula2", async (c) => {
    const g = await getResult(c);
    return c.frame({ path: '/view' })
  },
  { name: "View on Drakula", icon: "link-external" }
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

export const GET = handle(app);
export const POST = handle(app);