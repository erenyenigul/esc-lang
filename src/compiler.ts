import { CompilerBug, SyntaxError, NativeFunctionArgumentNumberMismatch, VariableAlreadyDeclaredInScope } from './error';
import { TokenType } from './lexer';
import { AST, Literal, Identifier, BinaryOperation, While, If, Block, Call, Return, For, FunctionDeclaration, Expression, Statement, UnaryOperation, ASTNode, VariableAssignment, VariableDeclaration, ExpressionStatement, ImportStatement, EmptyStatement, BreakStatement, ContinueStatement, Tuple, List, Subscript } from './parser';
import { Program, Opcode, Value, Instruction } from './vm';

interface Local {
    name: string;
    depth: number;
}

class Compiler {

    private ast: AST;
    private program: Program;

    private locals: Local[] = [];
    private depth: number = 0;

    private breaks: Instruction[][] = [];
    private continues: Instruction[][] = [];

    constructor(ast: AST, locals?: Local[], data?: Value[]) {
        this.ast = ast;
        this.program = {
            text: [],
            data: data || []
        };

        this.locals = locals || [];
    }

    public run(): Program {
        for (const node of this.ast) {
            this.codegen(node);
        }

        return this.program;
    }

    private codegen(node: ASTNode) {
        if (node instanceof Literal)
            this.literal(node);
        else if (node instanceof Call)
            this.call(node);
        else if (node instanceof Return)
            this.return(node);
        else if (node instanceof Identifier)
            this.identifier(node);
        else if (node instanceof BinaryOperation)
            this.binaryOperation(node);
        else if (node instanceof UnaryOperation)
            this.unaryOperation(node);
        else if (node instanceof VariableAssignment)
            this.variableAssignment(node);
        else if (node instanceof VariableDeclaration)
            this.variableDeclaration(node);
        else if (node instanceof Block)
            this.block(node)
        else if (node instanceof If)
            this.if(node);
        else if (node instanceof While)
            this.while(node);
        else if (node instanceof For)
            this.for(node);
        else if (node instanceof FunctionDeclaration)
            this.function(node);
        else if (node instanceof ExpressionStatement)
            this.expressionStatement(node);
        else if (node instanceof EmptyStatement)
            this.empty(node);
        else if (node instanceof BreakStatement)
            this.break(node);
        else if (node instanceof ContinueStatement)
            this.continue(node);
        else if (node instanceof Tuple) 
            this.tuple(node);
        else if (node instanceof List)
            this.list(node);
        else if (node instanceof Subscript)
            this.subscript(node);
        else {
            throw new CompilerBug(`Unknown node type ${node.constructor.name}`);
        }
    }

    private list(node: List) {
        for (const element of node.elements) {
            this.codegen(element);
        }

        this.emitText(
            Opcode.MAKE_LIST,
            node.lineNumber,
            node.elements.length
        );
    }

    private tuple(node: Tuple) {
        for (const element of node.elements) {
            this.codegen(element);
        }

        this.emitText(
            Opcode.MAKE_TUPLE,
            node.lineNumber,
            node.elements.length
        );
    }

    private continue(node: ContinueStatement) {
        if (this.continues.length === 0) {
            throw new SyntaxError(node.lineNumber, 'Continue statement outside of loop');
        }

        const instruction = this.emitText(
            Opcode.JUMP,
            node.lineNumber
        );

        this.continues[this.continues.length - 1].push(
            instruction
        );
    }

    private break(node: BreakStatement) {
        if (this.breaks.length === 0) {
            throw new SyntaxError(node.lineNumber, 'Break statement outside of loop');
        }

        const instruction = this.emitText(
            Opcode.JUMP,
            node.lineNumber
        );

        this.breaks[this.breaks.length - 1].push(
            instruction
        );
    }

    private empty(node: EmptyStatement) {
        this.emitText(Opcode.NOP, node.lineNumber);
    }

    private literal(node: Literal) {
        const str = node.value.value;
        let constant;

        if (node.value.type === TokenType.NUMBER)
            constant = Value.number(parseFloat(str));
        else if (node.value.type === TokenType.STRING)
            constant = Value.string(str);
        else if (node.value.type === TokenType.TRUE)
            constant = Value.boolean(true);
        else if (node.value.type === TokenType.FALSE)
            constant = Value.boolean(false);
        else if (node.value.type === TokenType.NULL)
            constant = Value.null();
        else
            throw new CompilerBug(`Unknown literal type ${node.value.type}`);

        this.program.data.push(constant);

        this.emitText(
            Opcode.DATA,
            node.lineNumber,
            this.program.data.length - 1
        );
    }

    private call(node: Call) {
        this.codegen(node.func);
        
        for (const arg of node.args) {
            this.codegen(arg);
        }

        this.emitText(
            Opcode.CALL,
            node.lineNumber,
            node.args.length
        );
    }

    private return(node: Return) {
        if (node.value)
            this.codegen(node.value);


        this.emitText(
            Opcode.RET,
            node.lineNumber,
            node.value ? 1 : 0
        );

    }

