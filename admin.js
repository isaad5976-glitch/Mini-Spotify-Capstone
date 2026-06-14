const API_URL = "http://localhost:3000/songs";

document.addEventListener("DOMContentLoaded", () => {
    loadAdminDatabaseView();
    setupAdminFormEngine();
    document.getElementById("btnAdminCancel").addEventListener("click", resetFormContext);
});

// READ Route: Download master tracks and compute real-time summary statistics
async function loadAdminDatabaseView() {
    const loader = document.getElementById("adminLoading");
    const target = document.getElementById("adminTracksTarget");
    try {
        loader.style.display = "block";
        const res = await fetch(API_URL);
        const songs = await res.json();
        
        computeSummaryStatistics(songs);
        target.innerHTML = "";

        if(songs.length === 0) {
            target.innerHTML = "<p style='color:#b3b3b3;'>System database holds zero logs.</p>\";";
            return;
        }

        songs.forEach(song => {
            const row = document.createElement("div");
            row.className = "admin-track-row";
            row.innerHTML = `
                <div>
                    <h4 style="color:#fff;">${song.title}</h4>
                    <p style="color:#b3b3b3; font-size:12px;">${song.artist} | ${song.album} (${song.duration})</p>
                    <p style="color:#e67e22; font-size:11px; margin-top:2px;">📂 Art: ${song.image} | Audio: ${song.audio}</p>
                </div>
                <div class="admin-actions">
                    <button class="btn-edit" onclick="editTrack('${song.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteTrack('${song.id}')">Delete</button>
                </div>
            `;
            target.appendChild(row);
        });
    } catch(err) {
        target.innerHTML = "<p style='color:#e74c3c;'>Error linking track files from database.</p>";
    } finally {
        loader.style.display = "none";
    }
}

// Compute Statistics Overview
function computeSummaryStatistics(songs) {
    document.getElementById("statTotalSongs").textContent = songs.length;

    const uniqueGenres = [...new Set(songs.map(s => s.genre))];
    document.getElementById("statGenres").textContent = uniqueGenres.length;

    let totalSeconds = 0;
    songs.forEach(s => {
        const parts = s.duration.split(":");
        if(parts.length === 2) {
            totalSeconds += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
    });
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    document.getElementById("statTotalDuration").textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// CREATE & UPDATE Route Submission Handler
function setupAdminFormEngine() {
    const form = document.getElementById("adminTrackForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("adminTrackId").value;
        const songData = {
            title: document.getElementById("trackTitle").value,
            artist: document.getElementById("trackArtist").value,
            album: document.getElementById("trackAlbum").value,
            genre: document.getElementById("trackGenre").value,
            duration: document.getElementById("trackDuration").value,
            image: document.getElementById("trackImage").value,
            audio: document.getElementById("trackAudio").value
        };

        try {
            if (id) {
                // UPDATE / PUT Operation
                const res = await fetch(`${API_URL}/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(songData)
                });
                if(res.ok) alert("Track data item altered perfectly!");
            } else {
                // CREATE / POST Operation
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(songData)
                });
                if(res.ok) alert("New track profile uploaded seamlessly!");
            }
            resetFormContext();
            loadAdminDatabaseView();
        } catch(err) {
            alert("Could not commit transaction requests to server maps.");
        }
    });
}

// UPDATE Preparation Flow helper logic
window.editTrack = async function(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const song = await res.json();

        document.getElementById("adminTrackId").value = song.id;
        document.getElementById("trackTitle").value = song.title;
        document.getElementById("trackArtist").value = song.artist;
        document.getElementById("trackAlbum").value = song.album;
        document.getElementById("trackGenre").value = song.genre;
        document.getElementById("trackDuration").value = song.duration;
        document.getElementById("trackImage").value = song.image;
        document.getElementById("trackAudio").value = song.audio;

        document.getElementById("adminFormTitle").textContent = "Modify Track Properties";
        document.getElementById("btnAdminSubmit").textContent = "Save Properties";
        document.getElementById("btnAdminCancel").style.display = "inline-block";
    } catch(err) { 
        alert("Could not fetch target record properties."); 
    }
};

// DELETE Route Implementation
window.deleteTrack = async function(id) {
    if(!confirm("Are you completely sure you want to drop this track?")) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if(res.ok) {
            alert("Track profile dropped successfully!");
            loadAdminDatabaseView();
        }
    } catch(err) { 
        alert("Could not send drop command execution lines."); 
    }
};

function resetFormContext() {
    document.getElementById("adminTrackForm").reset();
    document.getElementById("adminTrackId").value = "";
    document.getElementById("adminFormTitle").textContent = "Add New Music Track";
    document.getElementById("btnAdminSubmit").textContent = "Upload Track Profile";
    document.getElementById("btnAdminCancel").style.display = "none";
}