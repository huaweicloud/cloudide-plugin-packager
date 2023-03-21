import { stdout } from 'single-line-log';

interface RenderOption {
    completed: number;
    total: number;
}

export default class ProgressBar {
    description: string;
    length: number;

    constructor(description: string, bar_length: number) {
        this.description = description || 'Progress';
        this.length = bar_length || 25;
    }

    render(opts: RenderOption): void {
        const percent = parseFloat((opts.completed / opts.total).toFixed(4)); // 计算进度(子任务的 完成数 除以 总数)
        const cell_num = Math.floor(percent * this.length); // 计算需要多少个 █ 符号来拼凑图案

        let cell = '';
        for (let i = 0; i < cell_num; i++) {
            cell += '█';
        }

        let empty = '';
        for (let i = 0; i < this.length - cell_num; i++) {
            empty += '░';
        }

        // 拼接最终文本
        const cmdText =
            this.description +
            ': ' +
            (100 * percent).toFixed(2) +
            '% ' +
            cell +
            empty +
            ' ' +
            opts.completed +
            '/' +
            opts.total;

        stdout(cmdText);
    }
}
