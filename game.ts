import _ from 'lodash';
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

enum Piece { Red = '🔴', Yellow = '🟡'};
type Cell = Piece | null;
type Turn = 'P1' | 'P2';

class Player {
    constructor(private readonly piece: Piece, private readonly isHuman: boolean = true) {}

    async prompt(): Promise<string> {
        return new Promise(resolve =>
            rl.question('What column would you like to play? ', (col) => {
                resolve(col);
            })
        );
    }

    async getColumnForMove(game: Game) {
        if (this.isHuman) {
            const col = await this.prompt();
            return parseInt(col) - 1;
        } else {
            return Math.floor(Math.random() * Game.NUM_COLS);
        }
    }

    async move(game: Game) {
        const col = await this.getColumnForMove(game);
        game.placePiece(col, this.piece);
    }
}

class Game {
    static readonly NUM_ROWS = 6;
    static readonly NUM_COLS = 7;

    readonly board: Array<Array<Cell>> = _.times(Game.NUM_ROWS, () => {
        return _.times(Game.NUM_COLS, () => {
            return null;
        })
    });

    constructor(readonly player1: Player, readonly player2: Player) {

    }

    placePiece(col: number, piece: Piece) {
        for (let row = 0; row < Game.NUM_ROWS; row++) {
            if (row === Game.NUM_ROWS - 1 || this.board[row + 1][col] !== null) {
                this.board[row][col] = piece;
            }
        }
    }

    getStringForRow(row: number) {
        let string = '|';

        for (let col = 0; col < Game.NUM_COLS; col++) {
            if (this.board[row][col] === Piece.Red) {
                string += `${Piece.Red}|`;
            } else if (this.board[row][col] === Piece.Yellow) {
                string += `${Piece.Yellow}|`;
            } else {
                string += `⚫|`;
            }
        }

        return string;
    }

    private printTopOrBottomBorder() {
        console.log(_.repeat('—', Game.NUM_COLS * 3 + 1));
    }

    print() {
        this.printTopOrBottomBorder();

        for (let row = 0; row < Game.NUM_ROWS; row++) {
            const stringForRow = this.getStringForRow(row);
            console.log(stringForRow);
        }

        this.printTopOrBottomBorder();
        console.log(`|${_.repeat(' ', Game.NUM_COLS * 3 - 1)}|`);
    }

    isOver() {
        return false;
    }

    async play() {
        let turn: Turn = 'P1';

        while (!this.isOver()) {
            if (turn === 'P1') {
                await this.player1.move(this);
            } else {
                await this.player2.move(this);
            }
            this.print();
        }
    }
}

const main = async () => {
    const player1 = new Player(Piece.Red);
    const player2 = new Player(Piece.Yellow);
    const game = new Game(player1, player2);
    game.print();
    await game.play();
    rl.close();
}

main().then(() => {
});