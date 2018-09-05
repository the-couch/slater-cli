# @slater/cli
Shopify theme development toolkit.

```
npm i @slater/cli --save-dev
```

# Usage
Place your entire theme within the `/src` directory, including a
Shopify-standard `config.yml`.

JS/CSS is compiled using [rollup](https://github.com/rollup/rollup) and
[postcss](https://github.com/postcss/postcss). This library expects a single
entrypoint at `/src/scripts/index.js`, so just import your modules and
stylesheets there and you should be good to go.

Example structure:
```bash
- package.json
- src/
  |- config.yml # standard issue Shopify
  |- scripts/
    |- index.js
  |- styles/
    |- main.css
  |- layout/
  |- templates/
  |- sections/
  |- snippets/
  |- locales/
  |- config/
  |- assets/
```

## watch
```
slater watch
```

## build
Build JavaScript and CSS, copy theme to `/build` directory.
```
slater build
```

## deploy
Build JavaScript and CSS, copy theme to `/build` directory, push to Shopify.
```
slater deploy
```

## Options
### `--env`
Specify a theme from `config.yml`. Defaults to `development`.
```
slater deploy --env=production
```

### `--jsx`
Specify a JSX pragma. Defalts to `React.createElement`.
```
slater deploy --jsx=preact.h
```

## License
MIT License
(c) 2018 The Couch, LLC
