/*  Web-based Cyber Governance Maturity Model
    written by Martyn Croft.
    Derived from the Cyber Governance Code of Practice 
    and based on the maturity model spreadsheet developed
    by CxB : Cyber Governance for Boards 2025 - 2026        */

let modelData = null;
let radarChart = null;
let adminMode = false;
const lockedActions = new Set();

const modelContainer = document.getElementById("model-container");
const scoreSummaryEl = document.getElementById("score-summary");
const categoryBreakdownEl = document.getElementById("category-breakdown");
const recommendationsEl = document.getElementById("recommendations");
const boardReportContentEl = document.getElementById("board-report-content");

const resetBtn = document.getElementById("reset-btn");
const printBtn = document.getElementById("print-btn");
const toggleAdminBtn = document.getElementById("toggle-admin");
const adminContent = document.getElementById("admin-content");
const prefillMinimumBtn = document.getElementById("prefill-minimum");
const clearLocksBtn = document.getElementById("clear-locks");

const orgNameInput = document.getElementById("org-name");
const boardNameInput = document.getElementById("board-name");
const dateInput = document.getElementById("assessment-date");
const sectorSelect = document.getElementById("sector-select");
const sectorHintEl = document.getElementById("sector-hint");

const exportCsvBtn = document.getElementById("export-csv-btn");
const importCsvBtn = document.getElementById("import-csv-btn");
const csvFileInput = document.getElementById("csv-file-input");

async function init() {
  const res = await fetch("MatModelData.json");
  modelData = await res.json();
  updateSectorHint();
  renderModel();
  attachCommonEvents();
  updateResults();
}

function updateSectorHint() {
  const key = sectorSelect.value || "generic";
  const text = modelData.sectors[key] || modelData.sectors.generic;
  sectorHintEl.textContent = text;
}

sectorSelect.addEventListener("change", () => {
  if (!modelData) return;
  updateSectorHint();
});

