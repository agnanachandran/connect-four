import _ from 'lodash';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

enum Piece { Red = '🔴', Yellow = '🟡' };
type Cell = Piece | null;
type Turn = 'P1' | 'P2';
type Result = 'P1 Wins!' | 'P2 Wins!' | 'Draw' | null;
type Board = Array<Array<Cell>>;
type PlayerPieceMap = Record<'maximizingPlayer' | 'minimizingPlayer', Piece>;
type Strategy = 'random' | 'minimax' | 'minimax_alpha_beta';

class Player {
  otherPlayer: Player | null = null;
  static MAX_DEPTH: number = 2;

  constructor(readonly piece: Piece, private readonly isHuman: boolean = true, private readonly strategy: Strategy = 'minimax_alpha_beta') { }

  setOtherPlayer(player: Player) {
    this.otherPlayer = player;
  }

  async prompt(): Promise<string> {
    return new Promise(resolve =>
      rl.question('What column would you like to play? ', (col) => {
        resolve(col);
      })
    );
  }

  getRandomColumn() {
    return Math.floor(Math.random() * Game.NUM_COLS);
  }

  getColumnForRandomAIMove(game: Game) {
    while (true) {
      const randomCol = this.getRandomColumn();
      let emptyRow = game.getLowestEmptyRowForColumn(game.board, randomCol);
      if (emptyRow) {
        return randomCol;
      }
    }
  }

  getColumnForSmartAIMove(game: Game, shouldUseAlphaBetaPruning: boolean): number {
    const minimaxResult = shouldUseAlphaBetaPruning
      ? game.minimaxWithAlphaBetaPruning(
          game.board,
          Player.MAX_DEPTH,
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
          true,
          {maximizingPlayer: this.piece, minimizingPlayer: this.otherPlayer!.piece}
        )
      : game.minimax(game.board, Player.MAX_DEPTH, true, {maximizingPlayer: this.piece, minimizingPlayer: this.otherPlayer!.piece});
    return minimaxResult.col;
  }

  async getColumnForMove(game: Game) {
    if (this.isHuman) {
      const col = await this.prompt();
      return parseInt(col) - 1;
    } else if (this.strategy === 'random') {
      return this.getColumnForRandomAIMove(game);
    } else if (this.strategy === 'minimax') {
      return this.getColumnForSmartAIMove(game, false);
    } else {
      return this.getColumnForSmartAIMove(game, true);
    }
  }

  async move(game: Game) {
    const col = await this.getColumnForMove(game);
    game.placePiece(game.board, col, this.piece);
  }
}

class Game {
  static readonly NUM_ROWS = 6;
  static readonly NUM_COLS = 7;
  turn: Turn = 'P1';

  board: Board = _.times(Game.NUM_ROWS, () => {
    return _.times(Game.NUM_COLS, () => {
      return null;
    })
  });

  constructor(readonly player1: Player, readonly player2: Player) {
  }

  // Returns row at which piece can be played or null if the piece cannot be played at the column
  getLowestEmptyRowForColumn = (board: Board, col: number): number | null => {
    for (let row = 0; row < Game.NUM_ROWS; row++) {
      const isBottomRow = row === Game.NUM_ROWS - 1;

      if (isBottomRow || board[row + 1][col]) {
        if (board[row][col] === null) {
          return row;
        }
      }
    }

    return null;
  };

  canPlayAtColumn = (board: Board, col: number): boolean => {
    return this.getLowestEmptyRowForColumn(board, col) !== null;
  };

  countCellsInArray = (array: Array<Cell>, targetCell: Cell) => {
    return _.sumBy(array, (cell) => (cell === targetCell ? 1 : 0));
  }

  evaluateMetrics = (numMaximizingPieces: number, numMinimizingPieces: number, numEmpty: number) => {
    let score = 0;

    if (numMaximizingPieces === 4) {
      score += 1000000;
    } else if (numMaximizingPieces === 3 && numEmpty === 1) {
      score += 5;
    } else if (numMaximizingPieces === 2 && numEmpty === 2) {
      score += 2;
    }

    if (numMinimizingPieces === 4) {
      score -= 1000000;
    } else if (numMinimizingPieces === 3 && numEmpty === 1) {
      score -= 5;
    } else if (numMinimizingPieces === 2 && numEmpty === 2) {
      score -= 2;
    }

    return score;
  }

  evaluateHorizontally = (board: Board, maximizingPlayerPiece: Piece, minimizingPlayerPiece: Piece, row: number, col: number) => {
    const numMaximizingPieces = this.numMatchingCellsHorizontally(board, maximizingPlayerPiece, row, col);
    const numMinimizingPieces = this.numMatchingCellsHorizontally(board, minimizingPlayerPiece, row, col);
    const numEmpty = this.numMatchingCellsHorizontally(board, null, row, col);
    return this.evaluateMetrics(numMaximizingPieces, numMinimizingPieces, numEmpty);
  }

