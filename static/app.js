/* ═══════════════════════════════════════════
   WhatsApp Auto Sender — Client-Side Logic
   ═══════════════════════════════════════════ */

(function () {
    "use strict";

    // ── DOM References ──
    const uploadZone    = document.getElementById("uploadZone");
    const fileInput     = document.getElementById("fileInput");
    const tableWrapper  = document.getElementById("tableWrapper");
    const tableBody     = document.getElementById("tableBody");
    const rowCount      = document.getElementById("rowCount");
    const btnStart      = document.getElementById("btnStart");
    const btnStop       = document.getElementById("btnStop");
    const btnClearLog   = document.getElementById("btnClearLog");
    const statusBadge   = document.getElementById("statusBadge");
    const statTotal     = document.getElementById("statTotal");
    const statCurrent   = document.getElementById("statCurrent");
    const statSuccess   = document.getElementById("statSuccess");
    const statFailed    = document.getElementById("statFailed");
    const progressPercent = document.getElementById("progressPercent");
    const progressDetail  = document.getElementById("progressDetail");
    const progressFill   = document.getElementById("progressFill");
    const progressGlow   = document.getElementById("progressGlow");
    const logContainer   = document.getElementById("logContainer");
    const bgParticles    = document.getElementById("bgParticles");

    // Licensing/Login Elements
    const licenseOverlay = document.getElementById("licenseOverlay");
    const usernameInput  = document.getElementById("username");
    const passwordInput  = document.getElementById("password");
    const btnLogin       = document.getElementById("btnLogin");
    const loginError     = document.getElementById("loginError");
    const subStatus      = document.getElementById("subStatus");
    const subSent        = document.getElementById("subSent");
    const hwidDisplay    = document.getElementById("hwidDisplay");

    let csvRows = [];
    let evtSource = null;

    // ═══════════════════════════════════════
    //  BACKGROUND PARTICLES
    // ═══════════════════════════════════════

    function createParticles() {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement("div");
            p.classList.add("particle");
            const size = Math.random() * 200 + 50;
            p.style.width = size + "px";
            p.style.height = size + "px";
            p.style.left = Math.random() * 100 + "%";
            p.style.animationDuration = (Math.random() * 20 + 15) + "s";
            p.style.animationDelay = (Math.random() * 10) + "s";
            bgParticles.appendChild(p);
        }
    }
    createParticles();

    // ═══════════════════════════════════════
    //  AUTHENTICATION
    // ═══════════════════════════════════════

    if (window.APP_SESSION) {
        updateSessionUI(window.APP_SESSION);
    }

    btnLogin.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) return;

        btnLogin.disabled = true;
        btnLogin.querySelector("span").classList.add("hidden");
        btnLogin.querySelector(".btn-loader").classList.remove("hidden");
        loginError.textContent = "";

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            updateSessionUI(data);

            if (data.status !== "success") {
                loginError.textContent = data.message || "Login failed";
            }
        } catch (e) {
            loginError.textContent = "Server connection failed";
        } finally {
            btnLogin.disabled = false;
            btnLogin.querySelector("span").classList.remove("hidden");
            btnLogin.querySelector(".btn-loader").classList.add("hidden");
        }
    });

    function updateSessionUI(session) {
        if (session.status === "active") {
            licenseOverlay.classList.add("hidden");
            subStatus.classList.remove("inactive");
            subStatus.classList.add("active");
            subStatus.querySelector(".sub-plan").textContent = 
                `${session.username} (${session.plan})`;
            subSent.textContent = session.sent_today;
            subStatus.querySelector(".sub-limit").innerHTML = 
                `<span id="subSent">${session.sent_today}</span> / ${session.daily_limit} Daily`;
            
            if (session.expires_at) {
                const date = new Date(session.expires_at);
                const subExpires = subStatus.querySelector("#subExpires");
                if (subExpires) subExpires.textContent = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
        } else {
            licenseOverlay.classList.remove("hidden");
            subStatus.classList.add("inactive");
            subStatus.classList.remove("active");
            loginError.textContent = session.message || "";
        }
    }


    // ═══════════════════════════════════════
    //  FILE UPLOAD
    // ═══════════════════════════════════════

    uploadZone.addEventListener("click", () => fileInput.click());

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    async function handleFile(file) {
        if (!file.name.endsWith(".csv")) {
            showError("Please upload a CSV file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            uploadZone.querySelector(".upload-label").textContent = "Uploading...";

            const res = await fetch("/upload", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "Upload failed");
                resetUploadLabel();
                return;
            }

            csvRows = data.rows;
            renderTable(csvRows);
            uploadZone.classList.add("has-file");
            uploadZone.querySelector(".upload-label").innerHTML =
                `✅ <strong>${file.name}</strong> — ${data.count} rows loaded`;
            uploadZone.querySelector(".upload-hint").textContent = "Click to upload a different file";
            rowCount.textContent = data.count + " rows";

            btnStart.disabled = false;

            // Update stats
            statTotal.textContent = data.count;
            statCurrent.textContent = "0";
            statSuccess.textContent = "0";
            statFailed.textContent = "0";
            updateProgress(0, data.count);

        } catch (e) {
            showError("Network error: " + e.message);
            resetUploadLabel();
        }
    }

    function resetUploadLabel() {
        uploadZone.querySelector(".upload-label").innerHTML =
            'Drop CSV file here or <span class="upload-browse">browse</span>';
    }

    function showError(msg) {
        // Brief flash in log
        addLogEntry({ time: new Date().toLocaleTimeString(), text: "❌ " + msg }, "log-error");
    }

    // ═══════════════════════════════════════
    //  DATA TABLE
    // ═══════════════════════════════════════

    function renderTable(rows) {
        tableBody.innerHTML = "";
        rows.forEach((row, i) => {
            const tr = document.createElement("tr");
            tr.id = "row-" + (i + 1);
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${escapeHtml(row.phone)}</td>
                <td title="${escapeHtml(row.message)}">${escapeHtml(row.message)}</td>
                <td><span class="row-status pending" id="row-status-${i+1}">●</span></td>
            `;
            tableBody.appendChild(tr);
        });
        tableWrapper.classList.add("visible");
    }

    function updateRowStatus(rowNum, status) {
        const el = document.getElementById("row-status-" + rowNum);
        if (!el) return;
        el.className = "row-status " + status;
        if (status === "success") el.textContent = "✓";
        else if (status === "failed") el.textContent = "✗";
        else if (status === "sending") el.textContent = "◉";
    }

    // ═══════════════════════════════════════
    //  CONTROLS
    // ═══════════════════════════════════════

    btnStart.addEventListener("click", async () => {
        try {
            btnStart.disabled = true;
            btnStop.disabled = false;
            const res = await fetch("/start", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                showError(data.error || "Failed to start");
                btnStart.disabled = false;
                btnStop.disabled = true;
                return;
            }
            connectSSE();
        } catch (e) {
            showError("Network error: " + e.message);
            btnStart.disabled = false;
        }
    });

    btnStop.addEventListener("click", async () => {
        try {
            btnStop.disabled = true;
            await fetch("/stop", { method: "POST" });
        } catch (e) {
            showError("Network error: " + e.message);
        }
    });

    btnClearLog.addEventListener("click", () => {
        logContainer.innerHTML = '<div class="log-empty">Log cleared.</div>';
    });

    // ═══════════════════════════════════════
    //  SERVER-SENT EVENTS
    // ═══════════════════════════════════════

    function connectSSE() {
        if (evtSource) evtSource.close();

        evtSource = new EventSource("/status");
        logContainer.innerHTML = "";

        evtSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleSSEEvent(data);
            } catch (e) {
                console.error("SSE parse error:", e);
            }
        };

        evtSource.onerror = () => {
            // Will auto-reconnect
            console.warn("SSE connection lost, reconnecting...");
        };
    }

    function handleSSEEvent(data) {
        if (data.type === "init" || data.type === "progress") {
            updateDashboard(data.progress);
        }

        if (data.type === "log") {
            const entry = data.entry;
            let cls = "";
            if (entry.ok === true) cls = "log-success";
            else if (entry.ok === false) cls = "log-error";
            else if (entry.text.includes("⚠️") || entry.text.includes("WARN")) cls = "log-warn";
            else if (entry.text.includes("🚀") || entry.text.includes("📱") || entry.text.includes("ℹ️")) cls = "log-info";

            addLogEntry(entry, cls);

            // Dynamically hide the login overlay if WhatsApp is ready
            if (entry.text.includes("WhatsApp Web is ready!")) {
                const overlay = document.getElementById("licenseOverlay");
                if (overlay && overlay.classList.contains("visible")) {
                    overlay.classList.remove("visible");
                    overlay.classList.add("hidden");
                }
            }

            // Update row status
            if (entry.row && entry.ok === true) {
                updateRowStatus(entry.row, "success");
            } else if (entry.row && entry.ok === false) {
                updateRowStatus(entry.row, "failed");
            } else if (entry.row && entry.text.includes("📤")) {
                updateRowStatus(entry.row, "sending");
            }

            // Update dashboard from progress
            if (data.progress) updateDashboard(data.progress);
        }
    }

    function updateDashboard(p) {
        statTotal.textContent = p.total;
        statCurrent.textContent = p.current;
        statSuccess.textContent = p.success;
        statFailed.textContent = p.failed;

        updateProgress(p.current, p.total);
        updateStatusBadge(p.status);

        // Update licensing quota in status bar
        if (p.sent_today !== undefined) {
             subSent.textContent = p.sent_today;
        }

        // Re-enable start when done/stopped/error
        if (["done", "stopped", "error", "idle"].includes(p.status)) {
            btnStart.disabled = csvRows.length === 0;
            btnStop.disabled = true;
            if (evtSource) {
                evtSource.close();
                evtSource = null;
            }
        }
    }

    function updateProgress(current, total) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        progressPercent.textContent = pct + "%";
        progressDetail.textContent = current + " / " + total;
        progressFill.style.width = pct + "%";
        progressGlow.style.width = pct + "%";
    }

    function updateStatusBadge(status) {
        statusBadge.className = "status-badge";
        const textEl = statusBadge.querySelector(".status-text");

        const labels = {
            idle: "Idle",
            launching: "Launching Browser...",
            qr_wait: "Scan QR Code",
            sending: "Sending...",
            paused: "Rate Limit Pause",
            done: "Completed",
            stopped: "Stopped",
            error: "Error",
        };

        textEl.textContent = labels[status] || status;

        if (["sending", "launching", "qr_wait", "paused"].includes(status)) {
            statusBadge.classList.add("active");
        } else if (status === "done") {
            statusBadge.classList.add("done");
        } else if (status === "error") {
            statusBadge.classList.add("error");
        }
    }

    // ═══════════════════════════════════════
    //  LOG
    // ═══════════════════════════════════════

    function addLogEntry(entry, cls) {
        // Remove empty message
        const emptyEl = logContainer.querySelector(".log-empty");
        if (emptyEl) emptyEl.remove();

        const div = document.createElement("div");
        div.className = "log-entry " + (cls || "");
        div.innerHTML = `<span class="log-time">[${entry.time}]</span>${escapeHtml(entry.text)}`;
        logContainer.appendChild(div);

        // Auto-scroll
        logContainer.scrollTop = logContainer.scrollHeight;

        // Cap entries
        while (logContainer.children.length > 200) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    // ═══════════════════════════════════════
    //  UTILS
    // ═══════════════════════════════════════

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str || "";
        return div.innerHTML;
    }

})();
