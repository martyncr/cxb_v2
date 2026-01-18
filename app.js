/* CxB Cyber Governance Maturity Model */
/* this is version 1.1 of the app which includes action text notes for each of the 22 actions */


let modelData = null;
let radarChart = null;
let adminMode = false;
const lockedActions = new Set();

const modelContainer = document.getElementById("model-container");
const scoreSummaryEl = document.getElementById("score-summary");
const categoryBreakdownEl = document.getElementById("category-breakdown");
const recommendationsEl = document.getElementById("recommendations");
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

async function init() {
  const res = await fetch("modelData.json");
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
        <div class="action-title">${action.title}</div>
        <div>
          <span class="action-code">${action.code}</span>
          <span class="lock-toggle" data-code="${action.code}">🔓 unlock</span>
        </div>

      `;
      block.appendChild(actionMeta);


      // *************************************************
      const actionNotes = document.createElement("div");
      actionNotes.className = "action-textnote";
      actionNotes.innerHTML = `
        <div class="action-notes">${action.notes}</div>
      
      `;
      block.appendChild(actionNotes);


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
          (lvl, i) => `
        <label>
          <input type="radio" name="${action.code}" value="${i}">
          <strong>${i}:</strong> ${lvl}
        </label>`
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
          notesDiv.textContent = action.followOn[val] || "";
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
        const notesDiv = document.getElementById(`${action.code}-notes`);
        notesDiv.textContent = action.followOn[1];
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

init();
