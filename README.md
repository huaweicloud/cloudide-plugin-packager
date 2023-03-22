# @codearts/plugin-packager

A packager tool for huawei-codearts's plugin.

## Usage

install codearts plugin-packager

```bash
npm install @codearts/plugin-packager --save-dev
```

run plugin-packager

```bash
npx cap
```

or you can add `"pack": "cap package"` in scripts, then run pack script

```bash
npm run pack
```

## Help

1. `cap -h` show help of tool.
2. `cap package` pack in default mode (development mode), in this mode, all files are packed.
3. `cap package -p` pack in production mode, all unnecessary files are excluded.
4. `cap package -i <files>`, input which file you want to include, or use batch matching with quotation marks.
5. `cap package -e <files>`, input which file you want to exclude, or use batch matching with quotation marks.
6. You can also create a 'pack-config.json' file in workspace, directly to set files you want to include or exclude like: { "exclude": [], "include": [] }.
7. `cap package -s`, skip npm install before packing.
8. `cap publish`, pack in production mode and publish to [Marketplace](https://marketplace.ide.huaweicloud.com/).

### Batch matching rule

-   \*.js only match js files in current dir.
-   \*_/_.js match all js files.
-   path/\*.js match js files in path.
-   !\*.js exclude js files in current dir.
-   .{jpg,png,gif} means jpg, png or gif.`
-   src/\*_/_ match all files in src.
