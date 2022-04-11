/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

/**
 * Return files based on the file matching rule.
 * @param filter filter rule
 */
/* eslint-disable no-useless-escape */
export function fileMatch(filter: string): (filepath: string) => boolean {
    const match: string[] = [];
    const negate: string[] = [];
    const isNegate = filter.indexOf('!') === 0;

    filter = filter
        .replace(/^!/, '')
        .replace(/\*(?![\/*])/, '[^/]*?')
        .replace('**/', '([^/]+/)*')
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
        if (negateRule) {
            return negateRule.test(filepath) ? false : true;
        }
        if (matchRule) {
            return matchRule.test(filepath) ? true : false;
        }
        return false;
    };
}
