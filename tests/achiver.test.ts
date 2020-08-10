import * as fs from "fs";
import * as path from "path";
import { zip } from "../src/common/archiver";
import * as unzipper from "unzipper";
import { expect } from 'chai';

describe("test zip function", () => {
    const rootFolder = process.cwd();
    const zipExamplePath = path.resolve(rootFolder, "tests/mock");
    const zipPath = path.resolve(zipExamplePath, "mock.zip");

    afterEach(() => {
        fs.unlinkSync(zipPath);
    });

    it("test zip file", async () => {
        await zip([path.resolve(zipExamplePath, "demo.entry"), path.resolve(zipExamplePath, "folder/sub.entry")],
            zipPath, zipExamplePath);

        let findEntry = false;
        let findSubentry = false;
        let findOtherEntry = null;

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Parse())
            .on("entry", (entry) => {
                const fileName = entry.path;
                const type = entry.type;
                const size = entry.size;
                if (fileName === "demo.entry") {
                    findEntry = true;
                } else if (fileName === "folder/sub.entry") {
                    findSubentry = true;
                } else {
                    findOtherEntry = fileName;
                }
                entry.autodrain();
            }).promise();

        expect(findEntry).to.be.true;
        expect(findSubentry).to.be.true;
        expect(findOtherEntry).to.equal(null);
    });

    it("test invalid zip", async () => {
        const rootFolder = process.cwd();
        const zipExamplePath = path.resolve(rootFolder, "tests/achiver");
        let error = null;
        try {
            await zip([path.resolve(zipExamplePath, "demo3.entry")], zipPath, zipExamplePath);
        } catch (e) {
            error = e;
        }
        expect(error).not.undefined;
    });
});
