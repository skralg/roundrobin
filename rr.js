// Various custom functions for the Round Robin Loot Tracking tool

function addChar () {
    // add a new table row to the table with id="character_pool"
    charname = document.getElementById("new_char_name").value.trim();
    if (!charname) return;
    document.getElementById("new_char_name").value = "";
    let ref = document.getElementById("character_pool");
    let row = ref.insertRow(-1);
    let id = charname.toLowerCase();
    let title = toTitleCase(id);
    //<tr><td><input type="checkbox" value="roscoe" checked="checked"/> Roscoe</td></tr>
    let cell = row.insertCell(0);
    remove = "<span class='delchar' onclick='delChar(this)'>X</span>";
    cell.innerHTML = remove + "<input type='checkbox' value='" + id + "' checked/> " + title;
    sortTable("character_pool");
    // Add this character to all existing queues
    let queues = document.querySelectorAll(".queue");
    queues.forEach(queue => {
        addCharToQueue(queue, id);
        sortQueue(queue);
    });
    // Put the cursor back into the input box
    document.getElementById("new_char_name").focus();
}

function delChars() {
    if (confirm("Are you sure you want to delete all characters?\nThis will remove them from all queues.")) {
        let table = document.getElementById("character_pool");
        // Remove all rows except the first two (header and add char row)
        while (table.rows.length > 2) {
            table.deleteRow(2);
        }
        sortTable("character_pool");
    }
}
function delChar(element) {
    if (!confirm("Are you sure you want to delete this character?\nThis will remove them from all queues.")) {
        return;
    }
    // Remove this character from all queues
    charname = element.parentElement.querySelector("input[type='checkbox']").value;
    let queues = document.querySelectorAll(".queue");
    queues.forEach(queue => {
        let rows = Array.from(queue.rows).filter(row => !row.querySelector("th"));
        rows.forEach(row => {
            if (row.cells[0].innerText.toLowerCase() === charname.toLowerCase()) {
                row.remove();
            }
        });
    });
    
    // Remove the character from the character pool
    element.parentElement.parentElement.remove();
    sortTable("character_pool");
}

function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}

// A function to sort table rows by the value of the checkbox
function sortTable(id) {
    const table = document.getElementById(id);
    if (!table) return;
    const tbody = table.tBodies[0] || table;
    // Get all rows except header
    const rows = Array.from(tbody.rows);
    // If there's a header row, skip it
    const hasHeader = table.tHead || (rows[0] && rows[0].querySelector('th'));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    // Sort rows by checkbox value
    dataRows.sort((a, b) => {
      const aCheckbox = a.querySelector('input[type="checkbox"]');
      const bCheckbox = b.querySelector('input[type="checkbox"]');
      if (!aCheckbox || !bCheckbox) return 0;
      return aCheckbox.value.localeCompare(bCheckbox.value);
    });
    // Re-append sorted rows
    dataRows.forEach(row => tbody.appendChild(row));
}

// Create a new Round-Robin Queue for the current group
function addQueue(queueName="", shards=false) {
    if (!queueName) {
        queueName = prompt("Enter the name for the new Queue");
        if (!queueName) return;
    }
    characters = getCheckedCharacterList();
    if (characters.length === 0) {
        alert("Please select at least one character from the Character List to add a queue.");
        return;
    }
    tbl = document.createElement("table");
    tbl.classList.add("queue");
    tbl.dataset.lastWinner = "";
    tbl.dataset.shards = shards;
    tbl.dataset.createdAt = Date.now();
    document.getElementById("qc").appendChild(tbl);
    // Header row
    row = tbl.insertRow(-1);
    th = document.createElement("th");
    th.colSpan = 2;
    deleteQ = "<span class='delchar' style='float: left' onclick='delQueue(this)'>X</span> ";
    resetQ = " <span class='delchar' style='float: right'onclick='resetQueue(this)'>↺</span> ";
    ageQ = "&nbsp; <span class='trackerAge'>0:00:00</span>";
    th.innerHTML = deleteQ + queueName + ageQ + resetQ;
    row.appendChild(th);
    // Suggestion row
    row = tbl.insertRow(-1);
    th = document.createElement("th");
    th.colSpan = 2;
    th.classList.add("suggest");
    th.innerText = "Next: Everyone click NEED";
    row.appendChild(th);

    // Add a stats row (th) to the table that counts the total loot, and loot per hour
    row = tbl.insertRow(-1);
    th = document.createElement("th");
    th.colSpan = 2;
    th.classList.add("stats");
    th.innerText = "Drops: 0 | Per hour: 0";
    row.appendChild(th);
    
    // Add checked characters to the queue
    characters.forEach(char => addCharToQueue(tbl, char));
}

function addCharToQueue(tbl, char) {
    row = tbl.insertRow(-1);
    cell = row.insertCell(0);
    cell.innerText = toTitleCase(char);
    controls = row.insertCell(1);
    controls.innerHTML = "<input class='count' size='2' value='0'/> ";
    if (tbl.dataset.shards == "true") {
        controls.innerHTML += "<button class='tools' onclick='loot2(this)'>+2</button> <button class='tools' onclick='loot5(this)'>+5</button>";
    } else {
        controls.innerHTML += "<button class='tools' onclick='loot(this)'>+</button>";
    }
    controls.innerHTML += " <input type='checkbox' onclick='sortQueue(this)' checked/>";
}

