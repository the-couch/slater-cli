# @slater/cli
Shopify theme development toolkit.

```
npm i @slater/cli --save-dev
```

# Usage
Required project structure.
```bash
- package.json
- src/
  |- config.yml # standard issue Shopify
  |- scripts/
    |- index.js
  |- layout/
  |- templates/
  |- etc...
```

### JS
JavaScript is compiled with [bili](https://github.com/egoist/bili), and supports
most modern ES6 features.

### CSS
CSS is compiled with bili also, via postcss. Just import your root stylesheet
into your root JavaScript file and you're good to go.

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
