const API_URL = "http://localhost:3000";

let trackCatalogState = [];
let currentTrackIndex = -1;
let activeUserToken = null;

const audio = document.getElementById("nativeAudioElement");
const btnPlayPause = document.getElementById("btnPlayPause");

document.addEventListener("DOMContentLoaded", () => {
    setupViewSwappingAuth();
    handleAuthenticationFlows();
    setupDashboardFilters();
    setupAudioPlayerEngine();
    setupAppViewNavigation();
    setupPlaylistGeneration();
    
    activeUserToken = localStorage.getItem("activeSessionUser");
    if (activeUserToken) {
        bootApplicationWorkspace(activeUserToken);
    }
});


function setupAppViewNavigation() {
    const navHome = document.getElementById("navHome");
    const navPlaylists = document.getElementById("navPlaylists");
    const navFavorites = document.getElementById("navFavorites");

    const viewHome = document.getElementById("discoverView");
    const viewPlaylists = document.getElementById("playlistView");
    const viewFavorites = document.getElementById("favoritesView");

    const resetTabs = () => {
        navHome.className = navPlaylists.className = navFavorites.className = "";
        viewHome.style.display = viewPlaylists.style.display = viewFavorites.style.display = "none";
    };

    navHome.addEventListener("click", (e) => {
        e.preventDefault(); resetTabs();
        navHome.className = "active"; viewHome.style.display = "block";
        loadMusicCatalog();
    });

    navPlaylists.addEventListener("click", (e) => {
        e.preventDefault(); resetTabs();
        navPlaylists.className = "active"; viewPlaylists.style.display = "block";
        loadUserPlaylists();
    });

    navFavorites.addEventListener("click", (e) => {
        e.preventDefault(); resetTabs();
        navFavorites.className = "active"; viewFavorites.style.display = "block";
        loadUserFavorites();
    });

    document.getElementById("logoutButton").addEventListener("click", () => {
        audio.pause();
        audio.src = "";
        localStorage.removeItem("activeSessionUser");
        document.getElementById("appWrapper").style.display = "none";
        document.getElementById("authWrapper").style.display = "flex";
    });
}

// 2. Authentication Logic Panel
function setupViewSwappingAuth() {
    document.getElementById("toSignupLink").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("signupBox").style.display = "block";
    });
    document.getElementById("toLoginLink").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("signupBox").style.display = "none";
        document.getElementById("loginBox").style.display = "block";
    });
}

