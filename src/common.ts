import {Value}  from "./value.js";

export enum Opcode {
    OP_CONSTANT,
    OP_NIL,
    OP_TRUE,
    OP_FALSE,
    OP_ADD,
    OP_SUBTRACT,
    OP_MULTIPLY,
    OP_DIVIDE,
    OP_NEGATE,
    OP_RETURN,
    OP_NOT,
    OP_EQUAL,
    OP_GREATER,
    OP_LESS,
    OP_PRINT,
    OP_POP,
    OP_DEFINE_GLOBAL,
    OP_GET_GLOBAL,
    OP_SET_GLOBAL,
    OP_GET_LOCAL,
    OP_SET_LOCAL,
    OP_JUMP_IF_FALSE,
    OP_JUMP,
    OP_LOOP,
};

export class Chunk {
    public view: Uint8Array;
    private buffer: ArrayBuffer;
    private count: number;
    private capacity: number;
    private constants: ValueArray;

    // Related with source code of higher level language
    private lineBuffer: ArrayBuffer;
    private lineView: Uint8Array;

    constructor(capacity = 16) {
        this.count = 0;
        this.capacity = capacity;

        this.buffer = new ArrayBuffer(capacity * Uint8Array.BYTES_PER_ELEMENT);
        this.view = new Uint8Array(this.buffer);
        this.constants = new ValueArray();

        this.lineBuffer = new ArrayBuffer(capacity * Uint8Array.BYTES_PER_ELEMENT);
        this.lineView = new Uint8Array(this.lineBuffer);
    }

    write(byte: number, line: number): void {
        if (this.count >= this.capacity) {
            this.capacity *= 2;
            const newBuffer = new ArrayBuffer(this.capacity * Uint8Array.BYTES_PER_ELEMENT);
            const newView = new Uint8Array(newBuffer);
            newView.set(this.view);
            this.buffer = newBuffer;
            this.view = newView;

            const newLineBuffer = new ArrayBuffer(this.capacity * Uint8Array.BYTES_PER_ELEMENT);
            const newLineView = new Uint8Array(newLineBuffer);
            newLineView.set(this.lineView);
            this.lineBuffer = newLineBuffer;
            this.lineView = newLineView;
        }

        this.view[this.count] = byte;
        this.lineView[this.count] = line;

        this.count++;
    }

    read(): Uint8Array {
        const slice = this.buffer.slice(0, this.count * Uint8Array.BYTES_PER_ELEMENT);
        return new Uint8Array(slice);
    }

    get size(): number {
        return this.count;
    }

    get(index): number {
        return this.view[index];
    }

    getLine(index): number {
        return this.lineView[index];
    }

    makeConstant(value: Value): number {
        const constant = this.addConstant(value);
        if (constant > 255) {
            throw new Error("Too many constants in one chunk.");
        }

        return constant;
    }

    addConstant(value: Value): number {
        this.constants.write(value);
        return this.constants.size - 1;
    }

    getConstant(index: number): Value {
        return this.constants.get(index);
    }
}

export class Disassembler {
    private chunk: Chunk;

    constructor(chunk: Chunk) {
        this.chunk = chunk;
    }

    disassemble(name: string): void {
        console.log(`== ${name} ==`);
        for (let offset = 0; offset < this.chunk.size;) {
            offset = this.disassembleInstruction(offset);
        }
    }

    disassembleInstruction(offset: number): number {
        const instruction = this.chunk.get(offset);
        switch (instruction) {
            case Opcode.OP_CONSTANT:
                return this.constantInstruction("OP_CONSTANT", offset);
            case Opcode.OP_NEGATE:
                return this.simpleInstruction("OP_NEGATE", offset);
            case Opcode.OP_RETURN:
                return this.simpleInstruction("OP_RETURN", offset);
            case Opcode.OP_ADD:
                return this.simpleInstruction("OP_ADD", offset);
            case Opcode.OP_SUBTRACT:
                return this.simpleInstruction("OP_SUBTRACT", offset);
            case Opcode.OP_MULTIPLY:
                return this.simpleInstruction("OP_MULTIPLY", offset);
            case Opcode.OP_DIVIDE:
                return this.simpleInstruction("OP_DIVIDE", offset);
            case Opcode.OP_NIL:
                return this.simpleInstruction("OP_NIL", offset);
            case Opcode.OP_TRUE:
                return this.simpleInstruction("OP_TRUE", offset);
            case Opcode.OP_FALSE:
                return this.simpleInstruction("OP_FALSE", offset);
            case Opcode.OP_NOT:
                return this.simpleInstruction("OP_NOT", offset);
            case Opcode.OP_EQUAL:
                return this.simpleInstruction("OP_EQUAL", offset);
            case Opcode.OP_GREATER:
                return this.simpleInstruction("OP_GREATER", offset);
            case Opcode.OP_LESS:
                return this.simpleInstruction("OP_LESS", offset);
            case Opcode.OP_PRINT:
                return this.simpleInstruction("OP_PRINT", offset);
            case Opcode.OP_POP:
                return this.simpleInstruction("OP_POP", offset);
            case Opcode.OP_DEFINE_GLOBAL:
                return this.constantInstruction("OP_DEFINE_GLOBAL", offset);
            case Opcode.OP_GET_GLOBAL:
                return this.constantInstruction("OP_GET_GLOBAL", offset);
            case Opcode.OP_SET_GLOBAL:
                return this.constantInstruction("OP_SET_GLOBAL", offset);
            case Opcode.OP_GET_LOCAL:
                return this.byteInstruction("OP_GET_LOCAL", offset);
            case Opcode.OP_SET_LOCAL:
                return this.byteInstruction("OP_SET_LOCAL", offset);
            case Opcode.OP_JUMP_IF_FALSE:
                return this.jumpInstruction("OP_JUMP_IF_FALSE", offset);
            case Opcode.OP_JUMP:
                return this.jumpInstruction("OP_JUMP", offset);
            default:
                console.log(`Unknown opcode ${instruction}`);
                return offset + 1;
        }
    }
    
    private jumpInstruction(name: string, offset: number): number {
        const jump = this.chunk.get(offset + 1);
        const line = this.chunk.getLine(offset + 1);
        this.logWithOffset(offset, name + "\t" + jump + "\t\t(line " + line + ")");
        return offset + 2;
    }

    private byteInstruction(name: string, offset: number): number {
        const slot = this.chunk.get(offset + 1);
        this.logWithOffset(offset, name + "\t" + slot);
        return offset + 2;
    }

    private logWithOffset(offset, rest) {
        let log = offset.toString().padStart(4, "0");

        if (offset != 0 && this.chunk.getLine(offset) === this.chunk.getLine(offset - 1)) {
            log += "\t|";
        } else {
            log += ` ${this.chunk.getLine(offset).toString().padStart(4, "0")}`;
        }
        log += ' ';
        log += rest;
        console.log(log);
    }

    private constantInstruction(name: string, offset: number): number {
        const loc = this.chunk.get(offset + 1);
        const constant = this.chunk.getConstant(loc);

        this.logWithOffset(offset, name + "\t" + loc + "'" + constant + "'");

        return offset + 2;
    }

    private simpleInstruction(name: string, offset: number): number {
        this.logWithOffset(offset, name);

        return offset + 1;
    }
}

class ValueArray {
    private arr : Value[];

    constructor() {
        this.arr = [];
    }

    write(value: Value): void {
        this.arr.push(value);
    }

    get(index: number): Value {
        return this.arr[index];
    }

    get size(): number {
        return this.arr.length;
    }
}
