// =================================================================
// JavaScript with MINIMAL changes to fix ONLY the voice note saving
// =================================================================

// Handle sidebar navigation
const navItems = document.querySelectorAll(".sidebar nav ul li");
const content = document.getElementById("content");
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('overlay');

// Toggle sidebar
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('show');
});

// Close when clicking overlay
overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('show');
});

// Close when navigation item is clicked
navItems.forEach(item => {
    item.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('show');
    });
});

navItems.forEach(item => {
    item.addEventListener("click", () => {
        // remove active from all
        navItems.forEach(i => i.classList.remove("active"));
        // add active to current
        item.classList.add("active");

        // load content
        const page = item.getAttribute("data-page");
        
        // --- FIX: Added backticks (`) around your HTML strings to fix syntax errors ---
        if (page === "dashboard") {
            content.innerHTML = `
                <div class="dashboard-grid">
                  <div class="dashboard-col-left">
                    <div id="calendar-container">
                      </div>
                    <div id="recent-entries-container">
                      <h2>Recent Entries</h2>
                      <div class="recent-entry">
                        <p class="entry-title">A day of small wins</p>
                        <p class="entry-date">September 17, 2025</p>
                      </div>
                      <div class="recent-entry">
                        <p class="entry-title">Thinking about the future</p>
                        <p class="entry-date">September 15, 2025</p>
                      </div>
                      <div class="recent-entry">
                        <p class="entry-title">A challenging morning</p>
                        <p class="entry-date">September 14, 2025</p>
                      </div>
                    </div>
                  </div>
                  <div class="dashboard-col-right" id="dashboard-widgets">
                    <h2>Mood Tracker</h2>
                    <div class="widget-content">
                        <p>No mood data available.</p>
                    </div>
                  </div>
                </div>
              `;
            loadCalendar(document.getElementById('calendar-container'));
        } else if (page === "journal") {
            const selectedDateStr = localStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0];
            const selectedDate = new Date(selectedDateStr);
            // Fix timezone offset
            selectedDate.setDate(selectedDate.getDate() + 1);
            const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
            const formattedDate = selectedDate.toLocaleDateString("en-US", options);

            content.innerHTML = `
                <div class="journal-header">
                  <div class="date-box">${formattedDate}</div>
                  <h1>📖 Journal</h1>
                </div>
                <div class="journal-container">
                  <textarea id="journalEntry" placeholder="Dear Journal..."></textarea>
                  <button id="saveJournal">💾 Save Entry</button>
                  <p id="saveMsg" class="hidden">✅ Your journal entry has been saved!</p>
                </div>
              `;

            const entryKey = `journalEntry_${selectedDateStr}`;
            const savedEntry = localStorage.getItem(entryKey);
            if (savedEntry) {
                document.getElementById("journalEntry").value = savedEntry;
            }

            document.getElementById("saveJournal").addEventListener("click", () => {
                const entry = document.getElementById("journalEntry").value;
                localStorage.setItem(entryKey, entry);

                const msg = document.getElementById("saveMsg");
                msg.classList.remove("hidden");
                setTimeout(() => msg.classList.add("hidden"), 2000);
            });
        } else if (page === "voice") {
            content.innerHTML = `
                <h1>🎙 Voice Notes</h1>
                <p class="voice-msg">🎤 Feel like sharing your thoughts?</p>
                <canvas id="waveform"></canvas>
                <div class="voice-controls">
                  <button id="recordBtn" title="Record">⏺</button>
                  <button id="pauseBtn" title="Pause" disabled>⏸</button>
                  <button id="stopBtn" title="Stop" disabled>⏹</button>
                  <button id="saveBtn" title="Save" disabled>💾</button>
                  <button id="deleteBtn" title="Delete" disabled>🗑</button>
                </div>
                <p id="voiceStatus"></p>
              `;
            const canvas = document.getElementById("waveform");
            const ctx = canvas.getContext("2d");
            canvas.width = content.clientWidth - 60;
            canvas.height = 150;

            let audioContext, analyser, source, dataArray, animationId;
            let mediaRecorder, audioChunks = [],
                isRecording = false;

            function drawWave() {
                animationId = requestAnimationFrame(drawWave);
                analyser.getByteTimeDomainData(dataArray);
                ctx.fillStyle = "#f9f9fc";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#667eea";
                ctx.beginPath();
                let sliceWidth = canvas.width / dataArray.length;
                let x = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    let v = dataArray[i] / 128.0;
                    let y = v * canvas.height / 2;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }

            function resetVoiceRecorder() {
                isRecording = false;
                audioChunks = [];
                cancelAnimationFrame(animationId);
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                if (audioContext) {
                    audioContext.close();
                }
                document.getElementById("recordBtn").disabled = false;
                document.getElementById("pauseBtn").disabled = true;
                document.getElementById("stopBtn").disabled = true;
                document.getElementById("saveBtn").disabled = true;
                document.getElementById("deleteBtn").disabled = true;
                document.getElementById("voiceStatus").textContent = "";
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            document.getElementById("recordBtn").addEventListener("click", async () => {
                if (isRecording) return;
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    audioContext = new(window.AudioContext || window.webkitAudioContext)();
                    analyser = audioContext.createAnalyser();
                    source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);
                    analyser.fftSize = 2048;
                    dataArray = new Uint8Array(analyser.fftSize);
                    drawWave();
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    mediaRecorder.start();
                    isRecording = true;
                    document.getElementById("voiceStatus").textContent = "🔴 Recording...";
                    document.getElementById("recordBtn").disabled = true;
                    document.getElementById("pauseBtn").disabled = false;
                    document.getElementById("stopBtn").disabled = false;
                    // Note: Save is enabled on Stop, not on Record
                    document.getElementById("deleteBtn").disabled = false;
                } catch (err) {
                    alert("Microphone access denied!");
                }
            });

            document.getElementById("pauseBtn").addEventListener("click", () => {
                if (!isRecording) return;
                const pauseBtn = document.getElementById("pauseBtn");
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.pause();
                    cancelAnimationFrame(animationId);
                    document.getElementById("voiceStatus").textContent = "⏸ Paused";
                    pauseBtn.innerHTML = "▶";
                    pauseBtn.title = "Resume";
                } else if (mediaRecorder.state === "paused") {
                    mediaRecorder.resume();
                    drawWave();
                    document.getElementById("voiceStatus").textContent = "🔴 Recording...";
                    pauseBtn.innerHTML = "⏸";
                    pauseBtn.title = "Pause";
                }
            });

            document.getElementById("stopBtn").addEventListener("click", () => {
                if (!isRecording) return;
                mediaRecorder.stop();
                isRecording = false;
                cancelAnimationFrame(animationId);
                document.getElementById("voiceStatus").textContent = "⏹ Stopped. Ready to save.";
                document.getElementById("saveBtn").disabled = false; // Enable save after stopping
            });
            
            document.getElementById("deleteBtn").addEventListener("click", () => {
                resetVoiceRecorder();
                document.getElementById("voiceStatus").textContent = "🗑 Deleted.";
            });

            // --- START OF THE ONLY FUNCTIONAL CHANGE ---
            // The 'Save' button now UPLOADS the file to your Flask server
            document.getElementById("saveBtn").addEventListener("click", () => {
                if (audioChunks.length === 0) {
                    document.getElementById("voiceStatus").textContent = "⚠️ Nothing to save.";
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                const formData = new FormData();
                formData.append("user_id", localStorage.getItem("userId"));
                // --- FIX: Added quotes and backticks to fix syntax error ---
                formData.append("title", `Voice Note - ${new Date().toLocaleString()}`);
                formData.append("mood", "Voice");
                formData.append("audio", audioBlob, "voicenote.webm");

                document.getElementById("voiceStatus").textContent = "Uploading...";

                fetch("/entries/voice", {
                    method: "POST",
                    body: formData
                })
                .then(res => {
                    if (!res.ok) {
                        return res.json().then(err => { throw new Error(err.message) });
                    }
                    return res.json();
                })
                .then(data => {
                    console.log("✅ Voice note saved:", data);
                    document.getElementById("voiceStatus").textContent = "✅ Voice note uploaded successfully!";
                    resetVoiceRecorder();
                })
                .catch(err => {
                    console.error("❌ Upload failed:", err);
                    document.getElementById("voiceStatus").textContent = `❌ Upload failed!`;
                });
            });
            // --- END OF THE ONLY FUNCTIONAL CHANGE ---
            
        } else if (page === "mood") {
            content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
        } else if (page === "logout") {
            // --- FIX: Clear user session and redirect properly ---
            localStorage.removeItem('userId');
            window.location.href = "/login";
        }
    });
});

