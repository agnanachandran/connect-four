import _ from 'lodash';
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

enum Piece { Red = '🔴', Yellow = '🟡' };
type Cell = Piece | null;
type Turn = 'P1' | 'P2';
type Result = 'P1_Win' | 'P2_Win' | 'Draw' | null;

class Player {
  constructor(readonly piece: Piece, private readonly isHuman: boolean = true) { }

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
  turn: Turn = 'P1';

  readonly board: Array<Array<Cell>> = _.times(Game.NUM_ROWS, () => {
    return _.times(Game.NUM_COLS, () => {
      return null;
    })
  });

  constructor(readonly player1: Player, readonly player2: Player) {

  }

  placePiece(col: number, piece: Piece) {
    for (let row = 0; row < Game.NUM_ROWS; row++) {
      const isBottomRow = row === Game.NUM_ROWS - 1;

      if (isBottomRow || this.board[row + 1][col]) {
        if (this.board[row][col] === null) {
          this.board[row][col] = piece;
          break;
        }
      }
    }
  }

  getStringForRow(row: number) {
    let string = '|';

    for (let col = 0; col < Game.NUM_COLS; col++) {
      if (this.board[row][col] === Piece.Red) {
        string += Piece.Red;
      } else if (this.board[row][col] === Piece.Yellow) {
        string += Piece.Yellow;
      } else {
        string += '⚫';
      }
      string += '|';
    }

    return string;
  }

  private printTopOrBottomBorder() {
    console.log(_.repeat('—', Game.NUM_COLS * 3 + 1));
  }

  print() {
    console.clear();
    this.printTopOrBottomBorder();

    for (let row = 0; row < Game.NUM_ROWS; row++) {
      const stringForRow = this.getStringForRow(row);
      console.log(stringForRow);
    }

    this.printTopOrBottomBorder();
    console.log(`|${_.repeat(' ', Game.NUM_COLS * 3 - 1)}|`);
  }

  hasWonHorizontally(piece: Piece, startingRow: number, startingCol: number): boolean {
    let numConsecutiveMatchingPieces = 0;

    for (let col = startingCol; col < Game.NUM_COLS && col < startingCol + 4; col++) {
      if (this.board[startingRow][col] === piece) {
        numConsecutiveMatchingPieces += 1;
      } else {
        break;
      }
    }

    return numConsecutiveMatchingPieces === 4;
  }

  hasWonDiagonallyUp(piece: Piece, startingRow: number, startingCol: number): boolean {
    let numConsecutiveMatchingPieces = 0;

    for (let row = startingRow, col = startingCol; row >= 0 && row > startingRow - 4 && col < Game.NUM_COLS && col < startingCol + 4; row--, col++) {
      if (this.board[row][col] === piece) {
        numConsecutiveMatchingPieces += 1;
      } else {
        break;
      }
    }

    return numConsecutiveMatchingPieces === 4;
  }

  hasWonDiagonallyDown(piece: Piece, startingRow: number, startingCol: number): boolean {
    let numConsecutiveMatchingPieces = 0;

    for (let row = startingRow, col = startingCol; row < Game.NUM_ROWS && row < startingRow + 4 && col < Game.NUM_COLS && col < startingCol + 4; row++, col++) {
      if (this.board[row][col] === piece) {
        numConsecutiveMatchingPieces += 1;
      } else {
        break;
      }
    }

    return numConsecutiveMatchingPieces === 4;
  }

  hasWonVertically(piece: Piece, startingRow: number, startingCol: number): boolean {
    let numConsecutiveMatchingPieces = 0;

    for (let row = startingRow; row < Game.NUM_ROWS && row < startingRow + 4; row++) {
      if (this.board[row][startingCol] === piece) {
        numConsecutiveMatchingPieces += 1;
      } else {
        break;
      }
    }

    return numConsecutiveMatchingPieces === 4;
  }

  hasPlayerWonAtCell(player: Player, row: number, col: number): boolean {
    const piece = player.piece;
    return this.hasWonHorizontally(piece, row, col)
      || this.hasWonDiagonallyUp(piece, row, col)
      || this.hasWonDiagonallyDown(piece, row, col)
      || this.hasWonVertically(piece, row, col);
  }

  getResult(): Result {
    let hasSeenEmptyCell = false;
    for (let row = 0; row < Game.NUM_ROWS; row++) {
      for (let col = 0; col < Game.NUM_COLS; col++) {
        if (this.board[row][col] === null) {
          hasSeenEmptyCell = true;
        } else {
          const player1Won = this.hasPlayerWonAtCell(this.player1, row, col);
          const player2Won = this.hasPlayerWonAtCell(this.player2, row, col);
          if (player1Won) {
            return 'P1_Win';
          } else if (player2Won) {
            return 'P2_Win';
          }
        }
      }
    }

    if (!hasSeenEmptyCell) {
      return 'Draw';
    }

    return null;
  }

  async play() {
    let result: Result = null;

    while (!(result = this.getResult())) {
      if (this.turn === 'P1') {
        await this.player1.move(this);
        this.turn = 'P2';
      } else {
        await this.player2.move(this);
        this.turn = 'P1';
      }
      this.print();
    }

    console.log(result);
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