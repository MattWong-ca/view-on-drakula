import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
// import { neynar } from 'frog/hubs'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);
const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=View+on+Drakula&icon=link-external&actionType=post&postUrl=https://drakula.vercel.app/";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/",
  // ui: { vars },
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

app.frame('/', (c) => {
  const { buttonValue, inputText, status } = c
  const fruit = inputText || buttonValue
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background:
            status === 'response'
              ? 'linear-gradient(to right, #432889, #17101F)'
              : 'black',
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
          {status === 'response'
            ? `Nice choice.${fruit ? ` ${fruit.toUpperCase()}!!` : ''}`
            : 'Welcome!'}
        </div>
      </div>
    ),
    intents: [
      <Button value="apples">Apples</Button>,
      <Button value="oranges">Oranges</Button>,
      <Button value="bananas">Bananas</Button>,
    ],
  })
})

app.hono.post("/", async (c) => {
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

    let reply = `Hey @${interactorUsername}, view this on Drakula:\n\nhttps://drakula.app/user/${authorUsername}`;

    await neynarClient.publishCast(
      process.env.SIGNER_UUID!,
      reply,
      {
        replyTo: hash,
      }
    );

    return c.json({ message: "Replied with a link! ✅" });
  } else {
    return c.json({ message: "Error, please try again!" }, 401);
  }
});

app.use('/*', serveStatic({ root: './public' }))
devtools(app, { serveStatic })

if (typeof Bun !== 'undefined') {
  Bun.serve({
    fetch: app.fetch,
    port: 3000,
  })
  console.log('Server is running on port 3000')
}
