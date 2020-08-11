# @cloudide/plugin-packager
A packager tool for huawei-cloudide's plugin.

## Usage
install cloudide plugin-packager
```bash
npm install @cloudide/plugin-packager --save-dev
```
run plugin-packager
```bash
npx cloudide-pack
```
or you can add `"pack": "cloudide-pack"` in scripts, then run pack script
```bash
npm run pack
```

## Help
1. `cloudide-pack -h` show help of tool.
2. `cloudide-pack` packing in default mode (development mode), in this mode, all files are packed.
3. `cloudide-pack -p` pack in production mode, all unnecessary files are excluded.
4. `cloudide-pack -i <files>`, input which file you want to include, or use batch matching with quotation marks.`.
5. `cloudide-pack -e <files>`, input which file you want to exclude, or use batch matching with quotation marks.`.
6. You can also create a 'pack-config.json' file in workspace, directly to set files you want to include or exclude like: { "exclude": [], "include": [] }.
7. `cloudide-pack -s`, skip npm install before packing.`.

### Batch matching rule 
- *.js           only match js files in current dir.
- **/*.js        match all js files.
- path/*.js      match js files in path.
- !*.js          exclude js files in current dir.
- .{jpg,png,gif} means jpg, png or gif.`
- src/**/*       match all files in src.