document.getElementById("searchBar").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    // --- FIX: Added backticks (`) to fix syntax error ---
    content.innerHTML = `<h1>🔍 Searching...</h1><p>You searched for: <b>${query}</b></p>`;
});

function loadCalendar(container) {
    if (!container) return;
    // --- FIX: Added backticks (`) to fix syntax error ---
    container.innerHTML = `
        <div class="calendar-wrapper">
          <div class="calendar-header">
            <button id="prev">&#10094;</button>
            <h2 id="monthYear"></h2>
            <button id="next">&#10095;</button>
          </div>
          <div class="calendar-grid" id="calendarGrid">
            <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div><div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div><div class="day-name">Sat</div>
          </div>
        </div>`;
    const monthYear = document.getElementById("monthYear");
    const grid = document.getElementById("calendarGrid");
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    let currentDate = new Date();

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYear.textContent = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        grid.innerHTML = '<div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div><div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div><div class="day-name">Sat</div>';
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(document.createElement("div"));
        }
        for (let d = 1; d <= lastDate; d++) {
            const dateEl = document.createElement("div");
            dateEl.classList.add("date");
            dateEl.textContent = d;
            const date = new Date(year, month, d);
            dateEl.dataset.date = date.toISOString().split('T')[0];
            let today = new Date();
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dateEl.classList.add("today");
            }
            dateEl.addEventListener('click', (e) => {
                localStorage.setItem('selectedDate', e.target.dataset.date);
                document.querySelector('[data-page="journal"]').click();
            });
            grid.appendChild(dateEl);
        }
    }
    prev.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    next.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    renderCalendar();
}

// --- FIX: REMOVED THE DISCONNECTED/DUPLICATE CODE THAT WAS HERE ---