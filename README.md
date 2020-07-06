# @cloudide/plugin-packager
A packager tool for huawei-cloudide's plugin.

## Usage
1. npm install @cloudide/plugin-packager --save-dev
2. run `cloudide-plugin`

## Help
1. `cloudide-plugin -h` show help of tool.
2. `cloudide-plugin` packing in default mode (development mode), in this mode, all files are packed.
3. `cloudide-plugin -p` pack in production mode, all unnecessary files are excluded.
4. `cloudide-plugin -i <files>`, input which file you want to include, or use batch matching with quotation marks.`.
5. `cloudide-plugin -e <files>`, input which file you want to exclude, or use batch matching with quotation marks.`.
6. You can also create a 'pack-config.json' file in workspace, directly to set files you want to include or exclude like: { "exclude": [], "include": [] }.

### Batch matching rule 
- *.js           only match js files in current dir.
- **/*.js        match all js files.
- path/*.js      match js files in path.
- !*.js          exclude js files in current dir.
- .{jpg,png,gif} means jpg, png or gif.`
- src/**/*       match all files in src.
