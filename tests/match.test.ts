import { fileMatch } from '../src/common/file-matcher';
const assert = require('assert');

describe('test file matcher', () => {
    describe('test empty input', () => {
        it('empty string', () => {
            const filter = fileMatch('');
            assert.equal(false, filter('test.ts'));
        });
    });

    describe('test normal input', () => {
        it('file match', () => {
            const filter = fileMatch('**/*.ts');
            assert.equal(true, filter('test.ts'));
            assert.equal(true, filter('test/index.test.ts'));
            assert.equal(false, filter('src/img.png'));
        });

        it('multiple suffixes match', () => {
            const filter = fileMatch('src/**/*.{png,jgp,gif}');
            assert.equal(false, filter('test.ts'));
            assert.equal(false, filter('test/index.test.ts'));
            assert.equal(true, filter('src/img.png'));
            assert.equal(true, filter('src/imgs/demo.gif'));
        });

        it('exclude file match', () => {
            const filter = fileMatch('!src/**/*');
            assert.equal(true, filter('dist/index.js'));
            assert.equal(true, filter('dist/src/index.js'));
            assert.equal(false, filter('src/index.ts'));
            assert.equal(false, filter('src/img.png'));
            assert.equal(true, filter('.gitignore'));
        });
    });
});