  evaluateDiagonallyUp = (board: Board, maximizingPlayerPiece: Piece, minimizingPlayerPiece: Piece, row: number, col: number) => {
    const numMaximizingPieces = this.numMatchingCellsDiagonallyUp(board, maximizingPlayerPiece, row, col);
    const numMinimizingPieces = this.numMatchingCellsDiagonallyUp(board, minimizingPlayerPiece, row, col);
    const numEmpty = this.numMatchingCellsDiagonallyUp(board, null, row, col);
    return this.evaluateMetrics(numMaximizingPieces, numMinimizingPieces, numEmpty);
  }

  evaluateDiagonallyDown = (board: Board, maximizingPlayerPiece: Piece, minimizingPlayerPiece: Piece, row: number, col: number) => {
    const numMaximizingPieces = this.numMatchingCellsDiagonallyDown(board, maximizingPlayerPiece, row, col);
    const numMinimizingPieces = this.numMatchingCellsDiagonallyDown(board, minimizingPlayerPiece, row, col);
    const numEmpty = this.numMatchingCellsDiagonallyDown(board, null, row, col);
    return this.evaluateMetrics(numMaximizingPieces, numMinimizingPieces, numEmpty);
  }

  evaluateVertically = (board: Board, maximizingPlayerPiece: Piece, minimizingPlayerPiece: Piece, row: number, col: number) => {
    const numMaximizingPieces = this.numMatchingCellsVertically(board, maximizingPlayerPiece, row, col);
    const numMinimizingPieces = this.numMatchingCellsVertically(board, minimizingPlayerPiece, row, col);
    const numEmpty = this.numMatchingCellsVertically(board, null, row, col);
    return this.evaluateMetrics(numMaximizingPieces, numMinimizingPieces, numEmpty);
  }

  evaluateBoard = (board: Board, maximizingPlayerPiece: Piece, minimizingPlayerPiece: Piece): number => {
    let score = 0;
    const centerColumn = _.map(_.range(Game.NUM_ROWS), (row) => board[row][Math.floor(Game.NUM_COLS/2)]);
    const numCenterPieces = this.countCellsInArray(centerColumn, maximizingPlayerPiece);
    score += 3 * numCenterPieces;

    for (let row = 0; row < Game.NUM_ROWS; row++) {
      for (let col = 0; col < Game.NUM_COLS; col++) {
        score += this.evaluateHorizontally(board, maximizingPlayerPiece, minimizingPlayerPiece, row, col);
        score += this.evaluateDiagonallyUp(board, maximizingPlayerPiece, minimizingPlayerPiece, row, col);
        score += this.evaluateDiagonallyDown(board, maximizingPlayerPiece, minimizingPlayerPiece, row, col);
        score += this.evaluateVertically(board, maximizingPlayerPiece, minimizingPlayerPiece, row, col);
      }
    }

    return score;
  }

  minimax = (board: Board, depth: number, isMaximizingPlayer: boolean, playerPieceMap: PlayerPieceMap, col: number = -1): {col: number, value: number}  => {
    const result = this.getResult(board)

    if (depth === 0 || result !== null) {
      const value = this.evaluateBoard(board, playerPieceMap.maximizingPlayer, playerPieceMap.minimizingPlayer);
      return { col, value};
    }

    const nextPieceToMove = isMaximizingPlayer ? playerPieceMap.maximizingPlayer : playerPieceMap.minimizingPlayer;
    const childBoards = this.getChildBoardsForBoard(board, nextPieceToMove);

    if (isMaximizingPlayer) {
      let value = Number.MIN_SAFE_INTEGER;
      let bestCol = -1;

      for (let childBoard of childBoards) {
        const minimaxResult = this.minimax(childBoard.board, depth - 1, false, playerPieceMap, childBoard.col);
        if (minimaxResult.value > value) {
          value = minimaxResult.value;
          bestCol = childBoard.col;
        }
      }

      return {col: bestCol, value};
    } else {
      let value = Number.MAX_SAFE_INTEGER;
      let bestCol = -1;

      for (let childBoard of childBoards) {
        const minimaxResult = this.minimax(childBoard.board, depth - 1, true, playerPieceMap, childBoard.col);
        if (minimaxResult.value < value) {
          value = minimaxResult.value;
          bestCol = childBoard.col;
        }
      }

      return {col: bestCol, value};
    }
  }

  minimaxWithAlphaBetaPruning = (board: Board, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean, playerPieceMap: PlayerPieceMap, col = -1): {col: number, value: number} => {
    let newAlpha = alpha;
    let newBeta = beta;

    const result = this.getResult(board)

    if (depth === 0 || result !== null) {
      const value = this.evaluateBoard(board, playerPieceMap.maximizingPlayer, playerPieceMap.minimizingPlayer);
      return { col, value};
    }

    const nextPieceToMove = isMaximizingPlayer ? playerPieceMap.maximizingPlayer : playerPieceMap.minimizingPlayer;
    const childBoards = this.getChildBoardsForBoard(board, nextPieceToMove);

    if (isMaximizingPlayer) {
      let value = Number.MIN_SAFE_INTEGER;
      let bestCol = -1;

      for (let childBoard of childBoards) {
        const minimaxResult = this.minimaxWithAlphaBetaPruning(childBoard.board, depth - 1, newAlpha, newBeta, false, playerPieceMap, childBoard.col);
        if (minimaxResult.value > value) {
          value = minimaxResult.value;
          bestCol = childBoard.col;
        }

        newAlpha = Math.max(alpha, value);
        if (newAlpha >= beta) {
          break;
        }
      }

      return {col: bestCol, value};
    } else {
      let value = Number.MAX_SAFE_INTEGER;
      let bestCol = -1;

      for (let childBoard of childBoards) {
        const minimaxResult = this.minimaxWithAlphaBetaPruning(childBoard.board, depth - 1, newAlpha, newBeta, true, playerPieceMap, childBoard.col);
        if (minimaxResult.value < value) {
          value = minimaxResult.value;
          bestCol = childBoard.col;
        }

        newBeta = Math.min(beta, value);
        if (newBeta <= alpha) {
          break;
        }
      }

      return {col: bestCol, value};
    }
  }

