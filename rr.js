function addChar () {
    console.log('adding character');
    // add a new table row to the table with id="character_pool"
    charname = prompt("Enter the name of the new member in the group");
    if (!charname) return;
    let ref = document.getElementById("character_pool");
    let row = ref.insertRow(-1);
    let id = charname.toLowerCase();
    let title = toTitleCase(id);
    //<tr><td><input type="checkbox" value="roscoe" checked="checked"/> Roscoe</td></tr>
    let cell = row.insertCell(0);
    remove = "<span class='delchar' onclick='delChar(this)'>X</span>";
    cell.innerHTML = remove + "<input type='checkbox' value='" + id + "'/> " + title;
    sortTable("character_pool");
}

function delChar(element) {
    if (confirm("Are you sure you want to delete this character?\nThis will remove them from all queues.")) {
        element.parentElement.parentElement.remove();
    }
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
function addQueue(shards=false) {
    queueName = prompt("Enter the name for the new Queue");
    console.log('adding queue ' + queueName);
    tbl = document.createElement("table");
    tbl.classList.add("queue");
    document.getElementById("qc").appendChild(tbl);
    // Header row
    row = tbl.insertRow(-1);
    th = document.createElement("th");
    th.colSpan = 2;
    th.innerHTML="<span class='delchar' onclick='delQueue(this)'>X</span> " + queueName;
    row.appendChild(th);
    characters = getCheckedCharacterList();
    characters.forEach(char => {
        row = tbl.insertRow(-1);
        cell = row.insertCell(0);
        cell.innerText = toTitleCase(char);
        controls = row.insertCell(1);
        if (shards) {
            controls.innerHTML = "<input class='count' size='1' value='0'/> <button class='tools' onclick='loot2(this)'>+2</button> <button class='tools' onclick='loot5(this)'>+5</button><input type='checkbox' checked/>";
        } else {
            controls.innerHTML = "<input class='count' size='1' value='0'/> <button class='tools' onclick='loot(this)'>+</button><input type='checkbox' checked/>";
        }
    });

    

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
    input = element.parentElement.querySelector("input.count");
    if (!input) return;
    value = parseInt(input.value) || 0;
    value += count || 1;
    input.value = value;
    parentTable = element.parentElement.parentElement.parentElement.parentElement;
    sortQueue(parentTable);
}

function sortQueue(queueTable) {
    // Sort the rows of the queue table based on the value of the count input,
    // in ascending order, then by cell 0 alphabetically
    tbody = queueTable.tBodies[0] || queueTable;
    rows = Array.from(tbody.rows).slice(1); // skip header
    rows.sort((a, b) => {
        aCount = parseInt(a.querySelector("input.count").value) || 0;
        bCount = parseInt(b.querySelector("input.count").value) || 0;
        if (bCount !== aCount) return aCount - bCount; // sort by count asc
        aName = a.cells[0].innerText.toLowerCase();
        bName = b.cells[0].innerText.toLowerCase();
        return aName.localeCompare(bName); // then by name asc
    });
    rows.forEach(row => tbody.appendChild(row));

}