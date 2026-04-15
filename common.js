// Loot Tracker common functions for both editor an view-only apps

export function lootRate(tracker) {
    // use the tracker run interval from createdAt to lastConfirmed
    const endTime = tracker.lastConfirmed || tracker.createdAt;
    const elapsedHours = (endTime - tracker.createdAt) / (1000 * 60 * 60);
    if (elapsedHours === 0) return "N/A";
    return (tracker.totalDrops / elapsedHours).toFixed(2);
}

export function elapsedTracker(tracker) {
    // format elapsed time in HH:MM:SS format between createdAt and lastConfirmed
    const elapsedMs = Math.abs((tracker.lastConfirmed || tracker.createdAt) - tracker.createdAt);
    const seconds = Math.floor(elapsedMs / 1000);
    const sec = Math.floor(seconds % 60);
    const min = Math.floor((seconds / 60) % 60);
    const hr = Math.floor(seconds / 3600);
    return `${hr > 0 ? hr + ':' : ''}${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export function sortedTracker(trackerId, tracker, players) {
    // This function sorts the trackers to determine the suggested next player to be awarded loot.
    // It does the actual visual sorting, and updating the suggestion text.
    return tracker.players.sort((a, b) => {
        const A = players[a].trackers[trackerId];
        const B = players[b].trackers[trackerId];
        // Checked players are above unchecked players
        if (A.checked && !B.checked) return -1;
        if (!A.checked && B.checked) return 1;
        if (tracker.method === 'fair') {
            // Players with more loot are lower priority
            if (A.fairness !== B.fairness) return A.fairness - B.fairness;
        }
        const aName = players[a].name;
        const bName = players[b].name;
        if (!tracker.lastWinner) {
            // If no winner yet, sort alphabetically
            return aName.localeCompare(bName);
        }
        // If there is a winner, stagger/rotate list accordingly
        const cName = players[tracker.lastWinner].name;
        if (aName === cName) return 1; // last winner goes to bottom
        if (bName === cName) return -1; // last winner goes to bottom
        if (aName.localeCompare(cName) > 0 && bName.localeCompare(cName) < 0) return -1;
        if (aName.localeCompare(cName) < 0 && bName.localeCompare(cName) > 0) return 1;
        return aName.localeCompare(bName); // otherwise sort alphabetically
    });
}

export function suggest(tracker, players) {
    if (tracker.lastWinner) {
        tracker.suggest = "Next: " + players[tracker.players[0]].name;
    } else {
        tracker.suggest = "First Drop! Everyone *NEED*";
    }
    return tracker.suggest;
}

export function orderedTrackers(lootData) {
    if (!lootData || !lootData.trackers) return {};
    const ordered = {};
    const order = Array.isArray(lootData.trackerOrder) && lootData.trackerOrder.length
        ? lootData.trackerOrder
        : Object.keys(lootData.trackers);
    order.forEach(trackerId => {
        if (trackerId in lootData.trackers) {
            ordered[trackerId] = lootData.trackers[trackerId];
        }
    });
    Object.keys(lootData.trackers).forEach(trackerId => {
        if (!(trackerId in ordered)) {
            ordered[trackerId] = lootData.trackers[trackerId];
        }
    });
    return ordered;
}

// Speech synthesis and theme management functions moved from index.html
export function loadTracker(trackerId=null) {
    if (!trackerId) {
        trackerId = document.getElementById('external_tracker_id').value;
    }
    if (!trackerId) {
        alert('You must enter a Tracker ID first.');
        return;
    }
    const tPath = 'lootData/' + trackerId;
    get(child(ref(db), tPath)).then((snapshot) => {
        if (snapshot.exists()) {
            this.lootData = snapshot.val();
        } else {
            alert("No data found for tracker ID: " + trackerId);
            return;
        }
    }).catch((error) => {
        console.error("Error loading tracker data: ", error);
        return;
    });

    // Cancel any existing subscriptions to changing data
    if (unsubscribe) unsubscribe();
    // Handle data updates
    const dataRef = ref(db, tPath);
    unsubscribe = onValue(dataRef, (snapshot) => {
        this.lootData = snapshot.val();
        // Announce changes if verbal alerts enabled
        for (trackerId in this.lootData.trackers) {
            this.read(trackerId);
        }
    });
}

export function navigateToOldURL() {
    // Get the current URL
    const currentUrl = window.location.href;
    
    // Perform your string replacement (example: replace '/old' with '/new')
    const newUrl = currentUrl.replace('view.html', 'view_old.html');
    
    // Navigate to the new URL
    // Use window.location.href for normal navigation
    window.location.href = newUrl;
}

export function read(trackerId) {
    // Skip unless explicitly enabled
    if (this.alerts == 'none') return;

    // Bail if browser doesn't support it
    if (!('speechSynthesis' in window)) return;

    // Find and save a valid voice
    if (!this.voice) this.configSpeech();

    const tracker = this.lootData.trackers[trackerId];

    // no actions so far
    if (!tracker.actions || !tracker.actions.length) return;

    const trackerName = this.lootData.trackers[trackerId].name;
    for (const index in tracker.actions) {
        let action = tracker.actions[index];
        // Bail if this is not for an alert we want
        if (!(this.alerts == 'everyone' || action.target == 'everyone' || this.alerts == action.target)) continue;

        // Bail if we already did this one
        if (this.alertsRead.includes(action.id)) continue;

        const sentence = `${trackerName} ${action.msg}`;
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.voice = this.voice;
        utterance.volume = Number(this.voiceVolume) || 0.7;
        this.speech.speak(utterance);
        this.alertsRead.push(action.id);
    }
}

export function enumerateVoices() {
    if (!this.speech) return;
    const voices = this.speech.getVoices();
    this.voices = voices.map(v => ({
        name: v.name,
        lang: v.lang,
        uri: v.voiceURI,
        label: `${v.name} (${v.lang})${v.default ? ' [default]' : ''}`
    }));

    const savedURI = localStorage.getItem('selectedVoiceURI');
    if (savedURI) {
        const match = voices.find(v => v.voiceURI === savedURI);
        if (match) {
            this.voice = match;
            this.selectedVoiceURI = savedURI;
        }
    }

    if (!this.voice) {
        this.configSpeech();
    }
}

export function applySelectedVoice() {
    if (!this.selectedVoiceURI) return;
    const chosen = this.speech.getVoices().find(v => v.voiceURI === this.selectedVoiceURI);
    if (chosen) {
        this.voice = chosen;
        localStorage.setItem('selectedVoiceURI', chosen.voiceURI);
    }
    this.showVoicePicker = false;
}

export function testVoice() {
    if (!('speechSynthesis' in window) || !this.speech) return;
    if (!this.selectedVoiceURI) return;
    const voices = this.speech.getVoices();
    const chosen = voices.find(v => v.voiceURI === this.selectedVoiceURI);
    if (!chosen) return;

    const sentence = this.voiceTestSentences[Math.floor(Math.random() * this.voiceTestSentences.length)];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.voice = chosen;
    utterance.volume = Number(this.voiceVolume) || 0.7;
    this.speech.speak(utterance);
}

export function configSpeech() {
    if (!this.speech) return;
    const voices = this.speech.getVoices();
    if (!voices || !voices.length) return;

    // Try saved voice first
const savedURI = localStorage.getItem('selectedVoiceURI');
    if (savedURI) {
        const savedVoice = voices.find(v => v.voiceURI === savedURI);
        if (savedVoice) {
            this.voice = savedVoice;
            this.selectedVoiceURI = savedURI;
            return;
        }
    }

    // We at least try to pick a voice in the native user's language
    const lang = navigator.language;
    for (const v of voices.toReversed()) {
        if (v.lang === lang) {
            this.voice = v;
            this.selectedVoiceURI = v.voiceURI;
            console.log(`Voice init: selected '${v.name}' from ${voices.length} voices for ${lang} speech generation`);
            return;
        }
    }

    // fallback to first voice
    this.voice = voices[0];
    this.selectedVoiceURI = voices[0].voiceURI;
}

export function localSave(key, val) {
    try {
        localStorage.setItem(key, val);
    } catch (error) {
        console.error('Error saving to localStorage: ' , error);
    }
}

export function setTheme(themeName) {
    if (!themeName || !this.theme) return;
    this.selectedTheme = themeName;
    this.theme.change(themeName);
    localStorage.setItem('selectedTheme', themeName);
}

// Define the draggable directive
export const draggable = {
    mounted(el, binding) {
        const toggleDragClass = (event, className, add) => {
            const target = event.currentTarget;
            if (!target) return;
            target.classList[add ? 'add' : 'remove'](className);
        };

        el.draggable = true;
        el.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', binding.value);
            event.dataTransfer.effectAllowed = 'move';
            toggleDragClass(event, 'dragging', true);
        });
        el.addEventListener('dragend', (event) => {
            toggleDragClass(event, 'dragging', false);
            toggleDragClass(event, 'over', false);
        });
        el.addEventListener('dragenter', (event) => {
            event.preventDefault();
            toggleDragClass(event, 'over', true);
        });
        el.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            toggleDragClass(event, 'over', true);
        });
        el.addEventListener('dragleave', (event) => {
            toggleDragClass(event, 'over', false);
        });
        el.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleDragClass(event, 'over', false);
            const fromId = event.dataTransfer.getData('text/plain');
            const toId = binding.value;
            if (fromId && fromId !== toId) {
                const app = window.VueApp;
                if (app && typeof app.onDrop === 'function') {
                    app.onDrop(toId, fromId);
                }
            }
        });

    }
};

export function localLoad() {
    const localKeys = ['alerts', 'selectedVoiceURI', 'voiceVolume', 'selectedTheme'];
    // Load these keys from localStorage
    for (const key of localKeys) {
        const val = localStorage.getItem(key); // null if not found
        if (val === null) continue;
        if (key === 'voiceVolume') {
            const parsed = Number(val);
            if (!Number.isNaN(parsed)) this.voiceVolume = Math.min(1, Math.max(0, parsed));
        } else {
            this[key] = val;
        }
    }
}
