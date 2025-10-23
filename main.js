window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');

    const notes = ["C", "D", "E", "F", "G", "A", "B"];

    // Modern gradient colors - بازگشت به رنگ‌های اصلی با gradient
    const colors = {
        "C": { start: "#FF0000", end: "#CC0000", glow: "rgba(255, 0, 0, 0.6)" },      // قرمز
        "D": { start: "#00FF00", end: "#00CC00", glow: "rgba(0, 255, 0, 0.6)" },      // سبز
        "E": { start: "#0000FF", end: "#0000CC", glow: "rgba(0, 0, 255, 0.6)" },      // آبی
        "F": { start: "#FFFF00", end: "#CCCC00", glow: "rgba(255, 255, 0, 0.6)" },    // زرد
        "G": { start: "#00FFFF", end: "#00CCCC", glow: "rgba(0, 255, 255, 0.6)" },    // فیروزه‌ای
        "A": { start: "#FF00FF", end: "#CC00CC", glow: "rgba(255, 0, 255, 0.6)" },    // صورتی
        "B": { start: "#800080", end: "#600060", glow: "rgba(128, 0, 128, 0.6)" }     // بنفش
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

    // تنظیم Tone.js synth برای تولید صدای پیانو
    let synth = null;

    // تعریف نت‌های مبنا برای هر کلید
    const keyBaseNotes = {
        "F": "F3",
        "A": "A3",
        "B": "B3",
        "C": "C4",
        "D": "D4",
        "E": "E4",
        "G": "G4"
    };

    // ترتیب نت‌ها در موسیقی
    const noteSequence = ["C", "D", "E", "F", "G", "A", "B"];

    // راه‌اندازی AudioContext (برای موبایل نیاز به تعامل کاربر است)
    async function initAudio() {
        if (!synth) {
            await Tone.start();
            synth = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 1
                }
            }).toDestination();
            console.log("🎹 Tone.js initialized successfully!");
        }
    }

    let keySize, keySpacing, keyPositions, keyRects, staffTopMargin, staffSpacing, staffWidth, staffPositions;
    let canvasLogicalWidth, canvasLogicalHeight; // ابعاد منطقی canvas (بدون dpr)
    let lineColors = Array(5).fill(null);
    let noteColors = Array(9).fill(null);
    let noteNames = Array(9).fill("");
    let noteWithOctaves = Array(9).fill(""); // ذخیره نت‌ها با اکتاو (مثل C4, G5)
    let highlightedNoteIndex = -1; // فقط این نت رنگی می‌شود
    let dragging = false;
    let draggingKeyIndex = -1;
    let draggingOffset = { x: 0, y: 0 };
    let noteLabels = {};
    let notePositions = []; // ذخیره موقعیت‌های نت‌ها برای کلیک
    let notePulse = {}; // برای انیمیشن pulse
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
            // رسم سایه خطوط
            context.shadowColor = 'rgba(0, 0, 0, 0.4)';
            context.shadowBlur = 10;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 3;

            // رسم خط با gradient (پررنگ‌تر و تیره‌تر)
            const lineGradient = context.createLinearGradient(pos.x, 0, pos.x + pos.width, 0);
            lineGradient.addColorStop(0, 'rgba(40, 40, 80, 0.7)');
            lineGradient.addColorStop(0.5, 'rgba(60, 60, 100, 0.9)');
            lineGradient.addColorStop(1, 'rgba(40, 40, 80, 0.7)');

            // اگر کلیدی روی این خط هست، glow و رنگ اضافه کن
            if (lineColors[i]) {
                context.shadowColor = lineColors[i].glow;
                context.shadowBlur = 25;

                // رنگ خط با رنگ کلید (پررنگ‌تر)
                const colorGradient = context.createLinearGradient(pos.x, 0, pos.x + pos.width, 0);
                colorGradient.addColorStop(0, lineColors[i].start);
                colorGradient.addColorStop(0.5, lineColors[i].end);
                colorGradient.addColorStop(1, lineColors[i].start);
                context.fillStyle = colorGradient;
            } else {
                context.fillStyle = lineGradient;
            }

            context.fillRect(pos.x, pos.y, pos.width, pos.height);

            // Reset shadow
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;

            // شماره خط (پررنگ‌تر)
            context.fillStyle = "rgba(255, 255, 255, 0.95)";
            context.font = `bold ${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 30}px 'Poppins', sans-serif`;
            context.textAlign = "right";
            context.shadowColor = 'rgba(0, 0, 0, 0.7)';
            context.shadowBlur = 6;
            context.fillText(5 - i, pos.x - 10, pos.y + pos.height / 2 + 10);
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
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
            let note = noteNames[i];
            noteLabels[romanLabels[i]] = { x: x, y: y - 40 };

            const noteRadius = Math.min(canvasLogicalWidth, canvasLogicalHeight) / 25;
            const radiusX = noteRadius * 1.2; // عرض بیضی
            const radiusY = noteRadius * 0.85; // ارتفاع بیضی
            const rotation = -20 * Math.PI / 180; // زاویه مایل 20 درجه

            // محاسبه pulse برای انیمیشن
            let scale = 1;
            if (notePulse[i] && Date.now() - notePulse[i] < 500) {
                const elapsed = Date.now() - notePulse[i];
                scale = 1 + Math.sin((elapsed / 500) * Math.PI) * 0.3;
            }

            // ذخیره موقعیت نت برای کلیک
            notePositions.push({ x, y, note, radius: noteRadius * scale, index: i });

            if (note !== "") {
                const currentRadiusX = radiusX * scale;
                const currentRadiusY = radiusY * scale;

                // فقط نت همنام (highlighted) رنگی می‌شود
                const isHighlighted = (i === highlightedNoteIndex);
                const colorObj = isHighlighted ? noteColors[i] : null;

                if (isHighlighted && colorObj) {
                    // نت رنگی - نت همنام کلید
                    context.shadowColor = colorObj.glow;
                    context.shadowBlur = 20 * scale;
                    context.shadowOffsetX = 0;
                    context.shadowOffsetY = 0;

                    // رسم بیضی با gradient
                    const gradient = context.createRadialGradient(x, y, 0, x, y, currentRadiusX);
                    gradient.addColorStop(0, colorObj.start);
                    gradient.addColorStop(1, colorObj.end);

                    context.save();
                    context.translate(x, y);
                    context.rotate(rotation);
                    context.beginPath();
                    context.ellipse(0, 0, currentRadiusX, currentRadiusY, 0, 0, 2 * Math.PI);
                    context.fillStyle = gradient;
                    context.fill();

                    // Border
                    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    context.lineWidth = 2;
                    context.stroke();
                    context.restore();

                    context.shadowColor = 'transparent';
                    context.shadowBlur = 0;

                    // نوشتن نام نت
                    context.fillStyle = "#FFFFFF";
                    context.font = `bold ${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 20}px 'Vazirmatn', 'Poppins', sans-serif`;
                    context.textAlign = "center";
                    context.textBaseline = "middle";
                    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    context.shadowBlur = 4;
                    context.fillText(language === "fa" ? translations[note] : note, x, y);
                    context.shadowColor = 'transparent';
                    context.shadowBlur = 0;
                } else {
                    // نت خاکستری - بقیه نت‌ها
                    const gradient = context.createRadialGradient(x, y, 0, x, y, currentRadiusX);
                    gradient.addColorStop(0, 'rgba(180, 180, 180, 0.4)');
                    gradient.addColorStop(1, 'rgba(120, 120, 120, 0.3)');

                    context.save();
                    context.translate(x, y);
                    context.rotate(rotation);
                    context.beginPath();
                    context.ellipse(0, 0, currentRadiusX, currentRadiusY, 0, 0, 2 * Math.PI);
                    context.fillStyle = gradient;
                    context.fill();

                    // Border
                    context.strokeStyle = 'rgba(200, 200, 200, 0.5)';
                    context.lineWidth = 1.5;
                    context.stroke();
                    context.restore();

                    // نوشتن نام نت
                    context.fillStyle = "rgba(220, 220, 220, 0.8)";
                    context.font = `${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 22}px 'Vazirmatn', 'Poppins', sans-serif`;
                    context.textAlign = "center";
                    context.textBaseline = "middle";
                    context.fillText(language === "fa" ? translations[note] : note, x, y);
                }
            } else {
                // نت خالی - بیضی شفاف با border واضح
                context.save();
                context.translate(x, y);
                context.rotate(rotation);

                // سایه برای وضوح بیشتر
                context.shadowColor = 'rgba(0, 0, 0, 0.4)';
                context.shadowBlur = 10;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 2;

                context.beginPath();
                context.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);

                // پر کردن با شیشه‌ای روشن‌تر
                const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
                context.fillStyle = gradient;
                context.fill();

                // Border پررنگ برای visibility
                context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                context.lineWidth = 2.5;
                context.stroke();

                // Inner border برای جلوه بهتر
                context.beginPath();
                context.ellipse(0, 0, radiusX - 2, radiusY - 2, 0, 0, 2 * Math.PI);
                context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                context.lineWidth = 1;
                context.stroke();

                context.restore();

                context.shadowColor = 'transparent';
                context.shadowBlur = 0;
            }
        });
    }

    async function handleNoteClick(event) {
        // راه‌اندازی صدا (اولین بار نیاز به تعامل کاربر است)
        await initAudio();

        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX || event.touches[0].clientX) - rect.left;
        const mouseY = (event.clientY || event.touches[0].clientY) - rect.top;

        // بررسی کلیک روی نت‌ها
        for (let i = 0; i < notePositions.length; i++) {
            const notePos = notePositions[i];
            const distance = Math.sqrt(Math.pow(mouseX - notePos.x, 2) + Math.pow(mouseY - notePos.y, 2));
            if (distance <= notePos.radius && noteWithOctaves[notePos.index] !== "") {
                // شروع انیمیشن pulse
                notePulse[notePos.index] = Date.now();

                // پخش نت با اکتاو صحیح با Tone.js
                const noteToPlay = noteWithOctaves[notePos.index];
                console.log("🎵 Playing note:", noteToPlay);
                synth.triggerAttackRelease(noteToPlay, "8n");

                // شروع animation loop برای pulse
                animateNotePulse();
                break;
            }
        }
    }

    function animateNotePulse() {
        redraw();
        // ادامه انیمیشن تا زمانی که pulse فعال باشه
        const hasPulse = Object.values(notePulse).some(time => Date.now() - time < 500);
        if (hasPulse) {
            requestAnimationFrame(animateNotePulse);
        }
    }

    function drawKeys() {
        keyRects.forEach((rect, i) => {
            if (!rect.hidden) {
                const centerX = rect.x + rect.size / 2;
                const centerY = rect.y + rect.size / 2;
                const radius = rect.size / 2;
                const colorObj = colors[notes[i]];

                // Scale effect for dragging
                const scale = (dragging && draggingKeyIndex === i) ? 1.1 : 1;
                const currentRadius = radius * scale;

                // Glow effect
                context.shadowColor = colorObj.glow;
                context.shadowBlur = dragging && draggingKeyIndex === i ? 30 : 15;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;

                // رسم دایره کلید با gradient
                const gradient = context.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, currentRadius
                );
                gradient.addColorStop(0, colorObj.start);
                gradient.addColorStop(1, colorObj.end);

                context.beginPath();
                context.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
                context.fillStyle = gradient;
                context.fill();

                // Glassmorphism border
                context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                context.lineWidth = 3;
                context.stroke();

                // Inner glow
                context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                context.lineWidth = 1;
                context.beginPath();
                context.arc(centerX, centerY, currentRadius - 3, 0, 2 * Math.PI);
                context.stroke();

                // Reset shadow
                context.shadowColor = 'transparent';
                context.shadowBlur = 0;

                // نوشتن نام کلید
                context.fillStyle = "#FFFFFF";
                context.font = `bold ${rect.size / 1.8}px 'Poppins', sans-serif`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.shadowColor = 'rgba(0, 0, 0, 0.5)';
                context.shadowBlur = 6;
                context.fillText(notes[i], centerX, centerY);

                // Reset shadow
                context.shadowColor = 'transparent';
                context.shadowBlur = 0;
            }
        });
    }

    function drawLabels() {
        for (let label in noteLabels) {
            context.fillStyle = "rgba(255, 255, 255, 0.9)";
            context.font = `bold ${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 30}px 'Poppins', sans-serif`;
            context.textAlign = "center";
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowBlur = 6;
            context.fillText(label, noteLabels[label].x, noteLabels[label].y);
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
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
        lineColors.fill(null);
        noteColors.fill(null);
        noteNames.fill("");
        noteWithOctaves.fill("");
        highlightedNoteIndex = -1; // reset highlighted note
    }

    function setNoteColorsFromNames() {
        // تنظیم رنگ‌های نت‌ها براساس نام‌هایشان
        noteColors = noteNames.map(name => name ? colors[name] : null);
    }

    function displayError() {
        // Glassmorphism error box
        const boxWidth = Math.min(400, canvasLogicalWidth * 0.8);
        const boxHeight = 150;
        const boxX = (canvasLogicalWidth - boxWidth) / 2;
        const boxY = (canvasLogicalHeight - boxHeight) / 2;

        // Shadow
        context.shadowColor = 'rgba(0, 0, 0, 0.3)';
        context.shadowBlur = 20;

        // Glass background
        context.fillStyle = 'rgba(255, 255, 255, 0.1)';
        context.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Border
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        context.lineWidth = 2;
        context.strokeRect(boxX, boxY, boxWidth, boxHeight);

        context.shadowColor = 'transparent';
        context.shadowBlur = 0;

        // Error text with glow
        context.fillStyle = "#FF6B6B";
        context.font = `bold ${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 12}px 'Poppins', sans-serif`;
        context.textAlign = "center";
        context.shadowColor = 'rgba(255, 107, 107, 0.8)';
        context.shadowBlur = 20;
        context.fillText("Error!", canvasLogicalWidth / 2, canvasLogicalHeight / 2 - 10);

        // Sub text
        context.font = `${Math.min(canvasLogicalWidth, canvasLogicalHeight) / 25}px 'Poppins', sans-serif`;
        context.fillStyle = "rgba(255, 255, 255, 0.9)";
        context.shadowBlur = 10;
        context.fillText("Only one key per line", canvasLogicalWidth / 2, canvasLogicalHeight / 2 + 30);

        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
    }

    function updateNotes() {
        resetLineColors();
        keyRects.forEach((keyRect, keyIndex) => {
            staffPositions.forEach((staffRect, staffIndex) => {
                if (keyRect.x < staffRect.x + staffRect.width && keyRect.x + keyRect.size > staffRect.x && keyRect.y < staffRect.y + staffRect.height && keyRect.y + keyRect.size > staffRect.y) {
                    lineColors[staffIndex] = colors[notes[keyIndex]];
                    noteColors[(4 - staffIndex) * 2] = colors[notes[keyIndex]];
                    noteNames[(4 - staffIndex) * 2] = notes[keyIndex];
                    highlightedNoteIndex = (4 - staffIndex) * 2; // فقط این نت رنگی می‌شود

                    if (notes[keyIndex] === "C") {
                        if (staffIndex === 0) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                            noteWithOctaves = ["B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"];
                        } else if (staffIndex === 1) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                            noteWithOctaves = ["D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                            noteWithOctaves = ["F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                            noteWithOctaves = ["A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3"];
                        } else if (staffIndex === 4) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                            noteWithOctaves = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3"];
                        }
                    } else if (notes[keyIndex] === "D") {
                        if (staffIndex === 0) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                            noteWithOctaves = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4"];
                        } else if (staffIndex === 1) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                            noteWithOctaves = ["E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                            noteWithOctaves = ["G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                            noteWithOctaves = ["B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
                        } else if (staffIndex === 4) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                            noteWithOctaves = ["D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
                        }
                    } else if (notes[keyIndex] === "E") {
                        if (staffIndex === 0) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                            noteWithOctaves = ["D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4"];
                        } else if (staffIndex === 1) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                            noteWithOctaves = ["F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                            noteWithOctaves = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                            noteWithOctaves = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"];
                        } else if (staffIndex === 4) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                            noteWithOctaves = ["E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5"];
                        }
                    } else if (notes[keyIndex] === "F") {
                        if (staffIndex === 0) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                            noteWithOctaves = ["E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3"];
                        } else if (staffIndex === 1) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                            noteWithOctaves = ["G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3"];
                        } else if (staffIndex === 2) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                            noteWithOctaves = ["B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                            noteWithOctaves = ["D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4"];
                        } else if (staffIndex === 4) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                            noteWithOctaves = ["F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4"];
                        }
                    } else if (notes[keyIndex] === "G") {
                        if (staffIndex === 0) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                            noteWithOctaves = ["F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4"];
                        } else if (staffIndex === 1) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                            noteWithOctaves = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                            noteWithOctaves = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"];
                        } else if (staffIndex === 3) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                            noteWithOctaves = ["E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5"];
                        } else if (staffIndex === 4) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                            noteWithOctaves = ["G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"];
                        }
                    } else if (notes[keyIndex] === "A") {
                        if (staffIndex === 0) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                            noteWithOctaves = ["G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3"];
                        } else if (staffIndex === 1) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                            noteWithOctaves = ["B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["D", "E", "F", "G", "A", "B", "C", "D", "E"];
                            noteWithOctaves = ["D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["F", "G", "A", "B", "C", "D", "E", "F", "G"];
                            noteWithOctaves = ["F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4"];
                        } else if (staffIndex === 4) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                            noteWithOctaves = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4"];
                        }
                    } else if (notes[keyIndex] === "B") {
                        if (staffIndex === 0) {
                            noteNames = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
                            noteWithOctaves = ["A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3"];
                        } else if (staffIndex === 1) {
                            noteNames = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
                            noteWithOctaves = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4"];
                        } else if (staffIndex === 2) {
                            noteNames = ["E", "F", "G", "A", "B", "C", "D", "E", "F"];
                            noteWithOctaves = ["E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4"];
                        } else if (staffIndex === 3) {
                            noteNames = ["G", "A", "B", "C", "D", "E", "F", "G", "A"];
                            noteWithOctaves = ["G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"];
                        } else if (staffIndex === 4) {
                            noteNames = ["B", "C", "D", "E", "F", "G", "A", "B", "C"];
                            noteWithOctaves = ["B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
                        }
                    }
                }
            });
        });
        // تنظیم رنگ‌های نت‌ها براساس noteNames
        setNoteColorsFromNames();
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
