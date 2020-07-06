/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

export function fileMatch(filter: string) {
    let match: string[] = [];
    let negate: string[] = [];
    const isNegate = filter.indexOf('!') === 0;

    filter = filter
        .replace(/^!/, '')
        .replace(/\*(?![\/*])/, '[^/]*?')
        .replace('**\/', '([^/]+\/)*')
        .replace(/\{([^\}]+)\}/g, ($1, $2) => {
            const collection = $2.split(',');
            let result = '(?:';

            collection.forEach((item: string, index: number) => {
                result += '(' + item.trim() + ')';
                if (index + 1 !== collection.length) {
                    result += '|';
                }
            });
            result += ')';
            return result;
        })
        .replace(/([\/\.])/g, '\\$1');

    filter = '(^' + filter + '$)';

    if (isNegate) {
        negate.push(filter);
    } else {
        match.push(filter);
    }

    const matchRule = match.length ? new RegExp(match.join('|')) : null;
    const negateRule = negate.length ? new RegExp(negate.join('|')) : null;

    return (filepath: string) => {
        if (negateRule && negateRule.test(filepath)) {
            return false;
        }
        if (matchRule && matchRule.test(filepath)) {
            return true;
        }
        return false;
    };
}
