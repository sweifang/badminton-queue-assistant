document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let gameHistory = {}; // Stores the last player combination for each court

    // --- DATA INITIALIZATION ---
    const sessionDataString = sessionStorage.getItem('sessionData');
    if (!sessionDataString) {
        console.error('No session data found. Redirecting to setup page.');
        // window.location.href = 'new_session.html';
        return;
    }
    const { numCourts, participants } = JSON.parse(sessionDataString);

    // --- ELEMENT SELECTORS ---
    const courtsContainer = document.getElementById('courts-container');
    const nextUpContainer = document.getElementById('next-up-players');
    const benchPlayersContainer = document.getElementById('bench-players');
    const notArrivedPlayersContainer = document.getElementById('not-arrived-players');

    // --- INITIAL SETUP ---
    benchPlayersContainer.classList.add('dropzone');
    notArrivedPlayersContainer.classList.add('dropzone');

    for (let i = 1; i <= numCourts; i++) {
        const courtId = `court-${i}`;
        const courtBlock = createCourtBlock(`球場 ${i}`, courtId, true);
        courtsContainer.appendChild(courtBlock);
        gameHistory[courtId] = []; // Initialize history for each court
    }

    const nextUpCourt = createCourtBlock(null, 'next-up-court', false);
    nextUpContainer.appendChild(nextUpCourt);

    participants.forEach(player => {
        const playerBlock = createPlayerBlock(player);
        benchPlayersContainer.appendChild(playerBlock);
    });

    addDragAndDropListeners();
    addEndGameButtonListeners();
});

function createCourtBlock(title, id, showButton) {
    const courtBlock = document.createElement('div');
    courtBlock.className = 'court-block';
    courtBlock.id = id;
    const titleHtml = title ? `<div class="court-label">${title}</div>` : '';
    const buttonHtml = showButton ? '<button class="btn btn-primary next-game-btn">終場</button>' : '';
    courtBlock.innerHTML = `
        ${titleHtml}
        <div class="court-sides">
            <div class="court-side dropzone" data-side="A"></div>
            <div class="court-side dropzone" data-side="B"></div>
        </div>
        ${buttonHtml}
    `;
    return courtBlock;
}

function createPlayerBlock(player) {
    const playerBlock = document.createElement('div');
    playerBlock.className = `player-block ${player.skill.toLowerCase()}`;
    playerBlock.draggable = true;
    playerBlock.id = `player-${Date.now()}-${Math.random()}`;
    playerBlock.dataset.playerName = player.name;
    playerBlock.dataset.gamesPlayed = player.games_played || 0;
    playerBlock.innerHTML = `
        <span class="games-played">${player.games_played || 0}</span>
        <span class="player-name">${player.name}</span>
    `;
    // Add all drag-and-drop listeners to the player block itself for swapping
    playerBlock.addEventListener('dragstart', handleDragStart);
    playerBlock.addEventListener('dragend', handleDragEnd);
    playerBlock.addEventListener('dragover', handleDragOver);
    playerBlock.addEventListener('drop', handleDrop);
    playerBlock.addEventListener('dragenter', handleDragEnter);
    playerBlock.addEventListener('dragleave', handleDragLeave);
    return playerBlock;
}