function handleAuthenticationFlows() {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const pass = document.getElementById("loginPassword").value;
        const err = document.getElementById("loginError");

        try {
            const res = await fetch(`${API_URL}/users?email=${email}&password=${pass}`);
            const data = await res.json();
            if (data.length > 0) {
                err.style.display = "none";
                localStorage.setItem("activeSessionUser", data[0].username);
                bootApplicationWorkspace(data[0].username);
            } else {
                err.style.display = "block";
            }
        } catch { err.style.display = "block"; }
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("signupUsername").value;
        const email = document.getElementById("signupEmail").value;
        const pass = document.getElementById("signupPassword").value;
        const err = document.getElementById("signupError");

        try {
            const checkRes = await fetch(`${API_URL}/users?email=${email}`);
            const checkData = await checkRes.json();
            if (checkData.length > 0) {
                alert("Email already in use!");
                return;
            }

            const regRes = await fetch(`${API_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, email, password: pass, liked: [], playlists: [] })
            });

            if (regRes.ok) {
                alert("Account created successfully! Please Log In.");
                document.getElementById("toLoginLink").click();
            }
        } catch { err.style.display = "block"; }
    });
}

function bootApplicationWorkspace(username) {
    document.getElementById("authWrapper").style.display = "none";
    document.getElementById("appWrapper").style.display = "block";
    document.getElementById("usernameGreeting").textContent = username;
    loadMusicCatalog();
}


async function loadMusicCatalog() {
    const loading = document.getElementById("loadingStatus");
    try {
        loading.style.display = "block";
        const res = await fetch(`${API_URL}/songs`);
        trackCatalogState = await res.json();
        renderMusicGrid(trackCatalogState);
    } catch {
        document.getElementById("musicContainer").innerHTML = "<p>Error connecting to catalog repository.</p>";
    } finally {
        loading.style.display = "none";
    }
}


async function renderMusicGrid(songs) {
    const container = document.getElementById("musicContainer");
    container.innerHTML = "";

    if (songs.length === 0) {
        container.innerHTML = "<p style='color:#b3b3b3;'>No matching songs found.</p>";
        return;
    }

    
    const currentUser = localStorage.getItem("activeSessionUser");
    let likedSongs = [];
    let userPlaylists = [];
    try {
        const uRes = await fetch(`${API_URL}/users?username=${currentUser}`);
        const uData = await uRes.json();
        if (uData.length > 0) {
            likedSongs = uData[0].liked || [];
        }
        const pRes = await fetch(`${API_URL}/playlists?owner=${currentUser}`);
        userPlaylists = await pRes.json();
    } catch (e) { console.error(e); }

    songs.forEach(song => {
        const isLiked = likedSongs.includes(song.id);
        const card = document.createElement("div");
        card.className = "song-card";
        
        let playlistOptions = `<option value="" disabled selected>+ Add to Playlist</option>`;
        userPlaylists.forEach(pl => {
            playlistOptions += `<option value="${pl.id}">${escapeHTML(pl.name)}</option>`;
        });

        card.innerHTML = `
            <img src="${song.image}" alt="${song.title}" onclick="playTrackById('${song.id}')" style="cursor:pointer;">
            <h3>${escapeHTML(song.title)}</h3>
            <p>${escapeHTML(song.artist)}</p>
            <div class="card-controls-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width:100%;">
                <button onclick="toggleFavoriteTrack('${song.id}')" style="background:none; border:none; font-size:20px; cursor:pointer; color:red;">
                    ${isLiked ? '❤️' : '🤍'}
                </button>
                <select onchange="addTrackToSpecificPlaylist(this, '${song.id}')" style="background:#282828; color:white; border:1px solid #404040; padding:4px; border-radius:4px; font-size:12px; max-width:120px;">
                    ${playlistOptions}
                </select>
            </div>
        `;
        container.appendChild(card);
    });
}


async function toggleFavoriteTrack(songId) {
    const currentUser = localStorage.getItem("activeSessionUser");
    try {
        const uRes = await fetch(`${API_URL}/users?username=${currentUser}`);
        const uData = await uRes.json();
        if (uData.length === 0) return;

        const userObj = uData[0];
        let likedList = userObj.liked || [];

        if (likedList.includes(songId)) {
            likedList = likedList.filter(id => id !== songId);
        } else {
            likedList.push(songId);
        }

        await fetch(`${API_URL}/users/${userObj.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liked: likedList })
        });

       
        if (document.getElementById("navHome").className === "active") {
            renderMusicGrid(trackCatalogState);
        } else if (document.getElementById("navFavorites").className === "active") {
            loadUserFavorites();
        }
    } catch (e) { alert("Failed to alter song favorite status."); }
}

async function addTrackToSpecificPlaylist(selectElement, songId) {
    const playlistId = selectElement.value;
    if (!playlistId) return;

    try {
        const pRes = await fetch(`${API_URL}/playlists/${playlistId}`);
        const playlist = await pRes.json();
        let trackIds = playlist.songs || [];

        if (trackIds.includes(songId)) {
            alert("This song is already inside this playlist!");
            selectElement.value = "";
            return;
        }

        trackIds.push(songId);
        await fetch(`${API_URL}/playlists/${playlistId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs: trackIds })
        });

        alert("Song successfully appended to playlist!");
    } catch (e) { alert("Failed to add song to selected playlist."); }
    selectElement.value = "";
}

async function loadUserFavorites() {
    const currentUser = localStorage.getItem("activeSessionUser");
    try {
        const uRes = await fetch(`${API_URL}/users?username=${currentUser}`);
        const uData = await uRes.json();
        const countText = document.getElementById("favouriteCount");
        const container = document.getElementById("favoritesContainer");
        container.innerHTML = "";

        if (uData.length === 0 || !uData[0].liked || uData[0].liked.length === 0) {
            countText.textContent = "0 songs";
            renderFavoritesPlaceholder();
            return;
        }

        const likedIds = uData[0].liked;
        countText.textContent = `${likedIds.length} song${likedIds.length > 1 ? 's' : ''}`;

        const sRes = await fetch(`${API_URL}/songs`);
        const allSongs = await sRes.json();
        const favoriteSongs = allSongs.filter(s => likedIds.includes(s.id));

        favoriteSongs.forEach(song => {
            const card = document.createElement("div");
            card.className = "song-card";
            card.innerHTML = `
                <img src="${song.image}" alt="${song.title}" onclick="playTrackById('${song.id}')" style="cursor:pointer;">
                <h3>${escapeHTML(song.title)}</h3>
                <p>${escapeHTML(song.artist)}</p>
                <div style="margin-top:10px;">
                    <button onclick="toggleFavoriteTrack('${song.id}')" style="background:none; border:none; font-size:20px; cursor:pointer; color:red;">❤️</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch {
        renderFavoritesPlaceholder();
    }
}

function setupPlaylistGeneration() {
    const pForm = document.getElementById("createPlaylistForm");
    pForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("newPlaylistName").value;
        const currentUser = localStorage.getItem("activeSessionUser");

        try {
            await fetch(`${API_URL}/playlists`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, owner: currentUser, songs: [] })
            });
            pForm.reset();
            loadUserPlaylists();
        } catch { alert("Could not create playlist record files."); }
    });
}