function resetQueue(element) {
    if (confirm("Are you sure you want to reset this queue?")) {
        queueTable = element.parentElement.parentElement.parentElement.parentElement;
        inputs = queueTable.querySelectorAll("input.count");
        inputs.forEach(input => input.value = "0");
        queueTable.dataset.lastWinner = "";
        queueTable.dataset.createdAt = Date.now();
        // Update suggestion text to the next player at the top of the list
        suggestion = queueTable.querySelector(".suggest");
        suggestion.innerText = "Next: Everyone click NEED"
        sortQueue(queueTable);
    }
}

function getCheckedCharacterList() {
    // Get a list of all checkbox input values from the character_pool table that are checked
    table = document.getElementById("character_pool");
    checkboxes = table.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}



function delQueue(element) {
    if (confirm("Are you sure you want to delete this queue?\nThis will remove all progress.")) {
        element.parentElement.parentElement.parentElement.parentElement.remove();
    }
}


// Loot gains
function loot2(element) { loot(element, 2); }
function loot5(element) { loot(element, 5); }
function loot(element, count=1) {
    counter = element.parentElement.querySelector("input.count");
    if (!counter) return;
    value = parseInt(counter.value) || 0;
    value += count || 1;
    counter.value = value;

    // Recursively traverse the parentElements until we find the table element
    parentTable = element.parentElement;
    while (parentTable && parentTable.nodeName !== "TABLE") {
        parentTable = parentTable.parentElement;
    }

    // if first winner, and the player who just got loot has their checkbox enabled, set them as the last winner.
    checkbox = element.parentElement.querySelector("input[type='checkbox']");
    if (parentTable.dataset.lastWinner == "" && checkbox.checked) {
        row = element.parentElement.parentElement;
        player = row.cells[0].innerText;
        parentTable.dataset.lastWinner = player.toLowerCase();
    }

    // Update the stats row with the total loot and loot per hour
    statsRow = parentTable.querySelector(".stats");
    if (statsRow) {
        totalLoot = Array.from(parentTable.querySelectorAll("input.count")).reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
        createdAt = parseInt(parentTable.dataset.createdAt);
        hours = (Date.now() - createdAt) / 3600000;
        lootPerHour = hours > 0 ? (totalLoot / hours).toFixed(2) : totalLoot;
        statsRow.innerText = `Drops: ${totalLoot} | Per hr: ${lootPerHour}`;
    }

    // Sort the queue
    sortQueue(parentTable);

    // Update suggestion text to the player name in the first td of the first row that doesn't have a th (the next player up)
    suggestion = parentTable.querySelector(".suggest");
    if (parentTable.dataset.lastWinner != "") {
        nextRow = Array.from(parentTable.rows).find(row => !row.querySelector("th"));
        if (nextRow) {
            nextPlayer = nextRow.cells[0].innerText;
            suggestion.innerText = "Next: " + nextPlayer;
        }
    }
}

function sortQueue(element) {
    // Sort the rows of the queue table based on the value of the count input,
    // in ascending order, then by cell 0 alphabetically

    queueTable = element; // Walk parent tree until table element
    while (queueTable && queueTable.nodeName !== "TABLE") {
        queueTable = queueTable.parentElement;
    }
    if (!queueTable) return;
    rows = Array.from(queueTable.rows);
    // skip rows with th elements (header and suggestion)
    rows = rows.filter(row => !row.querySelector("th"));

    if (queueTable.dataset.lastWinner) {
        lastWinner = queueTable.dataset.lastWinner.toLowerCase();
    } else {
        lastWinner = null;
    }
    rows.sort((a, b) => {
        // if the checkbox is unchecked, treat count as -1 so they sort to the bottom
        aChecked = a.querySelector("input[type='checkbox']").checked;
        bChecked = b.querySelector("input[type='checkbox']").checked;
        if (!aChecked && bChecked) return 1;
        if (aChecked && !bChecked) return -1;
        
        aCount = parseInt(a.querySelector("input.count").value) || 0;
        bCount = parseInt(b.querySelector("input.count").value) || 0;
        if (bCount !== aCount) return aCount - bCount; // sort by count asc
        // Round robin after last winner
        aName = a.cells[0].innerText.toLowerCase();
        bName = b.cells[0].innerText.toLowerCase();

        if (lastWinner) {
            if (aName === lastWinner) return -1; // first winner should always sort to the top
            if (bName === lastWinner) return 1;
            //if name is after last winner alphabetically, it should sort higher than names that are before the last winner
            if (aName.localeCompare(lastWinner) > 0 && bName.localeCompare(lastWinner) < 0) return -1;
            if (aName.localeCompare(lastWinner) < 0 && bName.localeCompare(lastWinner) > 0) return 1;
        }
        return aName.localeCompare(bName); // then by name asc
    });
    rows.forEach(row => queueTable.appendChild(row));
}

function onLoad() {
    // Set up event listener for pressing Enter in the new character input box
    document.getElementById('new_char_name').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addChar();
        }
    });

    // Update tracker ages every second
    setInterval(() => {
        let trackers = document.querySelectorAll(".queue");
        trackers.forEach(tracker => {
            let ageSpan = tracker.querySelector(".trackerAge");
            if (ageSpan) {
                let createdAt = parseInt(tracker.dataset.createdAt);
                let ageSeconds = Math.floor((Date.now() - createdAt) / 1000);
                let hours = Math.floor(ageSeconds / 3600);
                let minutes = Math.floor((ageSeconds % 3600) / 60);
                let seconds = ageSeconds % 60;
                ageSpan.innerText = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
}
