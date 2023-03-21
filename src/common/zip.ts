import { Entry, open, ZipFile } from 'yauzl';
import { Readable } from 'stream';
import { ExtensionConfig, Manifest } from './manifest';

async function bufferStream(stream: Readable): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        stream.on('data', (buffer) => buffers.push(buffer));
        stream.once('error', (err) => reject(err));
        stream.once('end', () => resolve(Buffer.concat(buffers)));
    });
}

export async function readZip(packagePath: string, filter: (name: string) => boolean): Promise<Map<string, Buffer>> {
    const zipFile = await new Promise<ZipFile>((resolve, reject) => {
        open(packagePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(err);
            } else {
                resolve(zipfile);
            }
        });
    });

    return await new Promise((resolve, reject) => {
        const result = new Map<string, Buffer>();

        zipFile.once('close', () => resolve(result));

        zipFile.readEntry();
        zipFile.on('entry', (entry: Entry) => {
            const name = entry.fileName.toLowerCase();

            if (filter(name)) {
                zipFile.openReadStream(entry, (err, stream) => {
                    if (err) {
                        zipFile.close();
                        return reject(err);
                    }

                    bufferStream(stream).then((buffer) => {
                        result.set(name, buffer);
                        zipFile.readEntry();
                    });
                });
            } else {
                zipFile.readEntry();
            }
        });
    });
}

export async function readCARTSPackage(
    packagePath: string
): Promise<{ manifest: Manifest; configs?: ExtensionConfig }> {
    const map = await readZip(packagePath, (name) => /^package\.json$|^pack-config\.json$|^README\.md$/i.test(name));
    const rawManifest = map.get('package.json');
    const configManifest = map.get('pack-config.json');
    const readme = map.get('README.md') || map.get('readme.md');

    if (!rawManifest) {
        throw new Error('Manifest not found');
    }

    if (!readme) {
        throw new Error('README.md not found');
    }

    if (configManifest) {
        return {
            manifest: JSON.parse(rawManifest.toString('utf8')),
            configs: JSON.parse(configManifest.toString('utf8'))
        };
    }

    return {
        manifest: JSON.parse(rawManifest.toString('utf8'))
    };
}
