import { expect, test } from '@jest/globals';
import { compile, evaluate } from '../src/index';
import VM, { Value, ValueType } from '../src/vm';

const evalResumeSourceCode = (sourceCode: string, valueToFeed: Value ) => {
    sourceCode += 'syscall("dummy", result);';

    const image = evaluate(compile(sourceCode));
    const syscall = image.syscall;

    if (!syscall) {
        throw new Error('The test case doesn\'t include a syscall');
    }

	const vm = VM.deserialize(image, valueToFeed);
    const finalImage = vm.run();

    if (!finalImage.syscall) {
        // This shouldn't happen as we add the last line to the source code.
        throw new Error('No syscall found');
    }

    const result = finalImage.syscall.args[0];

    return result;
}

const validTestSourceCodes = [
    {
        sourceCode: `
            let a = input();

            let result = 2 + number(a);
        `
        ,
        valueToFeed: { type: ValueType.NUMBER, value: 3 },
        expected: { type: ValueType.NUMBER, value: 5 }
    },
]

test.each(validTestSourceCodes)('.eval($sourceCode)',
    ({ sourceCode, valueToFeed, expected, }) => {
        const result = evalResumeSourceCode(sourceCode, valueToFeed);
        expect(result).toEqual(expected);
    }
);