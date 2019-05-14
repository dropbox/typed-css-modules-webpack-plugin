import {unlink, readdirSync, readdir, readFile} from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as webpack from 'webpack';
import {promisify} from 'util';
import * as rimraf from 'rimraf';

const globPromise = promisify<string, string[]>(glob);
const unlinkPromise = promisify(unlink);
const readdirPromise = promisify(readdir);
const readFilePromise = promisify(readFile);
const webpackPromise = promisify<webpack.Configuration, webpack.Stats>(webpack);

const testCases = readdirSync(path.join(__dirname, 'cases'));
const buildOutput = path.join(__dirname, 'build');

/** Remove generated .css.d.ts artifacts and Webpack build output. */
async function removeBuildArtifacts() {
  const typingFiles = await globPromise(path.join(__dirname, 'cases/*/*.css.d.ts'));
  const unlinks = Promise.all(typingFiles.map(f => unlinkPromise(f)));
  rimraf.sync(buildOutput);
  await unlinks;
}

beforeEach(removeBuildArtifacts);
afterAll(removeBuildArtifacts);

for (const testCase of testCases) {
  it(testCase, async () => {
    const testDir = path.join(__dirname, 'cases', testCase);
    const configFile = path.join(testDir, 'webpack.config.ts');

    const options: webpack.Configuration = require(configFile);
    options.devtool = false;
    options.mode = 'development';
    options.output = {path: buildOutput};

    const stats = await webpackPromise(options);
    if (stats.hasErrors()) {
      throw Error(stats.toString());
    }

    const expectedDir = path.join(testDir, 'expected');
    for (const file of await readdirPromise(expectedDir)) {
      if (!file.endsWith('.css.d.ts')) {
        continue;
      }
      const filePath = path.join(expectedDir, file);
      const actualPath = path.join(testDir, file);
      expect(await readFilePromise(actualPath)).toStrictEqual(await readFilePromise(filePath));
    }
  });
}