function addDragAndDropListeners() {
    const dropzones = document.querySelectorAll('.dropzone, .player-block');
    dropzones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

function addEndGameButtonListeners() {
    const endButtons = document.querySelectorAll('.next-game-btn');
    endButtons.forEach(button => {
        button.addEventListener('click', handleEndGame);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain');
    const draggableElement = document.getElementById(id);
    const dropTarget = e.currentTarget;

    if (!draggableElement || draggableElement === dropTarget) {
        dropTarget.classList.remove('drag-over');
        return;
    }

    dropTarget.classList.remove('drag-over');

    // Clear resting state on any manual move
    if (draggableElement.classList.contains('resting')) {
        draggableElement.classList.remove('resting');
    }
    if (dropTarget.classList.contains('player-block') && dropTarget.classList.contains('resting')) {
        dropTarget.classList.remove('resting');
    }

    // Case 1: Dropping on another player -> SWAP
    if (dropTarget.classList.contains('player-block')) {
        const sourceContainer = draggableElement.parentNode;
        const targetContainer = dropTarget.parentNode;
        targetContainer.appendChild(draggableElement);
        sourceContainer.appendChild(dropTarget);
        return;
    }

    // Case 2: Dropping on a dropzone container -> MOVE
    if (dropTarget.classList.contains('dropzone')) {
        // Sub-case 2a: Dropping on a court side (capacity: 2)
        if (dropTarget.classList.contains('court-side')) {
            if (dropTarget.children.length < 2) {
                dropTarget.appendChild(draggableElement);
            }
            return;
        }
        // Sub-case 2b: Dropping on bench or not-arrived (no capacity limit)
        if (dropTarget.id === 'bench-players' || dropTarget.id === 'not-arrived-players') {
            dropTarget.appendChild(draggableElement);
            return;
        }
    }
}

function handleEndGame(e) {
    const courtBlock = e.currentTarget.closest('.court-block');
    const courtId = courtBlock.id;
    const playersOnCourt = Array.from(courtBlock.querySelectorAll('.player-block'));
    const benchPlayersContainer = document.getElementById('bench-players');
    const nextUpCourt = document.getElementById('next-up-court');
    const playersNextUp = Array.from(nextUpCourt.querySelectorAll('.player-block'));

    // --- Clear old resting players first ---
    const restingPlayerIds = JSON.parse(sessionStorage.getItem('restingPlayerIds') || '[]');
    restingPlayerIds.forEach(playerId => {
        const player = document.getElementById(playerId);
        if (player) player.classList.remove('resting');
    });

    // --- Move players to bench, increment count, and set to resting ---
    const newRestingPlayerIds = [];
    playersOnCourt.forEach(player => {
        let gamesPlayed = parseInt(player.dataset.gamesPlayed, 10) + 1;
        player.dataset.gamesPlayed = gamesPlayed;
        player.querySelector('.games-played').textContent = gamesPlayed;
        player.classList.add('resting');
        newRestingPlayerIds.push(player.id);
        benchPlayersContainer.appendChild(player);
    });
    sessionStorage.setItem('restingPlayerIds', JSON.stringify(newRestingPlayerIds));

    // --- Move "Next Up" players to the now-vacant court ---
    const targetCourtSides = courtBlock.querySelectorAll('.court-side');
    playersNextUp.forEach((player, index) => {
        const sideIndex = index < 2 ? 0 : 1;
        targetCourtSides[sideIndex].appendChild(player);
    });
    // gameHistory[courtId] = playersNextUp.map(p => p.dataset.playerName).sort();

    // --- Select new players for "Next Up" ---
    const allBenchedPlayers = Array.from(benchPlayersContainer.querySelectorAll('.player-block'));
    let eligiblePlayers = allBenchedPlayers.filter(p => !p.classList.contains('resting'));
    eligiblePlayers.sort((a, b) => a.dataset.gamesPlayed - b.dataset.gamesPlayed);

    let selectedPlayers = eligiblePlayers.slice(0, 4);

    // --- New Rule: Fill gaps with resting players if needed ---
    if (selectedPlayers.length < 4) {
        const needed = 4 - selectedPlayers.length;
        let restingPlayers = allBenchedPlayers.filter(p => p.classList.contains('resting'));
        restingPlayers.sort((a, b) => a.dataset.gamesPlayed - b.dataset.gamesPlayed);
        
        const fillerPlayers = restingPlayers.slice(0, needed);
        fillerPlayers.forEach(player => {
            player.classList.remove('resting'); // Clear their resting state
        });
        selectedPlayers.push(...fillerPlayers);
    }

    // --- Move selected players to the "Next Up" area ---
    const nextUpCourtSides = nextUpCourt.querySelectorAll('.court-side');
    // Clear the area first
    nextUpCourtSides.forEach(side => side.innerHTML = '');
    selectedPlayers.forEach((player, index) => {
        const sideIndex = index < 2 ? 0 : 1;
        nextUpCourtSides[sideIndex].appendChild(player);
    });
}