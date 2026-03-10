# Webpack 5 Build Config

Alternative build pipeline for `product-template/client` using Webpack 5.
Complements the existing Vite config for production builds that need advanced bundling control.

## Features

| Feature | Implementation |
|---|---|
| **Tree Shaking** | `usedExports: true` + `concatenateModules` (scope hoisting) + production mode |
| **Code Splitting** | `splitChunks` with named cache groups per vendor |
| **Gzip Compression** | `CompressionPlugin` → `.gz` files, threshold 10 KB |
| **Brotli Compression** | `CompressionPlugin` → `.br` files, quality 11 |
| **CSS Extraction** | `MiniCssExtractPlugin` with content-hash filenames |
| **JS Minification** | `TerserPlugin` with console-drop in production |
| **CSS Minification** | `CssMinimizerPlugin` with PostCSS |
| **TypeScript** | `@babel/preset-typescript` + `ForkTsCheckerWebpackPlugin` |
| **React Fast Refresh** | `ReactRefreshWebpackPlugin` in dev |
| **Bundle Analysis** | `BundleAnalyzerPlugin` via `ANALYZE=true` |
| **Asset Modules** | Webpack 5 built-in — images < 8 KB inlined, fonts as files |

## Code Splitting Strategy

```
dist/js/
├── runtime.[hash].js         ← Webpack runtime (tiny, separated to avoid hash invalidation)
├── main.[hash].js            ← App entry
├── vendor-react.[hash].js    ← react + react-dom + react-router-dom
├── vendor-radix.[hash].js    ← All @radix-ui/* packages (shadcn base)
├── vendor-lucide.[hash].js   ← lucide-react icons
├── vendors.[hash].js         ← Remaining node_modules
└── [route].[hash].chunk.js   ← Async route chunks (via dynamic import)
```

Dynamic route splitting example:
```tsx
// pages/SomePage.tsx loaded only when route is visited
const SomePage = React.lazy(() => import('./pages/SomePage'))
```

## Installation

```bash
cd product-template/client

# Install all webpack-specific dev dependencies
npm install --save-dev \
  webpack webpack-cli webpack-dev-server webpack-bundle-analyzer \
  babel-loader @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript \
  style-loader css-loader postcss-loader \
  mini-css-extract-plugin css-minimizer-webpack-plugin terser-webpack-plugin \
  compression-webpack-plugin html-webpack-plugin \
  fork-ts-checker-webpack-plugin \
  @pmmmwh/react-refresh-webpack-plugin react-refresh \
  cross-env
```

## Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build:webpack": "cross-env NODE_ENV=production webpack --config webpack.config.js",
    "build:webpack:analyze": "cross-env NODE_ENV=production ANALYZE=true webpack --config webpack.config.js",
    "dev:webpack": "cross-env NODE_ENV=development webpack serve --config webpack.config.js"
  }
}
```

## Compression

The config emits **three copies** of each asset:
- `app.abc123.js` — original (required for development / non-compression-aware servers)
- `app.abc123.js.gz` — gzip (Nginx: `gzip_static on`)
- `app.abc123.js.br` — brotli (Nginx: `brotli_static on`)

Nginx config snippet to serve pre-compressed files:

```nginx
location /static/ {
    gzip_static   on;
    brotli_static on;
    expires       1y;
    add_header    Cache-Control "public, immutable";
}
```

## Tree Shaking Notes

For maximum tree shaking:
1. All source files already use ES modules (`import`/`export`)
2. Add `"sideEffects": ["*.css"]` to `package.json` — tells webpack CSS imports have side effects but JS is fully shakeable
3. Avoid barrel files (`index.ts` that re-export everything) for large libraries — import directly:
   ```ts
   // Bad (pulls in entire lib)
   import { Button } from '@/components'

   // Good (webpack can tree-shake unused exports)
   import { Button } from '@/components/ui/button'
   ```

## Bundle Analysis

```bash
npm run build:webpack:analyze
# Opens bundle-report.html in browser showing treemap of all chunks
```
