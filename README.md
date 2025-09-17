# QuestForge

Prototype RPG (monorepo style) with shared TypeScript domain logic, Express server, and React (Vite) client.

## Netlify Functions Setup
This project now includes an example Netlify Function written in TypeScript.

### Installed Dependency
```
npm install @netlify/functions
```

### Function Source
All functions live in `netlify/functions/`.
Example: `netlify/functions/hello.ts`
```ts
import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello World' }),
    headers: { 'Content-Type': 'application/json' }
  };
};

export { handler };
```
This is the template pattern you can reuse for additional functions.

### Configuration (`netlify.toml`)
Key section:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```
Redirects are configured so that:
- `/api/hello` -> `/.netlify/functions/hello`
- `/api/*` -> `/.netlify/functions/:splat`

### TypeScript Inclusion
`tsconfig.json` includes the pattern: `"netlify/functions/**/*"` so editors & type checking see the functions.

### Local Development
Install the Netlify CLI (global):
```
npm install -g netlify-cli
```
Then run:
```
netlify dev
```
This spins a local environment that serves static assets and compiles functions on-demand.

### Creating More Functions
1. Create a new file: `netlify/functions/myFunction.ts`.
2. Export a `handler` matching the `Handler` signature.
3. Return `{ statusCode, body }` (string body). For JSON use `JSON.stringify` and add a `Content-Type: application/json` header.
4. Access query params via `event.queryStringParameters` and request body via `event.body` (parse as needed).

### Common Errors & Fixes
- TypeScript compile errors: Run `npm run check` to see details; adjust `tsconfig.json` or code.
- Missing types (e.g. Node globals): Ensure `"types": ["node", "vite/client"]` in `tsconfig.json` (already present).
- 404 when calling a function: Confirm filename matches the path. `hello.ts` maps to `/api/hello` (due to redirect) or default `/.netlify/functions/hello`.
- JSON parsing issues: Remember `event.body` is a string; wrap `JSON.parse(event.body || '{}')` safely.

### Deployment
Pushing to the connected Git repository triggers Netlify build:
1. Netlify runs `npm install`.
2. Executes `npm run build` (bundles client) and builds functions.
3. Deploys static assets & functions. Functions are available under `/.netlify/functions/<name>`.

### Serverless API Wrapper
All Express API routes are now also exposed through a single Netlify Function `api` (file: `netlify/functions/api.ts`). Redirects route `/api/*` to that function. Caveats:
- In-memory storage resets on cold starts (character progress not persisted between cold containers).
- High-frequency combat polling may create more cold starts; consider batching or migrating to a persistent DB.
- For production persistence, replace `storage` with a real database (Drizzle schema in `shared/` can be leveraged).

Local test:
```
netlify dev
# then hit http://localhost:8888/api/locations
```

### Roadmap for Full Migration
Currently the Express server remains separate (not deployed to Netlify). To migrate:
- Port each REST endpoint to its own function.
- Replace client fetch base paths accordingly.
- Remove Express-specific middleware.

---
For any additions, follow the established patterns in `shared/` for reusable logic.
