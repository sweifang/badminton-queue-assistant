$(document).ready(function() {
    let allParticipants = [];
    let sessionParticipants = [];

    // Load initial participants from file
    $("#participants-file").change(function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                allParticipants = JSON.parse(e.target.result);
                renderAllParticipants();
                $("#select-all-btn").removeClass("d-none"); // Show the button
            };
            reader.readAsText(file);
        }
    });

    // Select all participants
    $("#select-all-btn").click(function() {
        $("#all-participants input[type='checkbox']").prop('checked', true);
    });

    // Render all participants
    function renderAllParticipants() {
        const $list = $("#all-participants").empty();
        allParticipants.forEach((p, index) => {
            const block = createPlayerBlock(p, index, false);
            $list.append(block);
        });
    }

    // Render session participants
    function renderSessionParticipants() {
        const $list = $("#session-participants").empty();
        sessionParticipants.forEach((p, index) => {
            const block = createPlayerBlock(p, index, true);
            $list.append(block);
        });
    }

    // Create a player block element
    function createPlayerBlock(player, index, inSession) {
        const checkbox = inSession ? '' : `<input type="checkbox" class="form-check-input" data-index="${index}">`;
        const removeIcon = inSession ? `<img src="assets/minus.svg" class="action-icon remove-icon" data-index="${index}">` : '';
        const dollarIcon = player.paid ? 'assets/dollar_sign_pink.svg' : 'assets/dollar_sign_grey.svg';
        const dollarSign = inSession ? `<img src="${dollarIcon}" class="action-icon dollar-sign" data-index="${index}">` : '';

        return `
            <div class="participant-row">
                ${checkbox}
                ${removeIcon}
                <div class="player-block ${player.skill}">
                    <span class="game-count">${player.games_played || 0}</span>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="actions">
                    ${dollarSign}
                </div>
            </div>
        `;
    }

    // Show add participant modal
    $("#add-participant-btn").click(function() {
        new bootstrap.Modal($('#add-participant-modal')).show();
    });

    // Save new participant
    $("#save-participant-btn").click(function() {
        const name = $("#participant-name").val();
        const skill = $("#skill-level").val();
        if (name && skill) {
            allParticipants.push({ name, skill, games_played: 0, paid: false });
            renderAllParticipants();
            $("#participant-name").val('');
            $("#skill-level").val('Expert');
            bootstrap.Modal.getInstance($('#add-participant-modal')).hide();
        }
    });

    // Move selected participants to session
    $("#move-to-session-btn").click(function() {
        $("#all-participants input:checked").each(function() {
            const index = $(this).data("index");
            const participant = allParticipants[index];
            if (!sessionParticipants.some(p => p.name === participant.name)) {
                sessionParticipants.push({ ...participant });
            }
        });
        renderSessionParticipants();
    });

    // Remove participant from session
    $("#session-participants").on("click", ".remove-icon", function() {
        const index = $(this).data("index");
        sessionParticipants.splice(index, 1);
        renderSessionParticipants();
    });

    // Toggle paid status
    $("#session-participants").on("click", ".dollar-sign", function() {
        const index = $(this).data("index");
        sessionParticipants[index].paid = !sessionParticipants[index].paid;
        renderSessionParticipants();
    });

    // Confirm and go to main page
    $("#confirm-btn").click(function() {
        const numCourts = $("#courts-select").val();
        const sessionData = {
            numCourts: parseInt(numCourts, 10),
            participants: sessionParticipants
        };

        sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
        window.open('main.html', '_blank');
        $(this).prop('disabled', true);
    });

    // Download signed-up.json
    $("#download-signed-up-btn").click(function() {
        const signedUpData = JSON.stringify(sessionParticipants, null, 2);
        const signedUpBlob = new Blob([signedUpData], { type: "application/json" });
        const signedUpUrl = URL.createObjectURL(signedUpBlob);
        const a = document.createElement('a');
        a.href = signedUpUrl;
        a.download = 'signed-up.json';
        a.click();
        URL.revokeObjectURL(signedUpUrl);
    });

    // Download participants.json
    $("#download-participants-btn").click(function() {
        const allParticipantsData = JSON.stringify(allParticipants.map(p => ({name: p.name, skill: p.skill})), null, 2);
        const allParticipantsBlob = new Blob([allParticipantsData], { type: "application/json" });
        const allParticipantsUrl = URL.createObjectURL(allParticipantsBlob);
        const a = document.createElement('a');
        a.href = allParticipantsUrl;
        a.download = 'participants.json';
        a.click();
        URL.revokeObjectURL(allParticipantsUrl);
    });
});