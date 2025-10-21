window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');

    const notes = ["C", "D", "E", "F", "G", "A", "B"];

    const colors = {
        "C": "#FF0000",
        "D": "#00FF00",
        "E": "#0000FF",
        "F": "#FFFF00",
        "G": "#00FFFF",
        "A": "#FF00FF",
        "B": "#800080"
    };

    const translations = {
        "C": "دو",
        "D": "ر",
        "E": "می",
        "F": "فا",
        "G": "سل",
        "A": "لا",
        "B": "سی"
    };

    const sounds = {};
    notes.forEach(note => {
        sounds[note] = new Audio(`sounds/${note}.mp3`);
    });

    let keySize, keySpacing, keyPositions, keyRects, staffTopMargin, staffSpacing, staffWidth, staffPositions;
    let canvasLogicalWidth, canvasLogicalHeight; // ابعاد منطقی canvas (بدون dpr)
    let lineColors = Array(5).fill("#000000");
    let noteColors = Array(9).fill("#808080");
    let noteNames = Array(9).fill("");
    let dragging = false;
    let draggingKeyIndex = -1;
    let draggingOffset = { x: 0, y: 0 };
    let noteLabels = {};
    let notePositions = []; // ذخیره موقعیت‌های نت‌ها برای کلیک
    let showLabels = false;
    let showNotes = true;
    let showMainKeys = false;
    let language = "fa";

    const toggleNotesButton = document.getElementById('toggleNotesButton');
    const showLabelsButton = document.getElementById('showLabelsButton');
    const toggleKeysButton = document.getElementById('toggleKeysButton');
    const toggleLanguageButton = document.getElementById('toggleLanguageButton');

    toggleNotesButton.addEventListener('click', () => {
        showNotes = !showNotes;
        redraw();
    });

    showLabelsButton.addEventListener('click', () => {
        showLabels = !showLabels;
        redraw();
    });

    toggleKeysButton.addEventListener('click', () => {
        showMainKeys = !showMainKeys;
        if (showMainKeys) {
            notes.forEach((note, index) => {
                if (note !== "C" && note !== "F" && note !== "G") {
                    keyRects[index].hidden = true;
                } else {
                    keyRects[index].hidden = false;
                }
            });
        } else {
            keyRects.forEach(key => key.hidden = false);
        }
        redraw();
    });

    toggleLanguageButton.addEventListener('click', () => {
        language = language === "fa" ? "en" : "fa";
        toggleLanguage();
    });

    function toggleLanguage() {
        if (language === "fa") {
            toggleNotesButton.textContent = "نمایش/مخفی کردن نت‌ها";
            showLabelsButton.textContent = "نمایش/مخفی کردن برچسب‌ها";
            toggleKeysButton.textContent = "نمایش/مخفی کردن کلید‌های اصلی";
            toggleLanguageButton.textContent = "تغییر زبان فارسی/انگلیسی";
        } else {
            toggleNotesButton.textContent = "Toggle Notes";
            showLabelsButton.textContent = "Toggle Labels";
            toggleKeysButton.textContent = "Toggle Main Keys";
            toggleLanguageButton.textContent = "Switch Language";
        }
        redraw();
    }

    function resizeCanvas() {
        // استفاده از visualViewport برای بهبود نمایش در موبایل
        let width, height;

        if (window.visualViewport) {
            width = window.visualViewport.width;
            height = window.visualViewport.height;
        } else {
            width = window.innerWidth || document.documentElement.clientWidth;
            height = window.innerHeight || document.documentElement.clientHeight;
        }

        // تنظیم دقیق ابعاد canvas
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // ذخیره ابعاد منطقی
        canvasLogicalWidth = width;
        canvasLogicalHeight = height;

        // تنظیم resolution برای شارپ بودن
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.scale(dpr, dpr);

        if (isMobileDevice()) {
            keySize = Math.min(width, height) / 6;
            staffSpacing = height / 6.5;
        } else {
            keySize = Math.min(width, height) / 10;
            staffSpacing = height / 6.5;
        }

        keySpacing = keySize * 1.1;
        keyPositions = Array.from({ length: 7 }, (_, i) => [50, 50 + i * keySpacing]);
        keyRects = keyPositions.map(pos => ({ x: pos[0], y: pos[1], size: keySize }));

        staffTopMargin = height / 10;
        staffWidth = width - 200;
        staffPositions = Array.from({ length: 5 }, (_, i) => ({ x: 200, y: staffTopMargin + i * staffSpacing, width: staffWidth, height: 5 }));
    }

    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    function isPortrait() {
        return window.innerHeight > window.innerWidth;
    }

    function drawStaffLines() {
        staffPositions.forEach((pos, i) => {
            context.fillStyle = lineColors[i];
            context.fillRect(pos.x, pos.y, pos.width, pos.height);

            context.fillStyle = "#000000";
            context.font = `${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 30}px Arial`;
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

        notePositions = []; // پاک کردن موقعیت‌های قبلی

        positions.forEach((y, i) => {
            const x = staffPositions[0].x + (i + 1) * spacing;
            let color = noteColors[i];
            let note = noteNames[i];
            noteLabels[romanLabels[i]] = { x: x, y: y - 40 };

            // ذخیره موقعیت نت برای کلیک
            const noteRadius = Math.min(canvasLogicalWidth, canvasLogicalHeight) / 25;
            notePositions.push({ x, y, note, radius: noteRadius });

            context.beginPath();
            context.arc(x, y, noteRadius, 0, 2 * Math.PI);
            context.fillStyle = color;
            context.fill();
            context.fillStyle = "#FFFFFF";
            context.font = `${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 20}px Arial`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(note !== "" ? (language === "fa" ? translations[note] : note) : "", x, y);
        });
    }

    function handleNoteClick(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX || event.touches[0].clientX) - rect.left;
        const mouseY = (event.clientY || event.touches[0].clientY) - rect.top;

        // بررسی کلیک روی نت‌ها
        for (let notePos of notePositions) {
            const distance = Math.sqrt(Math.pow(mouseX - notePos.x, 2) + Math.pow(mouseY - notePos.y, 2));
            if (distance <= notePos.radius && notePos.note !== "") {
                sounds[notePos.note].currentTime = 0;
                sounds[notePos.note].play();
                break;
            }
        }
    }

    function drawKeys() {
        keyRects.forEach((rect, i) => {
            if (!rect.hidden) {
                context.beginPath();
                context.arc(rect.x + rect.size / 2, rect.y + rect.size / 2, rect.size / 2, 0, 2 * Math.PI);
                context.fillStyle = colors[notes[i]];
                context.fill();
                context.fillStyle = "#FFFFFF";
                context.font = `${rect.size / 1.5}px Arial`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(notes[i], rect.x + rect.size / 2, rect.y + rect.size / 2);
            }
        });
    }

    function drawLabels() {
        for (let label in noteLabels) {
            context.fillStyle = "#000000";
            context.font = `${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 30}px Arial`;
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
                draw(); // شروع animation loop
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
                draw(); // شروع animation loop
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
        }
    }

    function handleTouchMove(event) {
        if (dragging) {
            event.preventDefault(); // جلوگیری از scroll ناخواسته
            const rect = canvas.getBoundingClientRect();
            const touch = event.touches[0];
            const mouseX = touch.clientX - rect.left;
            const mouseY = touch.clientY - rect.top;

            keyRects[draggingKeyIndex].x = mouseX - draggingOffset.x;
            keyRects[draggingKeyIndex].y = mouseY - draggingOffset.y;
        }
    }

    function handleMouseUp() {
        if (dragging) {
            dragging = false;
            draggingKeyIndex = -1;
            redraw(); // رسم نهایی بعد از پایان drag
        }
    }

    function handleTouchEnd(event) {
        const wasDragging = dragging;
        if (dragging) {
            dragging = false;
            draggingKeyIndex = -1;
            redraw(); // رسم نهایی بعد از پایان drag
        }
        // اگر در حال drag نبودیم، یعنی یک tap بوده، صدا پخش کن
        if (!wasDragging) {
            handleNoteClick(event);
        }
    }


    function checkMultipleKeys() {
        let keysOnLines = 0;
        keyRects.forEach(keyRect => {
            if (!keyRect.hidden) { // نادیده گرفتن کلیدهای مخفی
                staffPositions.forEach((staffRect) => {
                    if (keyRect.x < staffRect.x + staffRect.width && keyRect.x + keyRect.size > staffRect.x && keyRect.y < staffRect.y + staffRect.height && keyRect.y + keyRect.size > staffRect.y) {
                        keysOnLines++;
                    }
                });
            }
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
        context.fillText("Error", canvasLogicalWidth / 2, canvasLogicalHeight / 2);
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

    let animationId = null;

    function draw() {
        context.clearRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);

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

        // ادامه انیمیشن فقط اگر در حال drag هستیم
        if (dragging) {
            animationId = requestAnimationFrame(draw);
        }
    }

    function redraw() {
        // لغو انیمیشن قبلی اگر وجود دارد
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        draw();
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        redraw();
    });

    // پشتیبانی بهتر از موبایل
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            resizeCanvas();
            redraw();
        });
    }

    window.addEventListener('orientationchange', () => {
        // تاخیر کوتاه برای اطمینان از اعمال تغییرات
        setTimeout(() => {
            resizeCanvas();
            redraw();
        }, 100);
    });

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    // Event listener برای کلیک روی نت‌ها (فقط برای موس)
    canvas.addEventListener('click', handleNoteClick);

    // جلوگیری از zoom دوبار کلیک در iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    resizeCanvas();
    redraw();
};
