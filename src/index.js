// リファクタリングの余地あり

/*
 * ある程度チュートリアルをなぞって作成しているが、
 * コンポーネントでファイルを分けたり、処理の効率化とか必要
 * Restart機能がチュートリアルの応用にもないので、追加する
 * ルーティングも追加する
 * ゲーム情報のデザインも見直しが必要？
 */

import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// 昇順ソート
const SORT_ORDER_ASC = 0;
// 降順ソート
const SORT_ORDER_DESC = 1;
// 手数の最大値
const MAX_STEP_COUNT = 9;

/**
 * 1マス分の関数コンポーネント
 * @param {*} props プロパティー
 * @returns ボタンのDOM
 */
function Square(props) {
	// 戻り値は最上位階層が1つでなければならない
	return (
		<button className={props.className} onClick={props.onClick}>
			{props.value}
		</button>
	);
}

/**
 * 盤面のコンポーネント
 */
class Board extends React.Component {
	/**
	 * マス目をレンダリングする
	 * @param {*} i インデックス
	 * @returns JSXElement
	 */
	renderSquare(i) {
		let className = "square";
		if (this.props.finishLine && this.props.finishLine.includes(i)) {
			className += " finish-square";
		}
		// ループで描画する際は、keyが必須
		return <Square key={i} value={this.props.squares[i]} onClick={() => this.props.onClick(i)} className={className} />;
	}

	/**
	 * コンポーネントをレンダリングする
	 * @returns JSXElement
	 */
	render() {
		const rowCount = 3;
		const columnCount = 3;
		// Reactにはv-forや*ngForがない
		// ループでDOMを作成したい場合は、Array.mapを使用する
		return (
			<div>
				{Array(rowCount)
					.fill(null)
					.map((item, i) => {
						return (
							<div className="board-row" key={`row_${i}`}>
								{Array(columnCount)
									.fill(null)
									.map((item, j) => {
										return this.renderSquare(j + i * columnCount);
									})}
							</div>
						);
					})}
			</div>
		);
	}
}

/**
 * 全体のコンポーネント
 */
class Game extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			// 盤面の状態を保持する
			history: [
				{
					// 最大9手だからlengthが9
					squares: Array(MAX_STEP_COUNT).fill(null),
				},
			],
			stepNumber: 0,
			installationPositions: Array(MAX_STEP_COUNT).fill(null),
			xIsNext: true,
			moves: Array(10).fill(null),
		};
	}

	/**
	 * クリックイベントハンドラ
	 * @param {*} i インデックス
	 * @returns
	 */
	handleClick(i) {
		const history = this.state.history.slice(0, this.state.stepNumber + 1);
		const current = history[history.length - 1];
		// コピーを作成
		const squares = current.squares.slice();
		const installationPositions = this.state.installationPositions.slice();
		if (calculateWinner(squares) || squares[i]) {
			// 勝敗がついた or 入力済み の場合
			return;
		}
		squares[i] = getNextPlayer(this.state.xIsNext);
		installationPositions[history.length - 1] = i;
		this.setState({
			history: history.concat([
				{
					squares: squares,
				},
			]),
			stepNumber: history.length,
			installationPositions: installationPositions,
			xIsNext: !this.state.xIsNext,
			sortOrder: SORT_ORDER_ASC,
			moves: Array(10).fill(null),
		});
	}

	/**
	 * 着手履歴に飛ぶ
	 * @param {*} step とび先の手
	 */
	jumpTo(step) {
		this.setState({
			stepNumber: step,
			xIsNext: step % 2 === 0,
		});
	}

	/**
	 * 着手履歴を並べ替える
	 * @param {number} sortOrder 順序
	 */
	sortMoves(sortOrder) {
		this.setState({
			sortOrder: sortOrder,
		});
	}

	/**
	 * コンポーネントをレンダリングする
	 * @returns JSXElement
	 */
	render() {
		const history = [...this.state.history];
		const current = history[this.state.stepNumber];
		const calculateWinnerResult = calculateWinner(current.squares);
		const winner = calculateWinnerResult?.winner;
		const finishLine = calculateWinnerResult?.line;

		const moves = history.map((step, move) => {
			const log = move ? `Go to move #${move}` : `Go to game start`;
			const coordinate = getCoordinate(this.state.installationPositions[move - 1]);
			const className = move === this.state.stepNumber ? "selected-step" : "";
			return (
				<li key={move}>
					<button className={className} onClick={() => this.jumpTo(move)}>
						{log} {coordinate}
					</button>
				</li>
			);
		});

		if (this.state.sortOrder === SORT_ORDER_ASC) {
			moves.sort((x, y) => (x.key < y.key ? -1 : 1));
		} else {
			moves.sort((x, y) => (x.key > y.key ? -1 : 1));
		}

		let status;
		if (winner) {
			status = `Winner: ${winner}`;
		} else {
			status = `Next player: ${getNextPlayer(this.state.xIsNext)}`;
			if (this.state.stepNumber === MAX_STEP_COUNT) {
				status = "draw";
			}
		}

		return (
			<div className="game">
				<div className="game-board">
					<Board squares={current.squares} onClick={(i) => this.handleClick(i)} finishLine={finishLine} />
				</div>
				<div className="game-info">
					<div>{status}</div>
					<button onClick={() => this.sortMoves(SORT_ORDER_ASC)}>asc</button>
					<button onClick={() => this.sortMoves(SORT_ORDER_DESC)}>desc</button>
					<ol>{moves}</ol>
				</div>
			</div>
		);
	}
}

// ========================================

/**
 * レンダリングする
 */
ReactDOM.render(<Game />, document.getElementById("root"));

/**
 * 勝者を算出する
 * @param {*} squares 現在の盤面の状態
 * @return {string} winner 勝者
 * @return {number[]} line 揃ったライン
 */
function calculateWinner(squares) {
	const lines = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6],
	];
	for (let i = 0; i < lines.length; i++) {
		const [a, b, c] = lines[i];
		if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
			return { winner: squares[a], line: lines[i] };
		}
	}
	return null;
}

/**
 * 次のプレイヤーを取得する
 * @param {*} xIsNext 次はXの番か
 */
function getNextPlayer(xIsNext) {
	return xIsNext ? "X" : "O";
}

/**
 * 座標を取得する
 * @param {*} index クリックした位置
 * @returns 座標 (列, 行)
 */
function getCoordinate(index) {
	if (index == null) {
		return "";
	}
	return index < 0 ? "" : `(${getColumnNumber(index)}, ${getRowNumber(index)})`;
}

/**
 * 列番号を取得する
 * @param {*} index クリックした位置
 * @returns 列番号
 */
function getColumnNumber(index) {
	const columnMap = new Map();
	columnMap.set(1, [0, 3, 6]);
	columnMap.set(2, [1, 4, 7]);
	columnMap.set(3, [2, 5, 8]);

	for (let [columnNumber, lines] of columnMap) {
		if (lines.includes(index)) {
			return columnNumber;
		}
	}
}

/**
 * 行番号を取得する
 * @param {*} index クリックした位置
 * @returns 行番号
 */
function getRowNumber(index) {
	const rowMap = new Map();
	rowMap.set(1, [0, 1, 2]);
	rowMap.set(2, [3, 4, 5]);
	rowMap.set(3, [6, 7, 8]);

	for (let [rowNumber, lines] of rowMap) {
		if (lines.includes(index)) {
			return rowNumber;
		}
	}
}