async function loadUserPlaylists() {
    const currentUser = localStorage.getItem("activeSessionUser");
    const container = document.getElementById("playlistContainer");
    container.innerHTML = "";

    try {
        const res = await fetch(`${API_URL}/playlists?owner=${currentUser}`);
        const playlists = await res.json();

        if (playlists.length === 0) {
            container.innerHTML = `
                <div class="emptyPlaylist">
                    <div class="icon">📂</div>
                    <h3>No playlists created yet</h3>
                    <p style="color:#b3b3b3;">Use the generator block above to start compiling folders.</p>
                </div>`;
            return;
        }

        playlists.forEach(pl => {
            const div = document.createElement("div");
            div.className = "song-card"; 
            div.style.position = "relative";
            div.innerHTML = `
                <div onclick="viewPlaylistTracks('${pl.id}', '${escapeHTML(pl.name)}')" style="cursor:pointer; padding:20px 0; text-align:center; font-size:50px;">📁</div>
                <h3>${escapeHTML(pl.name)}</h3>
                <p style="color:#b3b3b3; font-size:12px; margin-bottom:10px;">Tracks: ${pl.songs ? pl.songs.length : 0}</p>
                <button onclick="deleteTargetPlaylist('${pl.id}')" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:6px 10px; font-size:12px; cursor:pointer; width:100%;">Delete Playlist</button>
            `;
            container.appendChild(div);
        });
    } catch {
        container.innerHTML = "<p>Error mapping playlist database routes.</p>";
    }
}


window.deleteTargetPlaylist = async function(playlistId) {
    if (!confirm("Are you certain you want to remove this playlist?")) return;
    try {
        const res = await fetch(`${API_URL}/playlists/${playlistId}`, { method: "DELETE" });
        if (res.ok) {
            alert("Playlist dropped successfully!");
            loadUserPlaylists();
        }
    } catch { alert("Failed to complete server delete request."); }
};


window.viewPlaylistTracks = async function(playlistId, playlistName) {
    const container = document.getElementById("playlistContainer");
    container.innerHTML = `<h2 style="grid-column:1/-1; margin-bottom:15px; color:#1DB954;">Playlist: ${playlistName}</h2>
                           <button onclick="loadUserPlaylists()" style="grid-column:1/-1; background:#555; color:white; max-width:150px; padding:8px; margin-bottom:20px; border:none; border-radius:4px; cursor:pointer;">← Back to Playlists</button>`;

    try {
        const pRes = await fetch(`${API_URL}/playlists/${playlistId}`);
        const playlist = await pRes.json();
        const trackIds = playlist.songs || [];

        if (trackIds.length === 0) {
            container.innerHTML += "<p style='grid-column:1/-1; color:#b3b3b3;'>This playlist holds zero tracks currently.</p>";
            return;
        }

        const sRes = await fetch(`${API_URL}/songs`);
        const allSongs = await sRes.json();
        const matchedSongs = allSongs.filter(s => trackIds.includes(s.id));

        matchedSongs.forEach(song => {
            const card = document.createElement("div");
            card.className = "song-card";
            card.innerHTML = `
                <img src="${song.image}" alt="${song.title}" onclick="playTrackById('${song.id}')" style="cursor:pointer;">
                <h3>${escapeHTML(song.title)}</h3>
                <p>${escapeHTML(song.artist)}</p>
                <button onclick="removeSongFromPlaylist('${playlistId}', '${song.id}', '${playlistName}')" style="background:#cc8e35; border:none; border-radius:4px; color:white; padding:5px; margin-top:10px; width:100%; cursor:pointer; font-size:11px;">Remove From Playlist</button>
            `;
            container.appendChild(card);
        });
    } catch { alert("Error mapping track elements."); }
};