    private expressionStatement(node: ExpressionStatement) {
        this.codegen(node.expression);
        this.emitText(
            Opcode.POP,
            node.lineNumber
        );
    }

    private identifier(node: Identifier) {
        this.loadVariable(node.name.value, node);
    }

    private unaryOperation(node: UnaryOperation) {

        const type = node.op.type;
        let opcode;

        if (type === TokenType.MINUS)
            opcode = Opcode.NEG;
        else if (type === TokenType.NOT)
            opcode = Opcode.NOT;
        else if (type === TokenType.INC)
            opcode = Opcode.INC;
        else if (type === TokenType.DEC)
            opcode = Opcode.DEC;
        else
            throw new CompilerBug(`Unknown unary operator ${type}`);

        if (opcode === Opcode.INC || opcode === Opcode.DEC) {
            if (!(node.rand instanceof Identifier))
                throw new SyntaxError(node.lineNumber, `Invalid operand ${node.rand} for ${type}`);

            this.loadVariable(node.rand.name.value, node);

            if (!node.prefix) {
                this.emitText(
                    Opcode.COPY,
                    node.lineNumber
                );
            }

            this.emitText(
                opcode,
                node.lineNumber
            );

            this.assignVariable(node.rand.name.value, node);

            if (!node.prefix) {
                this.emitText(
                    Opcode.POP,
                    node.lineNumber
                );
            }
        } else {
            this.codegen(node.rand);

            this.emitText(
                opcode,
                node.lineNumber
            );
        }
    }

    private binaryOperation(node: BinaryOperation) {
        this.codegen(node.lhs)
        this.codegen(node.rhs)

        const type = node.op.type;
        let opcode;

        if (type === TokenType.PLUS)
            opcode = Opcode.ADD;
        else if (type === TokenType.MINUS)
            opcode = Opcode.SUB;
        else if (type === TokenType.MUL)
            opcode = Opcode.MUL;
        else if (type === TokenType.DIV)
            opcode = Opcode.DIV;
        else if (type === TokenType.EQ)
            opcode = Opcode.EQ;
        else if (type === TokenType.NEQ)
            opcode = Opcode.NEQ;
        else if (type === TokenType.LT)
            opcode = Opcode.LT;
        else if (type === TokenType.LTE)
            opcode = Opcode.LTE;
        else if (type === TokenType.GT)
            opcode = Opcode.GT;
        else if (type === TokenType.GTE)
            opcode = Opcode.GTE;
        else if (type === TokenType.AND)
            opcode = Opcode.AND;
        else if (type === TokenType.OR)
            opcode = Opcode.OR;
        else if (type === TokenType.MOD)
            opcode = Opcode.MOD;
        else
            throw new CompilerBug(`Unknown binary operator ${type}`);

        this.emitText(opcode, node.lineNumber);
    }

    private subscript(node: Subscript) { 
        this.codegen(node.name)
        this.codegen(node.key)

        this.emitText(Opcode.SUBSCRIPT, node.lineNumber )
    }

    private variableAssignment(node: VariableAssignment) {

        if (node.op.type !== TokenType.ASSIGN) {
            this.codegen(node.name);
        }

        this.codegen(node.value);

        if(node.op.type !== TokenType.ASSIGN){
            switch (node.op.type) {
                case TokenType.PLUS_ASSIGN:
                    this.emitText(Opcode.ADD, node.lineNumber, 1);
                    break;
                case TokenType.MINUS_ASSIGN:
                    this.emitText(Opcode.SUB, node.lineNumber);
                    break;
                case TokenType.MUL_ASSIGN:
                    this.emitText(Opcode.MUL, node.lineNumber);
                    break;
                case TokenType.DIV_ASSIGN:
                    this.emitText(Opcode.DIV, node.lineNumber);
                    break;
                case TokenType.MOD_ASSIGN:
                    this.emitText(Opcode.MOD, node.lineNumber);
                    break;
                default:
                    throw new CompilerBug(`Unknown assignment operator ${node.op.type}`);
            }
        }
        
        if(node.name instanceof Identifier)
            this.assignVariable(node.name.name.value, node);
        else if(node.name instanceof Subscript) {
            this.codegen(node.name.name);
            this.codegen(node.name.key);

            this.emitText(Opcode.STORE_SUBSCRIPT, node.name.lineNumber);
        } else {
            throw new SyntaxError(node.lineNumber, `Cannot assign to ${node.name}`)
        }
    }

    private variableDeclaration(node: VariableDeclaration) {
        this.codegen(node.value);

        const name = node.name.value;

        this.declareVariable(name, node);
    }

    private block(node: Block) {
        this.depth++;
        for (const child of node.nodes) {
            this.codegen(child);
        }
        this.depth--;

        for (let i = this.locals.length - 1; i >= 0; i--) {
            if (this.locals[i].depth <= this.depth)
                break;

            this.emitText(Opcode.POP, node.lineNumber);
            this.locals.pop();
        }
    }

