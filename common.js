// Loot Tracker common functions for both editor an view-only apps

export function shortDate() {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toLowerCase().replace(/ /g, '');
}

export function lootRate(currentTime, tracker) {
    // use reactive currentTime so this method is re-evaluated periodically
    const elapsedHours = (currentTime - tracker.createdAt) / (1000 * 60 * 60);
    if (elapsedHours === 0) return "N/A";
    return (tracker.totalDrops / elapsedHours).toFixed(2);
}

export function elapsedTracker(currentTime, tracker) {
    // format elapsed time in HH:MM:SS format
    const elapsedMs = currentTime - tracker.createdAt;
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