var bmMenuJS = function() {
	var bmrooms = {};
	var isServerDown = true;
	var bmsocket = new io.connect('http://127.0.0.1:8080');
	var lastSelectedGameID = "";
	var lastSelectedIndex = 0;

	function isValidName(name) {
		return name.match(/^[A-Za-z]{1}[A-Za-z0-9_\-~+=!@#$%^&*\(\)\[\]]{1,14}$/);
	}
	function isValidGameRoomName(name) {
		return name.match(/^[A-Za-z]{1}[A-Za-z0-9\\/_\-! @#$'"%^\.&~=*\[\]\(\)+]{5,49}$/);
		//'
	}
	function displayError(errorObj) {
		var txt = "";
		switch (errorObj.c) {
			case "pnt":
				txt = "Player name is taken.";
				break;
			case "cna":
				txt = "The color you have chosen is taken.";
				break;
			case "igi":
				txt = "Error - Invalid Game ID.";
				break;
			case "ipn":
				txt = "Player name must be between 2 and 15 characters long, start with a letter, and no spaces.";
				break;
			case "igrn":
				txt = "Room name must be between 6 and 50 characters long, and start with a letter.";
				break;
			case "gif":
				txt = "Sorry, this room is full.";
				break;
			case "pac":
				txt = "Please pick a color.";
				break;
			case "egrm":
				txt = "Please enter a game room name.";
				break;
			case "epn":
				txt = "Please enter a player name.";
				break;
			case "sid":
				txt = "Sorry, the server is offline.";
				break;
			case "grnt":
				txt = "The specified game room name is taken.";
				break;
		}
		$("#errorBoxTxt").text(txt);
		$("#errorBox").fadeIn("fast");
	}
	function showJoinPanel(isAlreadyOpen) {
		lastSelectedIndex = $(".servers .selectedRoom").index();
		bmsocket.emit('query_room', bmrooms[lastSelectedIndex].gameID);
		if (!isAlreadyOpen) { $("#buttonBar").animate({ height: "161px" }, 200); }
		$(".spriteCont .selected").removeClass("selected");
		$(".spriteCont .notAvailable").hide();
		$("#buttonBar").removeClass("bmCreateOpen");
		$("#buttonBar").addClass("bmJoinOpen");
		$("#roomNameTxt").hide().prev().hide();
		$("#createNewRoomConfirmBtn").hide();
		$("#joinRoomConfirmBtn").show();
		$(".roomAndPlayerCont").css("margin-top", "-4px");
		if (!isAlreadyOpen) { 
			$("#joinRoomBtn").css("opacity", 0.45);
			$("#joinRoomBtn").animate({ opacity: 1 }, 200, function() {
				$("#createNewRoomCont").show();
 			});
		}
		$("#buttonBar .toggledOn").removeClass("toggledOn");
		$("#joinRoomBtn").addClass("toggledOn");
	}
	function showCreatePanel(isAlreadyOpen) {
		if (!isAlreadyOpen) { $("#buttonBar").animate({ height: "161px" }, 200); }
		$(".spriteCont .selected").removeClass("selected");
		$(".spriteCont .notAvailable").hide();
		$("#roomNameTxt").show().prev().show();
		$(".roomAndPlayerCont").css("margin-top", "2px");
		$("#buttonBar").removeClass("bmJoinOpen");
		$("#buttonBar").addClass("bmCreateOpen");
		$("#joinRoomConfirmBtn").hide();
		$("#createNewRoomConfirmBtn").show();
		if (!isAlreadyOpen) {
			$("#createNewRoomBtn").css("opacity", 0.45);
			$("#createNewRoomBtn").animate({ opacity: 1 }, 200, function() {
				$("#createNewRoomCont").show();
		 	});
		}
		$("#buttonBar .toggledOn").removeClass("toggledOn");
		$("#createNewRoomBtn").addClass("toggledOn");
	}
	function hideJoinOrCreatePanel(triggerButton) {
		$("#buttonBar").animate({ height: "47px" }, 200);
		$("#buttonBar").removeClass("bmCreateOpen bmJoinOpen");
		triggerButton.css("opacity", 0.45);
		triggerButton.animate({ opacity: 1 }, 200);
		$("#createNewRoomCont").hide();
		triggerButton.removeClass("toggledOn");
	}

	$("#serverList .servers").on("click", "div.server", function(e) {
		$(".selectedRoom").removeClass("selectedRoom");
		$(e.currentTarget).toggleClass("selectedRoom");
		var roomIndex = $(e.currentTarget).index();
		updatePlayerList(roomIndex);
		lastSelectedIndex = roomIndex;
		lastSelectedGameID = bmrooms[roomIndex].gameID;
	});
	$("#refreshBtn").click(function(e) {
		if (!isServerDown) {
			bmsocket.emit('query_rooms');
			$("#refreshBtn").css("opacity", 0.45);
			$("#refreshBtn").animate({ opacity: 1 }, 200);
		}
	});
	$("#createNewRoomBtn").click(function(e) {
		if (!isServerDown) {
			if ($("#buttonBar").hasClass("bmJoinOpen")) {
				showCreatePanel(true);
			} else if ($("#buttonBar").hasClass("bmCreateOpen")) {
				hideJoinOrCreatePanel($(e.currentTarget));
			} else {
				showCreatePanel(false);
			}
		}
	});
	$("#joinRoomBtn").click(function(e) {
		if (!isServerDown) {
			if ($(".selectedRoom").length == 1) {
				if ($("#buttonBar").hasClass("bmCreateOpen")) {
					showJoinPanel(true);
				} else if ($("#buttonBar").hasClass("bmJoinOpen")) {
					hideJoinOrCreatePanel($(e.currentTarget));
				} else {
					showJoinPanel(false);
				}
			}
		}
	});
	$(".bmsprites").click(function(e) {
		if ($(e.currentTarget).find(".notAvailable").css("display") == "none") {
			$(".spriteCont .selected").removeClass("selected");
			$(e.currentTarget).addClass("selected");
		}
	});
	$("#createNewRoomConfirmBtn").click(function(e) {
		if (!isServerDown) {
			$(e.currentTarget).css("opacity", 0.45);
			$(e.currentTarget).animate({ opacity: 1 }, 200);
			var roomTitle = $("#roomNameTxt").val();
			var playerName = $("#playerNameTxt").val();
			var color = $(".spriteCont .selected").data("color");
			if (roomTitle.length == 0) {
				displayError({ c: "egrm" });
			} else {
				if (isValidGameRoomName(roomTitle)) {
					if (playerName.length == 0) {
						displayError({ c: "epn" });
					} else {
						if (isValidName(playerName)) {
							if ($(".spriteCont .selected").length == 1) {
								bmsocket.emit('createRoom', { rt: roomTitle.trim().replace(/ +/g, " "), n: playerName, c: color });						
							} else {
								displayError({ c: "pac" });
							}
						} else {
							displayError({ c: "ipn" });
						}
					}
				} else {
					displayError({ c: "igrn" });
				}
			}
		}
	});
	$("#joinRoomConfirmBtn").click(function(e) {
		if (!isServerDown) {
			$(e.currentTarget).css("opacity", 0.45);
			$(e.currentTarget).animate({ opacity: 1 }, 200);
			var playerName = $("#playerNameTxt").val();
			var color = $(".spriteCont .selected").data("color");
			var gameID = bmrooms[lastSelectedIndex].gameID;
			if (playerName.length == 0) {
				displayError({ c: "epn" });
			} else {
				if (isValidName(playerName)) {
					if ($(".spriteCont .selected").length == 1) {
						bmsocket.emit('joinRoom', { n: playerName, c: color, gameID: gameID });
					} else {
						displayError({ c: "pac" });
					}
				} else {
					displayError({ c: "ipn" });
				}
			}
		}
	});
	$("#errorBoxCloseBtn").click(function(e) {
		$(e.currentTarget).css("opacity", 0.45);
		$(e.currentTarget).animate({ opacity: 1 }, 200);
		$("#errorBox").fadeOut("fast");
	});
	function updateRoomList() {
		$(".servers").empty();
		$(".playerList").empty();
		for (var room in bmrooms) {
			var roomInfo = bmrooms[room];
			var roomNum = parseInt(room) + 1;
			$(".servers").append('<div class="server"><span class="serverNum">' + roomNum + '</span><span class="serverName">' + roomInfo.roomName + '</span><span class="serverPlayers">' + roomInfo.names.length + ' / 8</span></div>');
			bmrooms[room].names = roomInfo.names.sort(function(a,b) { return b.s - a.s; });
		}
		for (var n = 0; n < bmrooms.length; n++) {
			if (bmrooms[n].gameID == lastSelectedGameID) {
				$(".servers div.server").eq(n).trigger("click");
			}
		}
		if ($(".servers .selectedRoom").length == 0) {
			$(".servers div.server").eq(0).trigger("click");
		}
	}
	function updatePlayerList(roomIndex) {
		$(".playerList").empty();
		var names = bmrooms[roomIndex].names;
		for (var player in names) {
			$(".playerList").append('<div class="namescore"><span class="serverPlayerName">' + names[player].n + '</span><span class="serverPlayerScore">'+ names[player].s +'</span></div>');
		}
	}
	function updateSpriteAvailability(roomIndex) {
		var ac = bmrooms[roomIndex].ac;
		for (var color in ac) {
			if (!ac[color]) {
				$('.bmsprites[data-color="' + color + '"]').find(".notAvailable").show();
			}
		}	
	}
	// TEMP remove after
	bmsocket.on('error',function(error) {
		console.log(error);
	});

	// On page load, connect and query rooms list.
	bmsocket.on('connect',function() {
		isServerDown = false;
		bmsocket.emit('query_rooms');
	});
	// If connect fails, destroy.
	bmsocket.on('connect_error', function(error) {
		bmsocket.destroy();
		isServerDown = true;
		displayError({ c: "sid" });
	});

	// Query Room Lists.
	bmsocket.on('query_rooms', function(rooms) {
		bmrooms = rooms;
		updateRoomList();
		if ($("#buttonBar").hasClass("bmJoinOpen")) {
			updateSpriteAvailability(lastSelectedIndex);
		}
	});
	// Query only room when user clicks join (to update colors).
	bmsocket.on('query_room', function(room) {
		bmrooms[lastSelectedIndex] = room;
		updateRoomList();
		updatePlayerList(lastSelectedIndex);
		updateSpriteAvailability(lastSelectedIndex);
	});
	// Successfully created Room - Switch to game view.
	bmsocket.on('createRoom', function(resp) {
		console.log(resp);
	});
	// Successfully joined Room - switch to game view.
	bmsocket.on('joinRoom', function(resp) {
		console.log(resp);
	});

	// ******* ERROR HANDLING **************

	// If create room fails.
	bmsocket.on('createRoom_error', function(resp) {
		displayError(resp);
	});
	// If joining room fails.
	bmsocket.on('joinRoom_error', function(resp) {
		displayError(resp);
	});
	// If query fails.
	bmsocket.on('query_error', function(error) {
		if (error.c == "igi") {
			console.log("Error - Invalid Game ID");
		} else if (error.c == "gif") {
			alert("Game Is Full");
		}
	});				
	// Add a connect listener - TEMP - remove when done
	bmsocket.on('message',function(data) {
		console.log('Received a message from the server!',data);
	});
	// If server loses connection, destroy all.
	bmsocket.on('disconnect',function() {
		//console.log('The client has disconnected!');
		bmsocket.destroy();
		isServerDown = true;
		displayError({ c: "sid" });
	});

	function sendToServer(type, data) {
		bmsocket.emit('join', data);
	}
}