  getChildBoardsForBoard = (board: Board, piece: Piece) => {
    const childBoards = _.map(_.range(0, Game.NUM_COLS), (col) => {
      if (this.canPlayAtColumn(board, col)) {
        const boardCopy = _.cloneDeep(board);
        this.placePiece(boardCopy, col, piece);

        return {
          col,
          board: boardCopy,
        }
      }
    });

    return _.compact(childBoards);
  }

  placePiece = (board: Board, col: number, piece: Piece) => {
    const row = this.getLowestEmptyRowForColumn(board, col)

    if (row !== null) {
      board[row][col] = piece;
    }
  }

  getStringForRow = (row: number) => {
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

  private printTopOrBottomBorder = () => {
    console.log(_.repeat('—', Game.NUM_COLS * 3 + 1));
  }

  print = () => {
    console.clear();
    this.printTopOrBottomBorder();

    for (let row = 0; row < Game.NUM_ROWS; row++) {
      const stringForRow = this.getStringForRow(row);
      console.log(stringForRow);
    }

    this.printTopOrBottomBorder();
    console.log(`|${_.repeat(' ', Game.NUM_COLS * 3 - 1)}|`);
  }

  numMatchingCellsHorizontally = (board: Board, cell: Cell, startingRow: number, startingCol: number): number => {
    const window = [];
    for (let col = startingCol; col < Game.NUM_COLS && col < startingCol + 4; col++) {
      window.push(board[startingRow][col]);
    }

    return this.countCellsInArray(window, cell);
  }

  numMatchingCellsDiagonallyUp = (board: Board, cell: Cell, startingRow: number, startingCol: number): number => {
    const window = [];
    for (let row = startingRow, col = startingCol; row >= 0 && row > startingRow - 4 && col < Game.NUM_COLS && col < startingCol + 4; row--, col++) {
      window.push(board[row][col]);
    }

    return this.countCellsInArray(window, cell);
  }

  numMatchingCellsDiagonallyDown = (board: Board, cell: Cell, startingRow: number, startingCol: number): number => {
    const window = [];
    for (let row = startingRow, col = startingCol; row < Game.NUM_ROWS && row < startingRow + 4 && col < Game.NUM_COLS && col < startingCol + 4; row++, col++) {
      window.push(board[row][col]);
    }

    return this.countCellsInArray(window, cell);
  }

  numMatchingCellsVertically = (board: Board, cell: Cell, startingRow: number, startingCol: number): number => {
    const window = [];
    for (let row = startingRow; row < Game.NUM_ROWS && row < startingRow + 4; row++) {
      window.push(board[row][startingCol]);
    }

    return this.countCellsInArray(window, cell);
  }

  hasPlayerWonAtCell = (board: Board, player: Player, row: number, col: number): boolean => {
    const piece = player.piece;
    return _.includes([
      this.numMatchingCellsHorizontally(board, piece, row, col),
      this.numMatchingCellsDiagonallyUp(board, piece, row, col),
      this.numMatchingCellsDiagonallyDown(board, piece, row, col),
      this.numMatchingCellsVertically(board, piece, row, col),
    ], 4);
  }

  getResult = (board: Board): Result => {
    let hasSeenEmptyCell = false;
    for (let row = 0; row < Game.NUM_ROWS; row++) {
      for (let col = 0; col < Game.NUM_COLS; col++) {
        if (board[row][col] === null) {
          hasSeenEmptyCell = true;
        } else {
          const player1Won = this.hasPlayerWonAtCell(board, this.player1, row, col);
          const player2Won = this.hasPlayerWonAtCell(board, this.player2, row, col);
          if (player1Won) {
            return 'P1 Wins!';
          } else if (player2Won) {
            return 'P2 Wins!';
          }
        }
      }
    }

    if (!hasSeenEmptyCell) {
      return 'Draw';
    }

    return null;
  }

  play = async () => {
    let result: Result = null;

    while (!(result = this.getResult(this.board))) {
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
  const player2 = new Player(Piece.Yellow, false, 'minimax_alpha_beta');
  player1.setOtherPlayer(player2);
  player2.setOtherPlayer(player1);
  const game = new Game(player1, player2);
  game.print();
  await game.play();
  rl.close();
}

main().then(() => {
});