function renderModel() {
  modelContainer.innerHTML = "";

  modelData.domains.forEach(domain => {
    const section = document.createElement("section");
    section.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <h2>${domain.name}</h2>
      <span class="domain-tag">Domain ${domain.code}</span>
    `;
    section.appendChild(header);

    domain.actions.forEach(action => {
      const block = document.createElement("div");
      block.className = "action-block";

      const actionMeta = document.createElement("div");
      actionMeta.className = "action-meta";
      actionMeta.innerHTML = `
        <div>
          <div class="action-title">${action.title}</div>
          <div class="action-text">${action.actionText || ""}</div>
        </div>
        <div>
          <span class="action-code">${action.code}</span>
          <span class="lock-toggle" data-code="${action.code}">🔓 unlock</span>
        </div>
      `;
      block.appendChild(actionMeta);

      const levelsDiv = document.createElement("div");
      levelsDiv.className = "levels";

      const pillRow = document.createElement("div");
      pillRow.className = "level-pill-row";
      pillRow.innerHTML = `
        <div class="level-pill"><span>0</span> No governance</div>
        <div class="level-pill"><span>1</span> Minimal</div>
        <div class="level-pill"><span>2</span> Progressive</div>
        <div class="level-pill"><span>3</span> Good</div>
        <div class="level-pill"><span>4</span> Leading</div>
      `;
      levelsDiv.appendChild(pillRow);

      const listDiv = document.createElement("div");
      listDiv.className = "levels-list";
      listDiv.innerHTML = action.levels
        .map(
          lvl => `
          <label>
            <input type="radio" name="${action.code}" value="${lvl.level}">
            <strong>${lvl.level}:</strong> ${lvl.maturityLevel}
          </label>
        `
        )
        .join("");

      levelsDiv.appendChild(listDiv);
      block.appendChild(levelsDiv);

      const notesDiv = document.createElement("div");
      notesDiv.className = "notes";
      notesDiv.id = `${action.code}-notes`;
      notesDiv.textContent = modelData.ui.notesDefault;
      block.appendChild(notesDiv);

      section.appendChild(block);

      listDiv.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", () => {
          if (lockedActions.has(action.code) && !adminMode) {
            input.checked = false;
            return;
          }
          const val = Number(input.value);
          const levelObj = action.levels.find(l => l.level === val);
          if (levelObj) {
            notesDiv.innerHTML = `
              <div><strong>Notes:</strong> ${levelObj.notes}</div>
              ${
                levelObj.followOn && levelObj.followOn.length
                  ? `<div><strong>Follow-on actions:</strong><ul>${levelObj.followOn
                      .map(f => `<li>${f}</li>`)
                      .join("")}</ul></div>`
                  : ""
              }
            `;
          } else {
            notesDiv.textContent = modelData.ui.notesDefault;
          }
          updateResults();
        });
      });

      const lockToggle = actionMeta.querySelector(".lock-toggle");
      lockToggle.addEventListener("click", () => {
        if (!adminMode) return;
        if (lockedActions.has(action.code)) {
          lockedActions.delete(action.code);
          updateLockState(action.code, false);
        } else {
          const checked = document.querySelector(
            `input[name="${action.code}"]:checked`
          );
          if (!checked) return;
          lockedActions.add(action.code);
          updateLockState(action.code, true);
        }
      });
    });

    modelContainer.appendChild(section);
  });
}

function updateLockState(code, isLocked) {
  const listDiv = document.querySelector(
    `.levels-list input[name="${code}"]`
  )?.closest(".levels-list");
  const lockToggle = document.querySelector(`.lock-toggle[data-code="${code}"]`);

  if (!listDiv || !lockToggle) return;

  if (isLocked) {
    listDiv.classList.add("disabled");
    lockToggle.classList.add("locked");
    lockToggle.textContent = "🔒 locked";
    listDiv.querySelectorAll("input").forEach(input => {
      if (!input.checked) input.disabled = true;
    });
  } else {
    listDiv.classList.remove("disabled");
    lockToggle.classList.remove("locked");
    lockToggle.textContent = "🔓 unlock";
    listDiv.querySelectorAll("input").forEach(input => {
      input.disabled = false;
    });
  }
}

function getTotalActionCount() {
  return modelData.domains
    .map(d => d.actions.length)
    .reduce((a, b) => a + b, 0);
}

function updateResults() {
  if (!modelData) return;

  const selectedStats = {};
  let totalScore = 0;
  let count = 0;

  const boardReportByDomain = {};

  modelData.domains.forEach(domain => {
    let catTotal = 0;
    let catCount = 0;

    domain.actions.forEach(action => {
      const checked = document.querySelector(
        `input[name="${action.code}"]:checked`
      );
      if (checked) {
        const val = Number(checked.value);
        catTotal += val;
        catCount++;
        totalScore += val;
        count++;

        const levelObj = action.levels.find(l => l.level === val);
        if (levelObj) {
          if (!boardReportByDomain[domain.name]) {
            boardReportByDomain[domain.name] = [];
          }
          boardReportByDomain[domain.name].push({
            code: action.code,
            title: action.title,
            level: val,
            maturityLevel: levelObj.maturityLevel,
            followOn: levelObj.followOn || []
          });
        }
      }
    });

    selectedStats[domain.name] = {
      total: catTotal,
      count: catCount,
      average: catCount ? catTotal / catCount : null
    };
  });

  const avg = count ? (totalScore / count).toFixed(2) : "–";

  let badgeClass = "badge-red";
  let badgeLabel = "Low maturity";
  if (avg !== "–") {
    const a = Number(avg);
    if (a >= 3.2) {
      badgeClass = "badge-green";
      badgeLabel = "Strong maturity";
    } else if (a >= 1.8) {
      badgeClass = "badge-amber";
      badgeLabel = "Developing maturity";
    }
  }

  const orgName = orgNameInput.value || "Your organisation";
  const boardName = boardNameInput.value || "Board / Committee";
  const dateVal = dateInput.value || "";

  scoreSummaryEl.innerHTML = `
    <p><strong>Organisation:</strong> ${orgName}</p>
    <p><strong>Board / committee:</strong> ${boardName}</p>
    ${dateVal ? `<p><strong>Assessment date:</strong> ${dateVal}</p>` : ""}
    <p><strong>Total score:</strong> ${totalScore} ${
    count ? `over ${count} actions` : ""
  }</p>
    <p><strong>Average maturity:</strong> ${avg} ${
    avg !== "–" ? `<span class="badge ${badgeClass}">${badgeLabel}</span>` : ""
  }</p>
    <p><strong>Completion:</strong> ${count} of ${getTotalActionCount()} actions rated.</p>
  `;

  categoryBreakdownEl.innerHTML = Object.entries(selectedStats)
    .map(([name, stats]) => {
      const avgStr = stats.average != null ? stats.average.toFixed(2) : "–";
      let cBadgeClass = "badge-red";
      if (stats.average != null) {
        if (stats.average >= 3.2) cBadgeClass = "badge-green";
        else if (stats.average >= 1.8) cBadgeClass = "badge-amber";
      }
      return `
        <div class="category-breakdown-item">
          <span class="label">${name}:</span>
          <span> avg ${avgStr}</span>
          ${
            stats.average != null
              ? `<span class="badge ${cBadgeClass}">score</span>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  if (!count) {
    recommendationsEl.innerHTML = `<p>${modelData.ui.noRatingsMessage}</p>`;
  } else {
    const lowest = Object.entries(selectedStats)
      .filter(([, v]) => v.average != null)
      .sort((a, b) => a[1].average - b[1].average)[0];

    const lowestText = lowest
      ? `${lowest[0]} (avg ${lowest[1].average.toFixed(2)})`
      : "N/A";

    recommendationsEl.innerHTML = `
      <p>
        ${orgName} should prioritise improvement efforts in the weakest domain(s), starting with
        <strong>${lowestText}</strong>. Use the board-level follow-on actions beneath each item
        as a ready-made checklist for agendas, assurance requests, and management actions.
      </p>
      <p>
        This assessment, including the maturity radar, can be included in ${boardName} papers
        to evidence oversight of cyber governance and alignment with the Cyber Governance
        Code of Practice.
      </p>
    `;
  }

  updateRadarChart(selectedStats);
  updateBoardReport(boardReportByDomain);
}

function updateRadarChart(stats) {
  const ctx = document.getElementById("maturityRadar").getContext("2d");
  const labels = Object.keys(stats);
  const data = labels.map(l => {
    const avg = stats[l].average;
    return avg != null ? Number(avg.toFixed(2)) : 0;
  });

  if (radarChart) {
    radarChart.data.labels = labels;
    radarChart.data.datasets[0].data = data;
    radarChart.update();
    return;
  }

  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Average maturity",
          data,
          backgroundColor: "rgba(0, 183, 178, 0.2)",
          borderColor: "rgba(0, 183, 178, 1)",
          pointBackgroundColor: "rgba(10, 35, 66, 1)",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 4,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(148, 163, 184, 0.4)" },
          angleLines: { color: "rgba(148, 163, 184, 0.4)" },
          pointLabels: { font: { size: 11 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function updateBoardReport(boardReportByDomain) {
  if (!Object.keys(boardReportByDomain).length) {
    boardReportContentEl.innerHTML =
      "<p>No follow-on actions yet. Select maturity levels to build a board report.</p>";
    return;
  }

  boardReportContentEl.innerHTML = Object.entries(boardReportByDomain)
    .map(([domainName, actions]) => {
      const actionsHtml = actions
        .map(a => {
          const followList =
            a.followOn && a.followOn.length
              ? `<ul>${a.followOn.map(f => `<li>${f}</li>`).join("")}</ul>`
              : "";
          return `
            <div class="board-report-action">
              <div class="board-report-action-title">${a.code} – ${
            a.title
          } (level ${a.level})</div>
              ${followList}
            </div>
          `;
        })
        .join("");
      return `
        <div class="board-report-domain">
          <h4>${domainName}</h4>
          ${actionsHtml}
        </div>
      `;
    })
    .join("");
}

function attachCommonEvents() {
  resetBtn.addEventListener("click", () => {
    document.querySelectorAll("input[type='radio']").forEach(input => {
      input.checked = false;
      input.disabled = false;
    });
    lockedActions.clear();
    document.querySelectorAll(".lock-toggle").forEach(el => {
      el.classList.remove("locked");
      el.textContent = "🔓 unlock";
    });
    document.querySelectorAll(".levels-list").forEach(div => {
      div.classList.remove("disabled");
    });
    document.querySelectorAll(".notes").forEach(div => {
      div.textContent = modelData.ui.notesDefault;
    });
    updateResults();
  });

  printBtn.addEventListener("click", () => {
    window.print();
  });

  toggleAdminBtn.addEventListener("click", () => {
    adminMode = !adminMode;
    if (adminMode) {
      adminContent.classList.remove("hidden");
      toggleAdminBtn.textContent = "Admin mode: ON";
    } else {
      adminContent.classList.add("hidden");
      toggleAdminBtn.textContent = "Toggle admin mode";
    }
  });

  prefillMinimumBtn.addEventListener("click", () => {
    modelData.domains.forEach(domain => {
      domain.actions.forEach(action => {
        const radios = document.querySelectorAll(`input[name="${action.code}"]`);
        radios.forEach(r => {
          r.checked = r.value === "1";
        });
        const levelObj = action.levels.find(l => l.level === 1);
        const notesDiv = document.getElementById(`${action.code}-notes`);
        if (levelObj) {
          notesDiv.innerHTML = `
            <div><strong>Notes:</strong> ${levelObj.notes}</div>
            ${
              levelObj.followOn && levelObj.followOn.length
                ? `<div><strong>Follow-on actions:</strong><ul>${levelObj.followOn
                    .map(f => `<li>${f}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
          `;
        } else {
          notesDiv.textContent = modelData.ui.notesDefault;
        }
      });
    });
    updateResults();
  });

  clearLocksBtn.addEventListener("click", () => {
    lockedActions.clear();
    document.querySelectorAll(".levels-list").forEach(div => {
      div.classList.remove("disabled");
    });
    document.querySelectorAll(".lock-toggle").forEach(el => {
      el.classList.remove("locked");
      el.textContent = "🔓 unlock";
    });
  });

  [orgNameInput, boardNameInput, dateInput].forEach(input => {
    input.addEventListener("input", updateResults);
  });
}

/**
 * Export current selections to CSV
 */
function exportToCSV() {
  if (!modelData) return;

  // Get metadata
  const orgName = orgNameInput.value || "Your organisation";
  const boardName = boardNameInput.value || "Board / Committee";
  const dateVal = dateInput.value || new Date().toISOString().split('T')[0];
  const sector = sectorSelect.value || "generic";

  // Build CSV content
  let csvContent = "Cyber Governance Maturity Assessment\n";
  csvContent += `Organisation,${escapeCSV(orgName)}\n`;
  csvContent += `Board/Committee,${escapeCSV(boardName)}\n`;
  csvContent += `Assessment Date,${dateVal}\n`;
  csvContent += `Sector,${sector}\n`;
  csvContent += `Export Date,${new Date().toISOString()}\n`;
  csvContent += "\n";
  
  // Headers
  csvContent += "Domain,Action Code,Action Title,Selected Level,Maturity Description,Locked\n";

  // Data rows
  modelData.domains.forEach(domain => {
    domain.actions.forEach(action => {
      const checked = document.querySelector(`input[name="${action.code}"]:checked`);
      const selectedLevel = checked ? checked.value : "";
      const isLocked = lockedActions.has(action.code) ? "Yes" : "No";
      
      let maturityDesc = "";
      if (selectedLevel) {
        const levelObj = action.levels.find(l => l.level === Number(selectedLevel));
        if (levelObj) {
          maturityDesc = levelObj.maturityLevel;
        }
      }

      csvContent += `${escapeCSV(domain.name)},${action.code},${escapeCSV(action.title)},${selectedLevel},${escapeCSV(maturityDesc)},${isLocked}\n`;
    });
  });

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `maturity-assessment-${dateVal}-${sanitizeFilename(orgName)}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import selections from CSV
 */
function importFromCSV(file) {
  if (!file || !modelData) return;

  const reader = new FileReader();
  
  reader.onload = function(e) {
    const content = e.target.result;
    parseAndApplyCSV(content);
  };
  
  reader.onerror = function() {
    alert('Error reading file. Please try again.');
  };
  
  reader.readAsText(file);
}

/**
 * Parse CSV content and apply to model
 */
function parseAndApplyCSV(content) {
  const lines = content.split('\n');
  let dataStartIndex = -1;
  let importedMetadata = {};

  // Find metadata and data start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Organisation,')) {
      importedMetadata.orgName = parseCSVValue(line.split(',')[1]);
    } else if (line.startsWith('Board/Committee,')) {
      importedMetadata.boardName = parseCSVValue(line.split(',')[1]);
    } else if (line.startsWith('Assessment Date,')) {
      importedMetadata.date = parseCSVValue(line.split(',')[1]);
    } else if (line.startsWith('Sector,')) {
      importedMetadata.sector = parseCSVValue(line.split(',')[1]);
    } else if (line.startsWith('Domain,Action Code,')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  if (dataStartIndex === -1) {
    alert('Invalid CSV format. Could not find data section.');
    return;
  }

  // Apply metadata
  if (importedMetadata.orgName) orgNameInput.value = importedMetadata.orgName;
  if (importedMetadata.boardName) boardNameInput.value = importedMetadata.boardName;
  if (importedMetadata.date) dateInput.value = importedMetadata.date;
  if (importedMetadata.sector) {
    sectorSelect.value = importedMetadata.sector;
    updateSectorHint();
  }

  // Reset current state
  document.querySelectorAll("input[type='radio']").forEach(input => {
    input.checked = false;
    input.disabled = false;
  });
  lockedActions.clear();

  // Parse and apply data
  let importCount = 0;
  let lockCount = 0;

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 6) continue;

    const actionCode = parts[1];
    const selectedLevel = parts[3];
    const isLocked = parts[5];

    if (selectedLevel) {
      const radio = document.querySelector(`input[name="${actionCode}"][value="${selectedLevel}"]`);
      if (radio) {
        radio.checked = true;
        importCount++;

        // Trigger change event to update notes
        const event = new Event('change');
        radio.dispatchEvent(event);
      }
    }

    if (isLocked === 'Yes') {
      lockedActions.add(actionCode);
      updateLockState(actionCode, true);
      lockCount++;
    }
  }

  updateResults();
  
  alert(`Import successful!\n${importCount} actions imported.\n${lockCount} actions locked.`);
}

/**
 * Escape CSV values
 */
function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Parse CSV value (remove quotes if present)
 */
function parseCSVValue(value) {
  if (!value) return '';
  value = value.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(v => parseCSVValue(v));
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30);
}

// Attach event listeners
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', exportToCSV);
}

if (importCsvBtn) {
  importCsvBtn.addEventListener('click', () => {
    csvFileInput.click();
  });
}

if (csvFileInput) {
  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importFromCSV(file);
      // Reset input so same file can be imported again
      e.target.value = '';
    }
  });
}

init();
