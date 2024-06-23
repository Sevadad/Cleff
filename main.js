window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');

    const notes = ["C", "D", "E", "F", "G", "A", "B"];
    let order = [...notes];

    const colors = {
        "C": "#FF0000",
        "D": "#00FF00",
        "E": "#0000FF",
        "F": "#FFFF00",
        "G": "#00FFFF",
        "A": "#FF00FF",
        "B": "#800080"
    };

    let keySize, keySpacing, keyPositions, keyRects, staffTopMargin, staffSpacing, staffWidth, staffPositions, betweenStaffPositions;
    let lineColors = Array(5).fill("#000000");
    let noteColors = Array(9).fill("#808080");
    let noteNames = Array(9).fill("");
    let dragging = false;
    let draggingKeyIndex = -1;
    let draggingOffset = { x: 0, y: 0 };
    let noteLabels = {};
    let showLabels = false;
    let showNotes = true;

    const toggleNotesButton = document.getElementById('toggleNotesButton');
    const showLabelsButton = document.getElementById('showLabelsButton');

    toggleNotesButton.addEventListener('click', () => {
        showNotes = !showNotes;
    });

    showLabelsButton.addEventListener('click', () => {
        showLabels = !showLabels;
    });

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

// تنظیم اندازه کلیدها        
        if (isMobileDevice()) {
            keySize = Math.min(canvas.width, canvas.height) / 40; // اندازه کلید بزرگتر
        } else {
            keySize = Math.min(canvas.width, canvas.height) / 20;
        }

         keySpacing = keySize * 1.6;
         keyPositions = Array.from({ length: 7 }, (_, i) => [50, 50 + i * keySpacing]);
         keyRects = keyPositions.map(pos => ({ x: pos[0], y: pos[1], size: keySize }));

         staffTopMargin = canvas.height / 10;
         staffSpacing = canvas.height / 10;
         staffWidth = canvas.width - 200;
         staffPositions = Array.from({ length: 5 }, (_, i) => ({ x: 200, y: staffTopMargin + i * staffSpacing, width: staffWidth, height: 5 }));
         betweenStaffPositions = Array.from({ length: 4 }, (_, i) => ({ x: 200, y: staffTopMargin + staffSpacing / 2 + i * staffSpacing, width: staffWidth, height: 5 }));
    }





    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    function drawStaffLines() {
        staffPositions.forEach((pos, i) => {
            context.fillStyle = lineColors[i];
            context.fillRect(pos.x, pos.y, pos.width, pos.height);

            context.fillStyle = "#000000";
            context.font = `${Math.min(canvas.width, canvas.height) / 30}px Arial`;
            context.textAlign = "right";
            context.fillText(5 - i, pos.x - 10, pos.y + pos.height / 2 + 10);
        });
    }

    function drawNotes() {
        if (!showNotes) return;

        let positions = staffPositions.flatMap((pos, i) => [
            pos.y,
            (pos.y + (staffPositions[i + 1] ? staffPositions[i + 1].y : pos.y + 100)) / 2
        ]).slice(0, 9).reverse();

        const romanLabels = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
        const spacing = staffWidth / (romanLabels.length + 1);

        positions.forEach((y, i) => {
            const x = staffPositions[0].x + (i + 1) * spacing;
            let color = noteColors[i];
            let note = noteNames[i];
            noteLabels[romanLabels[i]] = { x: x, y: y - 40 };

            context.beginPath();
            context.arc(x, y, keySize / 1.5, 0, 2 * Math.PI);
            context.fillStyle = color;
            context.fill();
            context.fillStyle = "#FFFFFF";
            context.font = `${keySize / 1.5}px Arial`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(note, x, y);
        });
    }

    function drawKeys() {
        keyRects.forEach((rect, i) => {
            context.beginPath();
            context.arc(rect.x + rect.size / 2, rect.y + rect.size / 2, rect.size / 2, 0, 2 * Math.PI);
            context.fillStyle = colors[notes[i]];
            context.fill();
            context.fillStyle = "#FFFFFF";
            context.font = `${rect.size / 1.5}px Arial`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(notes[i], rect.x + rect.size / 2, rect.y + rect.size / 2);
        });
    }

    function drawLabels() {
        for (let label in noteLabels) {
            context.fillStyle = "#000000";
            context.font = `${Math.min(canvas.width, canvas.height) / 30}px Arial`;
            context.textAlign = "center";
            context.fillText(label, noteLabels[label].x, noteLabels[label].y);
        }
    }

    function handleMouseDown(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        keyRects.forEach((keyRect, index) => {
            if (mouseX > keyRect.x && mouseX < keyRect.x + keyRect.size && mouseY > keyRect.y && mouseY < keyRect.y + keyRect.size) {
                dragging = true;
                draggingKeyIndex = index;
                draggingOffset.x = mouseX - keyRect.x;
                draggingOffset.y = mouseY - keyRect.y;
            }
        });
    }

    function handleTouchStart(event) {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;

        keyRects.forEach((keyRect, index) => {
            if (mouseX > keyRect.x && mouseX < keyRect.x + keyRect.size && mouseY > keyRect.y && mouseY < keyRect.y + keyRect.size) {
                dragging = true;
                draggingKeyIndex = index;
                draggingOffset.x = mouseX - keyRect.x;
                draggingOffset.y = mouseY - keyRect.y;
            }
        });
    }

    function handleMouseMove(event) {
        if (dragging) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            keyRects[draggingKeyIndex].x = mouseX - draggingOffset.x;
            keyRects[draggingKeyIndex].y = mouseY - draggingOffset.y;

            const lineIndex = checkCollision(draggingKeyIndex);
            if (lineIndex !== -1 && notes[draggingKeyIndex] === "C") {
                order = notes.slice(lineIndex).concat(notes.slice(0, lineIndex));
            }
        }
    }

    function handleTouchMove(event) {
        if (dragging) {
            const rect = canvas.getBoundingClientRect();
            const touch = event.touches[0];
            const mouseX = touch.clientX - rect.left;
            const mouseY = touch.clientY - rect.top;

            keyRects[draggingKeyIndex].x = mouseX - draggingOffset.x;
            keyRects[draggingKeyIndex].y = mouseY - draggingOffset.y;

            const lineIndex = checkCollision(draggingKeyIndex);
            if (lineIndex !== -1 && notes[draggingKeyIndex] === "C") {
                order = notes.slice(lineIndex).concat(notes.slice(0, lineIndex));
            }
        }
    }

    function handleMouseUp() {
        dragging = false;
        draggingKeyIndex = -1;
    }

    function handleTouchEnd() {
        dragging = false;
        draggingKeyIndex = -1;
    }

    function checkCollision(keyIndex) {
        const keyRect = keyRects[keyIndex];
        for (let i = 0; i < staffPositions.length; i++) {
            const staffRect = staffPositions[i];
            if (keyRect.x < staffRect.x + staffRect.width && keyRect.x + keyRect.size > staffRect.x && keyRect.y < staffRect.y + staffRect.height && keyRect.y + keyRect.size > staffRect.y) {
                return i;
            }
        }
        return -1;
    }

    function checkMultipleKeys() {
        let keysOnLines = 0;
        keyRects.forEach(keyRect => {
            staffPositions.forEach((staffRect) => {
                if (keyRect.x < staffRect.x + staffRect.width && keyRect.x + keyRect.size > staffRect.x && keyRect.y < staffRect.y + staffRect.height && keyRect.y + keyRect.size > staffRect.y) {
                    keysOnLines++;
                }
            });
        });
        return keysOnLines > 1;
    }

    function resetLineColors() {
        lineColors.fill("#000000");
        noteColors.fill("#808080");
        noteNames.fill("");
    }

    function displayError() {
        context.fillStyle = "#FF0000";
        context.font = "100px Arial";
        context.textAlign = "center";
        context.fillText("Error", canvas.width / 2, canvas.height / 2);
    }

    function updateNotes() {
        resetLineColors();
        keyRects.forEach((keyRect, keyIndex) => {
            staffPositions.forEach((staffRect, staffIndex) => {
                if (keyRect.x < staffRect.x + staffRect.width && keyRect.x + keyRect.size > staffRect.x && keyRect.y < staffRect.y + staffRect.height && keyRect.y + keyRect.size > staffRect.y) {
                    lineColors[staffIndex] = colors[notes[keyIndex]];
                    noteColors[(4 - staffIndex) * 2] = colors[notes[keyIndex]];
                    noteNames[(4 - staffIndex) * 2] = notes[keyIndex];

                    if (notes[keyIndex] === "C") {
                        if (staffIndex === 0) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                        } else if (staffIndex === 1) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                        } else if (staffIndex === 2) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                        } else if (staffIndex === 3) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                        } else if (staffIndex === 4) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                        }
                    } else if (notes[keyIndex] === "D") {
                        if (staffIndex === 0) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                        } else if (staffIndex === 1) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                        } else if (staffIndex === 2) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                        } else if (staffIndex === 3) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                        } else if (staffIndex === 4) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                        }
                    } else if (notes[keyIndex] === "E") {
                        if (staffIndex === 0) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                        } else if (staffIndex === 1) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                        } else if (staffIndex === 2) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                        } else if (staffIndex === 3) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                        } else if (staffIndex === 4) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                        }
                    } else if (notes[keyIndex] === "F") {
                        if (staffIndex === 0) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                        } else if (staffIndex === 1) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                        } else if (staffIndex === 2) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                        } else if (staffIndex === 3) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                        } else if (staffIndex === 4) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                        }
                    } else if (notes[keyIndex] === "G") {
                        if (staffIndex === 0) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                        } else if (staffIndex === 1) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                        } else if (staffIndex === 2) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                        } else if (staffIndex === 3) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                        } else if (staffIndex === 4) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                        }
                    } else if (notes[keyIndex] === "A") {
                        if (staffIndex === 0) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                        } else if (staffIndex === 1) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                        } else if (staffIndex === 2) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                        } else if (staffIndex === 3) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                        } else if (staffIndex === 4) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                        }
                    } else if (notes[keyIndex] === "B") {
                        if (staffIndex === 0) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                        } else if (staffIndex === 1) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                        } else if (staffIndex === 2) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                        } else if (staffIndex === 3) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                        } else if (staffIndex === 4) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                        }
                    }
                }
            });
        });
    }

    function gameLoop() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        drawStaffLines();
        drawKeys();
        if (showLabels) drawLabels();

        if (checkMultipleKeys()) {
            displayError();
            resetLineColors();
        } else {
            updateNotes();
            drawNotes();
        }

        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        drawStaffLines();
        drawKeys();
        drawNotes();
    });

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    if (isMobileDevice()) {
        document.body.style.fontSize = '14px';
        toggleNotesButton.style.fontSize = '12px';
        showLabelsButton.style.fontSize = '12px';
    }

    resizeCanvas();
    gameLoop();
};