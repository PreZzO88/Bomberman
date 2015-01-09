var bmGame = function () {
	// Bomberman coded by David Preseault.
	// Note: Sprites and gameplay based on Jippii.fr Bomberman Game.

	var ctx = $("#canvas")[0].getContext("2d");
	var fpsctr = 0;
	var ts = new Date().getTime();
	var pressedKeys = { u: false, d: false, l: false, r: false };
	var gameInfo = {
		bgcolor: "#4D7195",
		boardcolor: "#0075B9",
		board: [],
		boardx: 20,
		boardy: 20,
		boardw: 571,
		boardh: 451,
		assist: 4,
		me: "red",
		bmcache: $("#bmcache")[0],
		alternateAnimationSpeed: 200,
		players: { 
			red: { x: 0, y: 0, isDead: false, color: "red", dir: "d", altDir: 0, c: 0, isStopping: 0, isStopped: 1, speed: "fastest", changingDir: 0, nobp: 0, noba: 2, expStr: 1, lastLay: {} }
		},
		entityBitmap: {},
		spawnPoints: [],
		namelist: [],
		availableColors: { pink: true, cyan: true, red: true, yellow: true, blue: true, lime: true, gold: true, green: true },
		colors: [ "pink", "cyan", "red", "yellow", "blue", "lime", "gold", "green" ],
		activeBombs: [],
		activeExplosions: [],
		playing: false,
		speed: { normal: 0.5, fast: 0.75, fastest: 1 }
	};

	prepare();

	// Temporary - FPS counter
	var timer = setInterval(
		function() {
			ctx.fillStyle = gameInfo.bgcolor;
			ctx.fillRect(10,1,40,11);
			ctx.font = "10pt verdana";
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText(fpsctr + " FPS", 10, 10);
			fpsctr = 0;
		}, 1000);

	// Main loop
	function mainRender() {
		fpsctr++;
		// players
		// items
		// active bombs
		// active explosions
		
		// Clear board and redraw everything except empty spaces.
		redrawBoard();
		
		var x, y, w, h, dir, isStopped, player, speed, assist, collision;
		
		for (color in gameInfo.players) {
			player = gameInfo.players[color];
			if (!player.isDead) {
				x = player.x;
				y = player.y;
				w = player.w;
				h = player.h;
				dir = player.dir;
				isStopped = player.isStopped;
				speed = gameInfo.speed[player.speed];
				assist = false;
				if (!isStopped) {
					// If player has changed direction, adjust xy, checking for collisions.
					if (player.changingDir) {
						var newW = gameInfo.entityBitmap[color][dir + 0].w;
						var newH = gameInfo.entityBitmap[color][dir + 0].h;
						var testNewX = player["c"].x - Math.floor(newW/2);
						if (player.dir == "u" || player.dir == "d") {
							// Get new x using old centre
							var boundaries = calculatePlayerBoundaries(testNewX, y, newW, newH, speed);
							var collisionLeft = (isCollision(boundaries.ltp) || isCollision(boundaries.lbp));
							var collisionRight = (isCollision(boundaries.rtp) || isCollision(boundaries.rbp));
							if (collisionLeft || collisionRight) { x = (Math.floor(((x - gameInfo.boardx) / 30)) * 30) + gameInfo.boardx + 1; }
							else { x = testNewX; }
						} else {
							x = testNewX;
						}
						player.changingDir = 0;
						drawPlayer(color, x, y, dir, 0);
					} else {
						collision = checkForCollisions(player);
						if (collision != false) {
							if (collision.both) {
								drawPlayer(color, x, y, dir, 0);
								player.isStopping = 0;
								player.isStopped = 1;
							} else {
								assist = checkForPlayerAssist(collision.middle,dir,collision.empty);
								if (assist != false) {
									switch (dir) {
										case "u":
											movePlayer(color, assist+1, y-speed, speed, dir);
											break;
										case "d":
											movePlayer(color, assist+1, y+speed, speed, dir);
											break;
										case "l":
											movePlayer(color, x-speed, assist+4, speed, dir);
											break;
										case "r":
											movePlayer(color, x+speed, assist+4, speed, dir);
											break;
									}
								} else {
									drawPlayer(color, x, y, dir, 0);
									player.isStopping = 0;
									player.isStopped = 1;
								}
							}
						} else {
							// If no collisions, move player.
							movePlayer(color, x, y, speed, dir);
						}
					}
				} else {
					// if not moving, just draw last known dir and non-moving position.
					checkIfPlayerDead();
					drawPlayer(color, x, y, dir, 0);
				}
			}
		}
		checkBombs();
		checkExplosions();
		window.requestAnimationFrame(mainRender);
	}

	// Check for potential collisions for specified player.
	function checkForCollisions(player) {
		var x, y, w, h, dir, speed, player, pair1, pair2, point, boundaries;
		player = gameInfo.players[color];
		x = player.x;
		y = player.y;
		w = player.w;
		h = player.h;
		dir = player.dir;
		speed = gameInfo.speed[player.speed];
		boundaries = calculatePlayerBoundaries(x, y, w, h, speed);
		
		switch (dir) {
			case "u":
				pair1 = boundaries.tlp;
				pair2 = boundaries.trp;
				point = "x";
				break;
			case "d":
				pair1 = boundaries.blp;
				pair2 = boundaries.brp;
				point = "x";
				break;
			case "l":
				pair1 = boundaries.ltp;
				pair2 = boundaries.lbp;
				point = "y";
				break;
			case "r":
				pair1 = boundaries.rtp;
				pair2 = boundaries.rbp;
				point = "y";
				break;
		}
		var collisionPair1 = isCollision(pair1);
		var collisionPair2 = isCollision(pair2);
		if (collisionPair1 || collisionPair2) {
			var collision = { };
			if (collisionPair1 == collisionPair2) {
				collision.both = true;
			} else {
				collision.both = false;
				collision.middle = Math.max(pair1[point],pair2[point]);
				collision.empty = (collisionPair1 ? pair2[point] : pair1[point]);
			}
			return collision;
		} else {
			return false;
		}
	}
	// When player is near blocks and isn't necessarily inline with empty space, assist position.
	// For example, if a certain percentage of the players' sprite is occupying more near the empty space: assist.
	function checkForPlayerAssist(middlePoint,dir,successPoint) {
		var middle, successCol, p;
		var playerCenter = gameInfo.players[gameInfo.me].c;
		switch (dir) {
			case "u":
			case "d":
				middle = (Math.floor((middlePoint - gameInfo.boardx) / 30) * 30) + gameInfo.boardx;
				successCol = (Math.floor((successPoint - gameInfo.boardx) / 30) * 30) + gameInfo.boardx;
				p = "x";
				break;
			case "l":
			case "r":
				middle = (Math.floor((middlePoint - gameInfo.boardy) / 30) * 30) + gameInfo.boardy;
				successCol = (Math.floor((successPoint - gameInfo.boardy) / 30) * 30) + gameInfo.boardy;
				p = "y";
				break;
		}
		
		var diff = middle - playerCenter[p];
		if (Math.abs(diff) > gameInfo.assist) {
			// if diff is positive, means it was a left side trigger, check if empty space is to the left.
			if (diff > gameInfo.assist && successCol < middle) {
				// Left or Top Side triggered.
				//console.log("left top");
				return successCol;
			}
			// if diff is negative, means it was a right side trigger, check if empty space is to the right.
			else if (diff < (-1 * gameInfo.assist) && successCol == middle) {
				// Right or Bottom side triggered.
				//console.log("right bottom");
				return successCol;
			}
			else {
				return false;
			}
		} else {
			return false;
		}
		//console.log(col + " " + playerCenter.x);
	}

	// Uses a pair of x,y coordinates to determine if player will collide.
	function isCollision(pair) {
		var row = Math.floor((pair.y - gameInfo.boardy) / 30) + 1;
		var col = Math.floor((pair.x - gameInfo.boardx) / 30) + 1;
		var item = gameInfo.board[row][col];
		var player = gameInfo.players[gameInfo.me];
		if (item == "a") {
			var lastBomb = player.lastLay;
			var centerRow = Math.floor((player.c.y - gameInfo.boardy) / 30) + 1;
			var centerCol = Math.floor((player.c.x - gameInfo.boardx) / 30) + 1;
			if (lastBomb.r == centerRow && lastBomb.c == centerCol) {
				return false;
			} else {
				player.lastLay = {};
			}
		} else if (item == "f" || item == "g" || item == "h") {
			player.isDead = true;
			return false;
		}
		//console.log(row + " " + col + " " + "collision: " + (gameInfo.board[row][col] != "e") + " " + gameInfo.players[gameInfo.me].dir);
		return (item != "e");
	}
	function checkIfPlayerDead() {
		var player = gameInfo.players[gameInfo.me];
		var row = Math.floor((player.c.y - gameInfo.boardy) / 30) + 1;
		var col = Math.floor((player.c.x - gameInfo.boardx) / 30) + 1;
		var item = gameInfo.board[row][col];
		if (item == "f" || item == "g" || item == "h") {
			player.isDead = true;
			return true;
		} else {
			return false;
		}
	}
	// Move player in provided direction and speed.
	function movePlayer(color, x, y, speed, dir) {
		var elapsed = new Date().getTime() - ts;
		var altDir = gameInfo.players[color].altDir;
		switch (dir) {
			case "u": y-=speed; break;
			case "d": y+=speed; break;
			case "l": x-=speed; break;
			case "r": x+=speed; break;
		}
		if (elapsed >= gameInfo.alternateAnimationSpeed) {
			ts = new Date().getTime();
			altDir++;
			if (altDir >= 3) { altDir = 1; }
		}
		if (gameInfo.players[color].isStopping) {
			gameInfo.players[color].altDir = 0;
			gameInfo.players[color].isStopping = 0;
			gameInfo.players[color].isStopped = 1;
		}
		gameInfo.players[color].altDir = altDir;
		drawPlayer(color, x, y, dir, altDir);
	}

	// When player places a bomb.
	function layBomb() {
		var player = gameInfo.players[gameInfo.me];
		// if number of bombs placed is less than number of bombs allowed
		if (player.nobp < player.noba) {
			var center = player.c;
			var row = Math.floor((center.y - 20) / 30) + 1;
			var col = Math.floor((center.x - 20) / 30) + 1;
			if (gameInfo.board[row][col] != "a") {
				gameInfo.board[row][col] = "a";
				player.nobp++;
				gameInfo.activeBombs.push({ row: row, col: col, ts: new Date().getTime(), owner: player });
				player.lastLay = { r: row, c: col };
			}
		}
	}
	function checkBombs() {
		var ab;
		var time = new Date().getTime();
		for (var n = gameInfo.activeBombs.length-1; n >= 0; n--) {
			ab = gameInfo.activeBombs[n];
			if (time - ab.ts >= 5000) {
				gameInfo.board[ab.row][ab.col] = "e";
				ab.owner.nobp--;
				gameInfo.activeBombs.splice(n,1);
				explode(ab);
			}
		}
	}
	function checkExplosions() {
		var ae;
		var time = new Date().getTime();
		for (var n = gameInfo.activeExplosions.length-1; n >= 0; n--) {
			ae = gameInfo.activeExplosions[n];
			if (time - ae.ts >= 2000) {
				gameInfo.board[ae.row][ae.col] = "e";
				gameInfo.activeExplosions.splice(n,1);
			}
		}	
	}
	function explode(bomb) {
		//f up/down
		// g middle
		// h left/right
		var player = bomb.owner;
		var expStr = player.expStr;
		var row = bomb.row;
		var col = bomb.col;
		//gameInfo.board[row][col] = "g";
		addNewExplosion(row, col, "g");
		if (row > 1) {
			renderExplosion(expStr, row, col, "u", false);
		}
		if (row < 15) { 
			renderExplosion(expStr, row, col, "d", false);
		}
		if (col > 1) {
			renderExplosion(expStr, row, col, "l", true);
		}
		if (col < 19) {
			renderExplosion(expStr, row, col, "r", true);
		}
	}
	function renderExplosion(expStr, row, col, dir, isHorizontal) {
		var typeOfFire = (isHorizontal ? "h" : "f");
		var newRow = row, newCol = col;
		for (var n = 1; n <= expStr; n++) {
			newRow = (isHorizontal ? row : (dir =="u" ? newRow - 1 : newRow + 1));
			newCol = (isHorizontal ? (dir =="r" ? newCol + 1 : newCol - 1) : col );
			var item = gameInfo.board[newRow][newCol];
			if (item == "w" || item == "o") {
				break;
			} else if (item == "b") {
				addNewExplosion(newRow, newCol, typeOfFire);
				break;
			} else if (item == "a") {
				var bombsInCrossfire = $.grep(gameInfo.activeBombs, function(b) { return b.row == newRow && b.col == newCol; });
				if (bombsInCrossfire.length > 0) {
					for (bombs in bombsInCrossfire) {
						addNewExplosion(newRow, newCol, typeOfFire);
						bombsInCrossfire[bombs].ts = new Date().getTime() - 4500;
					}
				}
			} else {
				addNewExplosion(newRow, newCol, typeOfFire);
			}
		}
	}
	function addNewExplosion(row, col, typeOfFire) {
		gameInfo.board[row][col] = typeOfFire;
		gameInfo.activeExplosions.push({ row: row, col: col, ts: new Date().getTime() });
	}
	// Draw items, excluding players.
	function drawItem(item, x, y) {
		ctx.drawImage(bmcache, gameInfo.entityBitmap[item].x, gameInfo.entityBitmap[item].y, gameInfo.entityBitmap[item].w, gameInfo.entityBitmap[item].h, x, y, gameInfo.entityBitmap[item].w, gameInfo.entityBitmap[item].h);
	}

	// Calculate player boundaries, pairs of points around sprite.
	function calculatePlayerBoundaries(x, y, w, h, speed) {
		var boundaries = {
			// Center
			c: { x: Math.floor((w / 2) + x), y: Math.floor((h / 2) + y) },
			
			// Top left pair
			tlp: { x: x, y: Math.floor(y-1-speed) },
			
			// Top right pair
			trp: { x: x+w-1 , y: Math.floor(y-1-speed) },
			
			// Right top pair
			rtp: { x: x+w-1+Math.ceil(speed), y: y },
			
			// Right bottom pair
			rbp: { x: x+w-1+Math.ceil(speed), y: y+h-1 },
			
			// Bottom right pair
			brp: { x: x+w-1, y: y+h-1+Math.ceil(speed) },
			
			// Bottom left pair
			blp: { x: x, y: y+h-1+Math.ceil(speed) },
			
			// Left bottom pair
			lbp: { x: Math.floor(x-1-speed), y: y+h-1 },
			
			// Left top pair
			ltp: { x: Math.floor(x-1-speed), y: y }
		}
		return boundaries;
	}

	// Draw player and update x y w h and boundaries.
	function drawPlayer(color, x, y, direction, alt) {
		var w = gameInfo.entityBitmap[color][direction + alt].w;
		var h = gameInfo.entityBitmap[color][direction + alt].h;
		var player = gameInfo.players[color];
		var speed = Math.ceil(gameInfo.speed[player.speed]);
		var boundaries = calculatePlayerBoundaries(x, y, w, h, speed);

		player.x = x;
		player.y = y;
		player.w = w;
		player.h = h;
		for (bound in boundaries) {
			player[bound] = boundaries[bound];
		}
		ctx.drawImage(bmcache, gameInfo.entityBitmap[color][direction + alt].x, gameInfo.entityBitmap[color][direction + alt].y, w, h, x, y, w, h);
	}

	function spawnPlayer(color) {
		var rand = Math.floor(Math.random() * 8);
		var sp = gameInfo.spawnPoints[rand];
		//var sp = gameInfo.spawnPoints[0];
		//console.log(sp.x + " " + sp.y + " " + rand);
		drawPlayer(color, sp.x, sp.y, "d", 0);
	}


	// This function is called when user changes direction, once, to avoid sprite shifting position into another block.
	// For example, walking right until sprite hits a block, sprite changes direction to down, half of body is in wall.
	// Only called from up and down triggers since sprite is wider than he is thicker. w of [d|u] > w of [l|r]
	function correctPlayerPosition() {
		var me = gameInfo.players[gameInfo.me];
		var x = me.x;
		var y = me.y;
		var collisionRight = (isCollision(me.rtp) || isCollision(me.rbp));
		//console.log(collisionRight + " " + me.rtp.x);
		if (collisionRight) { x = (Math.floor(((x - gameInfo.boardx) / 30)) * 30) + 21; }
		return { x: x, y: y };
	}

	function loadSpawnPoints() {
		gameInfo.spawnPoints[0] = { x: 21, y: 24 };
		gameInfo.spawnPoints[1] = { x: 291, y: 24 };
		gameInfo.spawnPoints[2] = { x: 561, y: 24 };
		gameInfo.spawnPoints[3] = { x: 561, y: 234 };
		gameInfo.spawnPoints[4] = { x: 561, y: 444 };
		gameInfo.spawnPoints[5] = { x: 291, y: 444 };
		gameInfo.spawnPoints[6] = { x: 21, y: 444 };
		gameInfo.spawnPoints[7] = { x: 21, y: 234 };
	}

	// Board tiles 2D Array
	function loadBoardTiles() {
		gameInfo.board[0] = "ooooooooooooooooooooo";
		gameInfo.board[1] = "oeebbbbbbeeebbbbbbeeo";
		gameInfo.board[2] = "oewbwbwbwbwbwbwbwbweo";
		gameInfo.board[3] = "obbbbbbbbbbbbbbbbbbbo";
		gameInfo.board[4] = "obwbwbwbwbwbwbwbwbwbo";
		gameInfo.board[5] = "obbbbbbbbbbbbbbbbbbbo";
		gameInfo.board[6] = "obwbwbwbwbwbwbwbwbwbo";
		gameInfo.board[7] = "oebbbbbbbbbbbbbbbbbeo";
		gameInfo.board[8] = "oewbwbwbwbwbwbwbwbweo";
		gameInfo.board[9] = "oebbbbbbbbbbbbbbbbbeo";
		gameInfo.board[10] = "obwbwbwbwbwbwbwbwbwbo";
		gameInfo.board[11] = "obbbbbbbbbbbbbbbbbbbo";
		gameInfo.board[12] = "obwbwbwbwbwbwbwbwbwbo";
		gameInfo.board[13] = "obbbbbbbbbbbbbbbbbbbo";
		gameInfo.board[14] = "oewbwbwbwbwbwbwbwbweo";
		gameInfo.board[15] = "oeebbbbbbeeebbbbbbeeo";
		gameInfo.board[16] = "ooooooooooooooooooooo";
		gameInfo.board = gameInfo.board.map(function(cols) { return cols.split(""); });
	}
	// Mapper for entities
	function loadEntityBitmap() {
		gameInfo.entityBitmap["w"] = { x: 0, y: 30, w: 31, h: 31 };
		gameInfo.entityBitmap["b"] = { x: 0, y: 0, w: 31, h: 31 };
		gameInfo.entityBitmap["bomb"] = { x: 1, y: 145, w: 28, h: 30 };
		gameInfo.entityBitmap["armor"] = { x: 36, y: 203, w: 22, h: 27 };
		gameInfo.entityBitmap["speed"] = { x: 1, y: 62, w: 30, h: 22 };
		gameInfo.entityBitmap["exp"] = { x: 4, y: 85, w: 24, h: 26 };
		gameInfo.entityBitmap["a"] = { x: 0, y: 112, w: 30, h: 31 };
		gameInfo.entityBitmap["f"] = { x: 0, y: 177, w: 30, h: 30 };
		gameInfo.entityBitmap["g"] = { x: 88, y: 240, w: 30, h: 30 };
		gameInfo.entityBitmap["h"] = { x: 0, y: 208, w: 30, h: 30 };
		
		var y = 0;
		for (color in gameInfo.colors) {
			gameInfo.entityBitmap[gameInfo.colors[color]] = {
				d0: { x: 33, y: y, w: 29, h: 23 }, d1: { x: 144, y: y, w: 29, h: 23 }, d2: { x: 255, y: y, w: 29, h: 23 },
				u0: { x: 87, y: y, w: 29, h: 23 }, u1: { x: 198, y: y, w: 29, h: 22 }, u2: { x: 309, y: y, w: 29, h: 22 },
				r0: { x: 120, y: y, w: 20, h: 23 }, r1: { x: 231, y: y, w: 20, h: 23 }, r2: { x: 342, y: y, w: 20, h: 23 },
				l0: { x: 65, y: y, w: 20, h: 23 }, l1: { x: 176, y: y, w: 20, h: 23}, l2: { x: 287, y: y, w: 20, h: 23 }
			};
			y+= 25;
		}
	}
	// Erase all items/sprites/blocks, draw board, walls, unexploded bricks.
	function redrawBoard() {
		// Board Fill
		ctx.fillStyle = gameInfo.boardcolor;
		ctx.fillRect(gameInfo.boardx,gameInfo.boardy,gameInfo.boardw,gameInfo.boardh);
		
		// Put all items on board except empty.
		// Starting at row 1 and col 1 and ending 1 short of each due to outside border being "outside" area.
		var x = gameInfo.boardx;
		var y = gameInfo.boardy;
		var item;
		for (var r = 1; r < gameInfo.board.length-1; r++ ) {
			for (var c = 1; c < gameInfo.board[r].length-1; c++) {
				item = gameInfo.board[r][c];
				if (item != "e") {
					drawItem(item, x, y);
				}
				x += 30;
			}
			x = gameInfo.boardx;
			y += 30;
		}
	}

	// Initial Loading.
	function prepare() {
		ctx.clearRect ( 0 , 0 , ctx.canvas.width, ctx.canvas.height );
		// Main Window
		ctx.fillStyle = gameInfo.bgcolor;
		ctx.fillRect(0,0,800,600);
		
		loadEntityBitmap();				
		loadBoardTiles();
		loadSpawnPoints();
		
		// Board
		redrawBoard();

		gameInfo.gameID = getGameID();
		
		//drawPlayer("red",21,233, "d", 0);
		//spawnPlayer("red");
		
		//drawChoosePlayer();
		
		// Launch renderer.
		//mainRender();
		
	}
	function getGameID() {
		var params = window.location.search.substring(1).split("&");
		for (param in params) {
			var pair = params[param].split("=");
			if (pair[0] == "gid") {
				return pair[1];
			}
		}
		return false;
	}
	function showScores() {
		ctx.fillStyle = gameInfo.bgcolor;
		ctx.fillRect(605,15,180,460);
		for (var n = 0; n < 8; n++) {
			drawBox(610,20 + (n * 57), 170, 50, '#496B8D');
		}
	}

	// GUI Helper
	function drawBox(x,y,w,h, fillStyle) {
		//1 239 4 4 left-top
		//4 239 4 4 right-top
		//1 260 4 4 left-bottom
		//4 260 4 4 right-bottom
		ctx.beginPath();
		var offset = 3;
		ctx.moveTo(x, y + offset);
		ctx.lineTo(x + offset, y);
		ctx.lineTo(w + x - offset, y);
		ctx.lineTo(w + x, y + offset);
		ctx.lineTo(w + x, y + h - offset);
		ctx.lineTo(w + x - offset, y + h);
		ctx.lineTo(x + offset, y + h);
		ctx.lineTo(x, y + h - offset);
		ctx.lineTo(x, y + offset);
		ctx.closePath();
		//ctx.fillStyle = '#496B8D';
		//ctx.fillStyle = 'rgba(0,0,200,0.25)';
		ctx.fillStyle = fillStyle;
		ctx.fill();
		ctx.strokeStyle = "#000000";
		ctx.stroke();
	}
	function drawPlayerName() {
		drawBox(610, 188, 170, 115, '#496B8D');
		ctx.font = "10pt verdana";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("Enter Player Name", 632, 285);
		$("#bmName").show();
		$("#bmNameBtn").show();
	}
	function drawChoosePlayer() {
		var x = 625, y = 203;
		drawBox(x - 15, y - 15, 170, 115, '#496B8D');
		for (color in gameInfo.colors) {
			if (color == 4) {
				x = 625;
				y += 35;
			}
			var player = gameInfo.entityBitmap[gameInfo.colors[color]]["d0"];
			ctx.drawImage(bmcache, player.x, player.y, player.w, player.h, x, y, player.w, player.h);
			if (!gameInfo.availableColors[gameInfo.colors[color]]) {
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + 30, y+23);
				ctx.moveTo(x + 30, y);
				ctx.lineTo(x, y+23);
				ctx.closePath();
				ctx.strokeStyle = "rgb(255,0,0)";
				ctx.stroke();
			}
			x += 35;
		}
		ctx.font = "10pt verdana";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("Choose a Color!", 640, 285);
	}

	// ***** LISTENERS - KEYS

	$(document).keyup(function(e) {
		//console.log(e.keyCode);
		if (gameInfo.playing) {
			if (e.keyCode >= 37 && e.keyCode <= 40) {
				var letter;
				switch (e.keyCode) {
					case 38:
						pressedKeys.u = false;
						letter = "u";
						break;
					case 39:
						pressedKeys.r = false;
						letter = "r";
						break;
					case 40:
						pressedKeys.d = false;
						letter = "d";
						break;
					case 37:
						pressedKeys.l = false;
						letter = "l";
						break;
				}
				var player = gameInfo.players[gameInfo.me];
				if (!pressedKeys.u && !pressedKeys.r && !pressedKeys.d && !pressedKeys.l) {
					player.isStopping = 1;
				} else {
					var newDir;
					for (realDir in pressedKeys) {
						if (pressedKeys[realDir]) { newDir = realDir; break; }
					}
					player.changingDir = (player.dir != realDir ? 1 : 0);
					player.altDir = 0;
					player.dir = realDir;
				}
			}
		}
	});
	$(document).keydown(function(e) {
		var player = gameInfo.players[gameInfo.me];
		if (e.keyCode == 32) {
			e.preventDefault();
			if (!player.isDead && gameInfo.playing) {
				layBomb();
			}
		}
		else if (e.keyCode == 13) {
			e.preventDefault();
			if (player.isDead && gameInfo.playing) {
				player.isDead = false;
				spawnPlayer(player.color);
			}
		}
		else if (e.keyCode >= 37 && e.keyCode <= 40) {
			e.preventDefault();
			if (!player.isDead && gameInfo.playing) {
				var letter;
				switch (e.keyCode) {
					case 37:
						letter = "l";
						break;
					case 38:
						letter = "u";
						break;
					case 39:
						letter = "r";
						break;
					case 40:
						letter = "d";
						break;
				}
				pressedKeys[letter] = true;
				if (player.dir != letter || player.isStopped) {
					player.changingDir = (player.dir != letter ? 1 : 0);
					player.isStopped = 0;
					player.dir = letter;
					player.altDir = 0;
				}
				//38=up
				//39=right
				//40=down
				//37=left
			}
		}
	});

	// *********** DEBUG ******************

	$("#clearBricks").click(function(e) {
		for (var r = 1; r < gameInfo.board.length-1; r++ ) {
			for (var c = 1; c < gameInfo.board[r].length-1; c++) {
				if (gameInfo.board[r][c] != "w") {
					gameInfo.board[r][c] = "e";
				}
			}
		}
	});
	$("#spawnRndSpot").click(function(e) {
		spawnPlayer("red");
	});

	$(document).ready(function() {
		for (prop in gameInfo.players.red) {
			if (prop == "tlp") { break; }
			if (prop == "c") { continue; }
			$("#dbgPlayer").append('<label style="display: inline-block; width: 80px; margin-right: 5px;" for="dbg' + prop + '">' + prop + '</label><input style="width: 50px;" type="text" data-prop="' + prop + '" value="' + gameInfo.players.red[prop] + '" /><br />');
		}
		$("#dbgPlayer").append('<input type="button" value="Save" id="dbgplayerSave" />');
		$("#dbgplayerSave").click(function(e) {
			//console.log($("#dbgPlayer"));
			$("#dbgPlayer").find("input[type=text]").each(function(i,e) {
				var val = isNaN($(e).val()) ? $(e).val() : parseInt($(e).val());
				if (val == "false" || val == "true") { val = (val == "true" ? true : false); }
				gameInfo.players.red[$(e).attr("data-prop")] = val;
			});
		});
	});

	// *************** SOCKET ****************

	function sendToServer(type, data) {
		bmsocket.emit('join', data);
	}
}