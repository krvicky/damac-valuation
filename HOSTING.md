# Hosting The CFO Demo

## Fastest: ngrok

Use this for the same-day boss demo. It gives you an HTTPS public URL while the app keeps running on your laptop.

1. Set your API key:

```powershell
$env:OPENAI_API_KEY="your_api_key"
```

2. Start the demo helper:

```powershell
npm.cmd run demo
```

3. If ngrok is installed, the terminal prints a public `https://...ngrok.app` URL.

4. Send that URL to your boss and keep the terminal open.

If ngrok is not installed, install it from https://ngrok.com/download, then either rerun the helper or run this manually:

```powershell
npm.cmd start
ngrok http 3000
```

## More Stable: Render

Use Render when you want a persistent hosted URL.

1. Push this folder to GitHub.
2. In Render, create a new Web Service from that repo.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variable:
   - `OPENAI_API_KEY`
5. Deploy and share the generated `https://...onrender.com` URL.

The included `render.yaml` can also be used as a Render Blueprint.

## Demo Notes

- Voice needs OpenAI API quota.
- The API key stays server-side; it is never sent to the browser.
- For ngrok, your laptop must stay awake and online.
- For browser microphone access, use the HTTPS ngrok or Render URL when sharing remotely.
