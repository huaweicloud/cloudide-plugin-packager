# @codearts/plugin-packager

A packager tool for Huawei CodeArts IDE's plugin.

## Usage

install codearts plugin-packager

```bash
npm install @codearts/plugin-packager --save-dev
```

run plugin-packager

```bash
npx cap
```

or you can add `"pack": "cap package -p"` in scripts, then run pack script

```bash
npm run pack
```

## Help

1. `cap -h` show help of tool.
2. `cap package` pack in default mode (development mode), in this mode, all files are packed.
3. `cap package -p` pack in production mode, all unnecessary files are excluded.
4. `cap package -i <files>`, input which file you want to include, or use batch matching with quotation marks.
5. `cap package -e <files>`, input which file you want to exclude, or use batch matching with quotation marks.
6. You can also create a 'pack-config.json' file in workspace, directly to set files you want to include or exclude like: { "exclude": [], "include": [] }. (See Batch matching rule)
7. `cap package -s`, skip npm install before packing.
8. `cap publish`, pack in production mode and publish to [Marketplace](https://marketplace.ide.huaweicloud.com/).

### Batch matching rule

-   \*.js only match js files in current dir.
-   \*\*/*.js match all js files.
-   path/\*.js match js files in path.
-   .{jpg,png,gif} means jpg, png or gif.
-   src/\*\* match all files in src.

## How to get the Access Token

When you run `cap publish`, an Access Token is necessary. If you don't have a publisher, please refer to the [Help Document](https://bbs.huaweicloud.com/blogs/358425).

After the publisher is created, you could create the  corresponding Access Token at [Marketplace](https://marketplace.ide.huaweicloud.com/publisher). Please make sure the publisher in 'package.json' matches the Access Token.

Step 1 - Click Create Token

![](https://bbs-img.huaweicloud.com/blogs/img/20230328/1680008361309607633.png)

Step 2 - Enter the name and expired date and submit

![](https://bbs-img.huaweicloud.com/blogs/img/20230328/1680008369964377160.png)

Step 3 - Copy and save the Access Token

![](https://bbs-img.huaweicloud.com/blogs/img/20230328/1680008374991126275.png)
