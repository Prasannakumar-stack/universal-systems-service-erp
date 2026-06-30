# LinkedIn Demo Recorder

Dev-only Playwright recorder for the clean Repair & Service Management demo flow.

## Use

1. Start the app first:

```bash
npm run dev
```

2. In another terminal, run:

```bash
npm run demo:record
```

3. The WEBM video is saved at:

```text
demo-recording/output/linkedin-demo.webm
```

## Notes

- The recorder uses the existing seeded demo accounts behind the scenes and does not show the login page.
- Keep Settings, terminals, devtools, database pages, `.env` files, and logs off camera.
- The booking step uses safe demo values only: Demo Customer, `9000000000`, Demo Area, HP Pavilion 15.
- If LinkedIn needs MP4, import the WEBM into CapCut and export as MP4.