window.removeSongFromPlaylist = async function(playlistId, songId, playlistName) {
    try {
        const res = await fetch(`${API_URL}/playlists/${playlistId}`);
        const playlist = await res.json();
        const updatedSongs = playlist.songs.filter(id => id !== songId);

        await fetch(`${API_URL}/playlists/${playlistId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs: updatedSongs })
        });
        viewPlaylistTracks(playlistId, playlistName);
    } catch { alert("Failed to drop track item from container."); }
};


function setupAudioPlayerEngine() {
    btnPlayPause.addEventListener("click", toggleAudioPlaybackEngineState);
    document.getElementById("btnPrev").addEventListener("click", playPreviousCatalogTrack);
    document.getElementById("btnNext").addEventListener("click", playNextCatalogTrack);

    const progress = document.getElementById("progressSlider");
    audio.addEventListener("timeupdate", () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        progress.value = pct;
        document.getElementById("currentTime").textContent = formatTimeString(audio.currentTime);
    });

    progress.addEventListener("input", () => {
        if (!audio.duration) return;
        audio.currentTime = (progress.value / 100) * audio.duration;
    });

    audio.addEventListener("loadedmetadata", () => {
        document.getElementById("totalDuration").textContent = formatTimeString(audio.duration);
    });

    audio.addEventListener("ended", playNextCatalogTrack);
}

window.playTrackById = function(id) {
    const idx = trackCatalogState.findIndex(t => t.id === id);
    if (idx !== -1) {
        currentTrackIndex = idx;
        executeTrackPlaybackLifecycle(trackCatalogState[currentTrackIndex]);
    }
};

function executeTrackPlaybackLifecycle(song) {
    audio.src = song.audio;
    audio.play();
    btnPlayPause.textContent = "⏸";

    document.getElementById("playerTrackTitle").textContent = song.title;
    document.getElementById("playerTrackArtist").textContent = song.artist;
    
    const art = document.getElementById("playerAlbumArt");
    art.src = song.image;
    art.style.display = "block";
}

function toggleAudioPlaybackEngineState() {
    if (currentTrackIndex === -1 && trackCatalogState.length > 0) {
        currentTrackIndex = 0;
        executeTrackPlaybackLifecycle(trackCatalogState[0]);
        return;
    }
    if (audio.paused) {
        audio.play(); btnPlayPause.textContent = "⏸";
    } else {
        audio.pause(); btnPlayPause.textContent = "▶";
    }
}

function playPreviousCatalogTrack() {
    if (trackCatalogState.length === 0) return;
    currentTrackIndex = (currentTrackIndex <= 0) ? trackCatalogState.length - 1 : currentTrackIndex - 1;
    executeTrackPlaybackLifecycle(trackCatalogState[currentTrackIndex]);
}

function playNextCatalogTrack() {
    if (trackCatalogState.length === 0) return;
    currentTrackIndex = (currentTrackIndex >= trackCatalogState.length - 1) ? 0 : currentTrackIndex + 1;
    executeTrackPlaybackLifecycle(trackCatalogState[currentTrackIndex]);
}


function setupDashboardFilters() {
    const bar = document.getElementById("searchBar");
    const drop = document.getElementById("genreDropdown");

    const runFilters = () => {
        const query = bar.value.toLowerCase();
        const selectedGenre = drop.value;

        const filtered = trackCatalogState.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query) || t.album.toLowerCase().includes(query);
            const matchesGenre = (selectedGenre === "ALL") || (t.genre === selectedGenre);
            return matchesSearch && matchesGenre;
        });
        renderMusicGrid(filtered);
    };
    bar.addEventListener("input", runFilters);
    drop.addEventListener("change", runFilters);
}

function renderFavoritesPlaceholder() {
    const container = document.getElementById("favoritesContainer");
    container.innerHTML = `
        <div class="empty-state">
            <div class="icon" style="font-size:40px; text-align:center;">💔</div>
            <h3 style="text-align:center; margin-top:10px;">No liked songs yet</h3>
            <p style="text-align:center; color:#b3b3b3;">Songs you favorite will appear in this designated section</p>
        </div>`;
}

function formatTimeString(secs) {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'\"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}