    private if(node: If) {
        this.codegen(node.condition);

        const jumpf: Instruction = new Instruction(
            Opcode.JUMPF,
            node.lineNumber
        );

        this.program.text.push(jumpf);
        this.codegen(node.then);
        jumpf.value = this.program.text.length;

        if (node.else) {
            const jump: Instruction = new Instruction(
                Opcode.JUMP,
                node.lineNumber
            );
            this.program.text.push(jump);

            jumpf.value++;

            this.codegen(node.else);
            jump.value = this.program.text.length;
        }
    }

    private while(node: While) {
        this.breaks.push([]);
        this.continues.push([]);
        
        const start = this.program.text.length;
        this.codegen(node.condition);

        const jumpf: Instruction = new Instruction(
            Opcode.JUMPF,
            node.lineNumber
        );

        this.program.text.push(jumpf);

        this.codegen(node.body);

        const jump: Instruction = new Instruction(
            Opcode.JUMP,
            node.lineNumber,
            start
        );

        this.program.text.push(jump);
        jumpf.value = this.program.text.length;

        const breaks = this.breaks.pop();
        const continues = this.continues.pop();

        for (const instruction of breaks) {
            instruction.value = this.program.text.length;
        }

        for (const instruction of continues) {
            instruction.value = start;
        }
    }

    private for(node: For) {
        this.breaks.push([]);
        this.continues.push([]);

        this.codegen(node.init);

        const start = this.program.text.length;
        this.codegen(node.condition);

        const jumpf: Instruction = new Instruction(
            (node.condition instanceof EmptyStatement) ? Opcode.NOP : Opcode.JUMPF,
            node.lineNumber
        );

        this.program.text.push(jumpf);

        this.codegen(node.body);

        const updateStart = this.program.text.length;

        this.codegen(node.update);

        const jump: Instruction = new Instruction(
            Opcode.JUMP,
            node.lineNumber,
            start
        );

        this.program.text.push(jump);
        jumpf.value = this.program.text.length;


        const breaks = this.breaks.pop();
        const continues = this.continues.pop();

        for (const instruction of breaks) {
            instruction.value = this.program.text.length;
        }

        for (const instruction of continues) {
            instruction.value = updateStart;
        }
    }

    private function(node: FunctionDeclaration) {
        const func = {
            body: [],
            args: node.params.map(arg => arg.value),
            name: node.name.value
        };

        this.program.data.push(Value.function(func));
        const index = this.program.data.length - 1;

        const locals = [{ name: node.name.value, depth: 0 }]

        if (node.params.length > 0) {
            locals.push(...node.params.map(arg => ({ name: arg.value, depth: 1 })));
        }

        const compiler = new Compiler([node.body], locals, this.program.data);
        const program = compiler.run();

        func.body = program.text;

        func.body.push(new Instruction(
            Opcode.RET,
            node.lineNumber,
            0
        ));

        this.emitText(
            Opcode.DATA,
            node.lineNumber,
            index
        );

        this.declareVariable(node.name.value, node);
    }

    private loadVariable(name: string, node:  ASTNode) {
        for (let i = this.locals.length - 1; i >= 0; i--) {
            if (this.locals[i].name === name) {
                this.emitText(
                    Opcode.LOAD,
                    node.lineNumber,
                    i
                );
                return;
            }
        }

        this.program.data.push(Value.string(name));

        this.emitText(
            Opcode.LOADGL,
            node.lineNumber,
            this.program.data.length - 1
        );
    }

    private declareVariable(name: string, node: ASTNode) {
        if (this.depth === 0) {
            this.program.data.push(Value.string(name));

            this.emitText(
                Opcode.DECLAREGL,
                node.lineNumber,
                this.program.data.length - 1
            );
        } else {
            let index = this.locals.findIndex(local => local.name === name);

            if (index === -1) {
                this.locals.push({
                    name,
                    depth: this.depth
                });
            } else {
                throw new VariableAlreadyDeclaredInScope(node.lineNumber, name);
            }
        }
    }

    private assignVariable(name: string, node: ASTNode) {
        if (this.depth === 0) {
            this.program.data.push(Value.string(name));

            this.emitText(
                Opcode.SETGL,
                node.lineNumber,
                this.program.data.length - 1
            );
        } else {
            let index = this.locals.findIndex(local => local.name === name);

            if (index === -1) {
                this.program.data.push(Value.string(name));

                this.emitText(
                    Opcode.SETGL,
                    node.lineNumber,
                    this.program.data.length - 1
                );
            } else {
                this.emitText(
                    Opcode.STORE,
                    node.lineNumber,
                    index
                );
            }
        }
    }

    private emitText(opcode: Opcode, lineNumber, value?: number) {
        const instruction = new Instruction(opcode, lineNumber, value);
        
        this.program.text.push(instruction);

        return instruction;
    }
}

export default Compiler;