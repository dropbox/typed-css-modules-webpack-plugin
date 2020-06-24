# typed-css-modules-webpack-plugin ![Node.js CI](https://github.com/dropbox/typed-css-modules-webpack-plugin/workflows/Node.js%20CI/badge.svg)

This is a Webpack plugin to generate TypeScript typing declarations for a TypeScript + CSS Modules
project. The plugin generates `.css.d.ts` file co-located with the corresponding `.css` file before
compilation phase so all CSS imports in TypeScript source code type check.

This plugin is different from [typings-for-css-modules-loader][1] and [dts-css-modules-loader][2] in
that it generates the typings **before** loaders process source files during the compilation. That
means your TypeScript loader will type check the **up-to-date** typing definitions of your CSS modules.

# Installation

```
yarn add --dev typed-css-modules-webpack-plugin
# Or if you use npm
npm install --save-dev typed-css-modules-webpack-plugin
```

# Usage

A minimal TypeScript + CSS Modules Webpack configuration would look like this:

```javascript
const path = require('path');
const {TypedCssModulesPlugin} = require('typed-css-modules-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          // Use CSS Modules
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
        ],
      },
    ],
  },
  // Generate typing declarations for all CSS files under `src/` directory.
  plugins: [
    new TypedCssModulesPlugin({
      globPattern: 'src/**/*.css',
    }),
  ],
};
```

Other than emitting the JS bundle, the build would produce the side-effect of generating `.css.d.ts`
files for all `.css` files in `src/` directory.

# Options

The available options for the plugin are:

## `globPattern: string`

This is the glob pattern used to match CSS Modules in the project. The plugin only generates `.d.ts`
for the matching CSS files. See [node-glob](https://github.com/isaacs/node-glob) for the pattern
syntax.

## `postCssPlugins?: Plugin[] | (defaults: Plugin[]) => Plugin[]`

This field is optional. If specified, the plugin would use the specified PostCSS plugin to transform
CSS files instead of the default
[`css-modules-loader-core`](https://github.com/css-modules/css-modules-loader-core) plugins.

If a function is supplied, it will be called with the default plugin list. This is useful if you
chain a `postcss-loader` before `css-loader` for some custom transformations. For example:

```javascript
// In CSS rules
[
  // ...
  {
    loader: 'css-loader',
    options: {
      modules: true,
      importLoaders: 1,
    },
  },
  // Some PostCSS transformations applied before css-loader
  {
    loader: 'postcss-loader',
    options: {
      plugins: () => [require('postcss-theme')({themePath: './theme'})],
    },
  },
];
```

Now to ensure CSS Modules recognize the custom syntax, we can inject the same transform in the
plugin options:

```javascript
new TypedCSSModulesPlugin({
  globPattern: '**/*.css',
  postCssPlugins: defaultPlugins => [
    require('postcss-theme')({themePath: './theme'}),
    ...defaultPlugins,
  ],
});
```

## `camelCase?: boolean`

This field is optional. When set to `true` the CSS field definitions will be emitted using camel case naming conventions. When `undefined` or `false` the CSS field definitions will be emitted verbatim.

## `rootDir?: string`

This field is optional. Project root directory (default: `process.cwd()`).

## `searchDir?: string`

This field is optional. Directory which includes target `*.css` files (default: `'./'`).

## `outDir?: string`

This field is optional. Output directory (default: `option.searchDir`).

# License

Copyright (c) 2018 Dropbox, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in
compliance with the License. You may obtain a copy of the License at

```
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and limitations under the
License.

[1]: https://github.com/Jimdo/typings-for-css-modules-loader
[2]: https://github.com/Megaputer/dts-css-modules-loader
