// tslint:disable:no-console no-any
import * as os from 'os';
import chalk from 'chalk';
import * as fs from 'fs';
import * as glob from 'glob';
import {Plugin as PostCssPlugin} from 'postcss';
import {Tapable} from 'tapable';
import {promisify} from 'util';
import {Compiler} from 'webpack';
import * as cssModuleCore from 'css-modules-loader-core';
import DtsCreator from 'typed-css-modules';

const globPromise = promisify<string, string[]>(glob);
const statPromise = promisify(fs.stat);

async function writeFile(dtsCreator: DtsCreator, cssFile: string): Promise<void> {
  // clears cache so that watch mode generates update-to-date typing.
  const content = await dtsCreator.create(cssFile, undefined, true);
  await content.writeFile((definition: string) => {
    var lines = definition.trim().split(os.EOL);
    let attributes = lines.slice(1, lines.length-2);
    attributes.sort();
    const newLines = [lines[0], ...attributes, ...lines.slice(lines.length-2), '', ''];
    return newLines.join(os.EOL);
  });
}

async function generateTypingIfNecessary(dtsCreator: DtsCreator, cssFile: string): Promise<void> {
  let typingStat: fs.Stats;
  try {
    typingStat = await statPromise(cssFile + '.d.ts');
  } catch (_) {
    // typing does not exist: generate
    return writeFile(dtsCreator, cssFile);
  }
  const cssFileStat = await statPromise(cssFile);
  // if file is newer than typing: generate typing
  if (cssFileStat.mtime.getTime() > typingStat.mtime.getTime()) {
    return writeFile(dtsCreator, cssFile);
  }
}

export interface Options {
  readonly globPattern: string;
  readonly postCssPlugins?:
    | Array<PostCssPlugin<any>>
    | ((defaults: ReadonlyArray<PostCssPlugin<any>>) => PostCssPlugin<any>[]);
  readonly camelCase?: boolean;
  readonly rootDir?: string;
  readonly searchDir?: string;
  readonly outDir?: string;
}

export class TypedCssModulesPlugin implements Tapable.Plugin {
  private dtsCreator: DtsCreator;
  private useIncremental = false;
  private globPattern: string;

  constructor({
    globPattern,
    postCssPlugins = cssModuleCore.defaultPlugins,
    camelCase,
    rootDir,
    searchDir,
    outDir,
  }: Options) {
    this.globPattern = globPattern;
    if (typeof postCssPlugins === 'function') {
      postCssPlugins = postCssPlugins(cssModuleCore.defaultPlugins);
    }
    this.dtsCreator = new DtsCreator({
      rootDir,
      searchDir,
      outDir,
      loaderPlugins: postCssPlugins,
      camelCase,
    });
  }

  apply(compiler: Compiler) {
    compiler.hooks.run.tapPromise('TypedCssModulesPlugin', async () => {
      await this.generateCssTypings(this.useIncremental);
    });
    // CAVEAT: every time CSS changes, the watch-run is triggered twice:
    // - one because CSS changes
    // - one because .css.d.ts is added
    compiler.hooks.watchRun.tapPromise('TypedCssModulesPlugin', async () => {
      try {
        // first time this event is triggered, we do a full build instead of incremental build.
        await this.generateCssTypings(this.useIncremental);
      } catch (err) {
        console.log(chalk.bold.red(err.toString()));
      } finally {
        this.useIncremental = true;
      }
    });
  }

  private async generateCssTypings(incremental: boolean) {
    const files = await globPromise(this.globPattern);
    const doTask = incremental ? generateTypingIfNecessary : writeFile;
    return Promise.all(files.map(file => doTask(this.dtsCreator, file)));
  }
}
