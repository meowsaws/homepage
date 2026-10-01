const REPORT_KEY = "bmk-reports";
const ADMIN_PW = "asdf1234!";
const BUILDING_ROOMS = { "무한상상관": ["특수용접실", "복합용접실", "전기용접실"] };
const STATUS_LABEL = { new: "접수됨", progress: "수리중", done: "수리완료" };

let reports = [];
try { reports = JSON.parse(localStorage.getItem(REPORT_KEY)) || []; } catch (e) { reports = []; }
if (!Array.isArray(reports)) reports = [];

let adminMode = sessionStorage.getItem("bmk-admin") === "1";
let photoData = null;
let filterRoom = "";
let filterStatus = "";

const reportForm = document.getElementById("reportForm");
const repBuilding = document.getElementById("repBuilding");
const repRoom = document.getElementById("repRoom");
const repMachine = document.getElementById("repMachine");
const repDesc = document.getElementById("repDesc");
const repName = document.getElementById("repName");
const repPhoto = document.getElementById("repPhoto");
const photoPreview = document.getElementById("photoPreview");
const reportList = document.getElementById("reportList");
const filterRoomEl = document.getElementById("filterRoom");
const statusTabs = document.getElementById("statusTabs");
const adminBtn = document.getElementById("adminBtn");

Object.entries(BUILDING_ROOMS).forEach(([building, rooms]) => {
  rooms.forEach((room) => {
    const opt = document.createElement("option");
    opt.value = building + " " + room;
    opt.textContent = building + " " + room;
    filterRoomEl.appendChild(opt);
  });
});

function fillRoomOptions() {
  repRoom.innerHTML = '<option value="">실습실을 선택하세요</option>';
  (BUILDING_ROOMS[repBuilding.value] || []).forEach((room) => {
    const opt = document.createElement("option");
    opt.value = room;
    opt.textContent = room;
    repRoom.appendChild(opt);
  });
  repRoom.disabled = !repBuilding.value;
}

fillRoomOptions();
repBuilding.addEventListener("change", fillRoomOptions);

function roomLabel(r) {
  return [r.building, r.room].filter(Boolean).join(" ");
}

function saveReports() {
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(reports));
  } catch (e) {
    alert("저장 공간이 부족합니다. 사진이 많으면 오래된 신고를 삭제해 주세요.");
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function updateStats() {
  const count = (s) => reports.filter((r) => r.status === s).length;
  document.getElementById("statTotal").textContent = reports.length;
  document.getElementById("statNew").textContent = count("new");
  document.getElementById("statProgress").textContent = count("progress");
  document.getElementById("statDone").textContent = count("done");
}

function render() {
  const filtered = reports
    .filter((r) => (!filterRoom || roomLabel(r) === filterRoom) && (!filterStatus || r.status === filterStatus))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    reportList.innerHTML = '<div class="report-empty">해당하는 신고 내역이 없습니다.</div>';
  } else {
    reportList.innerHTML = filtered.map((r) => {
      const adminTools = adminMode
        ? `<div class="admin-tools">
            ${["new", "progress", "done"]
              .map((s) => `<button data-act="${s}" data-id="${r.id}"${r.status === s ? ' class="current"' : ""}>${STATUS_LABEL[s]}</button>`)
              .join("")}
            <button data-act="delete" data-id="${r.id}" class="danger">삭제</button>
          </div>`
        : "";
      return `<article class="report-item status-${r.status}">
        ${r.photo ? `<img class="report-photo" src="${r.photo}" alt="고장 사진">` : ""}
        <div class="report-body">
          <div class="report-head">
            <span class="badge badge-${r.status}">${STATUS_LABEL[r.status]}</span>
            <span class="report-room">${escapeHtml(roomLabel(r))}</span>
          </div>
          <h4>${escapeHtml(r.machine)}</h4>
          <p class="report-desc">${escapeHtml(r.desc)}</p>
          <div class="report-meta">
            ${r.reporter ? `<span>신고자 ${escapeHtml(r.reporter)}</span>` : ""}
            <span>${formatDate(r.createdAt)}</span>
          </div>
          ${adminTools}
        </div>
      </article>`;
    }).join("");
  }
  updateStats();
}

reportForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!repBuilding.value || !repRoom.value || !repMachine.value.trim() || !repDesc.value.trim()) {
    alert("건물, 실습실, 기계명, 고장 내용을 모두 입력해 주세요.");
    return;
  }
  reports.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    building: repBuilding.value,
    room: repRoom.value,
    machine: repMachine.value.trim(),
    desc: repDesc.value.trim(),
    reporter: repName.value.trim(),
    photo: photoData,
    status: "new",
    createdAt: new Date().toISOString()
  });
  saveReports();
  reportForm.reset();
  fillRoomOptions();
  photoData = null;
  photoPreview.innerHTML = "";
  filterStatus = "";
  filterRoom = "";
  filterRoomEl.value = "";
  statusTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.status === ""));
  render();
  alert("신고가 접수되었습니다. 선생님께서 확인 후 수리 진행 상황을 알려드립니다!");
});

repPhoto.addEventListener("change", async () => {
  const file = repPhoto.files[0];
  if (!file) return;
  photoData = await compressImage(file);
  photoPreview.innerHTML = `<img src="${photoData}" alt="첨부 사진 미리보기"><button type="button" class="photo-remove" id="photoRemove">첨부 사진 삭제</button>`;
});

photoPreview.addEventListener("click", (e) => {
  if (e.target.id !== "photoRemove") return;
  photoData = null;
  repPhoto.value = "";
  photoPreview.innerHTML = "";
});

statusTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  filterStatus = btn.dataset.status;
  statusTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

filterRoomEl.addEventListener("change", () => {
  filterRoom = filterRoomEl.value;
  render();
});

reportList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn || !adminMode) return;
  const id = btn.dataset.id;
  const report = reports.find((r) => r.id === id);
  if (!report) return;
  if (btn.dataset.act === "delete") {
    if (confirm("이 신고를 삭제할까요?")) {
      reports = reports.filter((r) => r.id !== id);
      saveReports();
      render();
    }
  } else {
    report.status = btn.dataset.act;
    saveReports();
    render();
  }
});

function updateAdminUi() {
  adminBtn.textContent = adminMode ? "관리자 모드 종료" : "관리자";
  adminBtn.classList.toggle("active", adminMode);
  render();
  renderSuggestions();
}

adminBtn.addEventListener("click", () => {
  if (adminMode) {
    adminMode = false;
    sessionStorage.removeItem("bmk-admin");
    updateAdminUi();
    return;
  }
  const pw = prompt("관리자 비밀번호를 입력하세요.");
  if (pw === null) return;
  if (pw === ADMIN_PW) {
    adminMode = true;
    sessionStorage.setItem("bmk-admin", "1");
    updateAdminUi();
  } else {
    alert("비밀번호가 올바르지 않습니다.");
  }
});

const SGT_KEY = "bmk-suggestions";
const SGT_STATUS_LABEL = { wait: "대기중", done: "확인완료" };

let suggestions = [];
try { suggestions = JSON.parse(localStorage.getItem(SGT_KEY)) || []; } catch (e) { suggestions = []; }
if (!Array.isArray(suggestions)) suggestions = [];

let sgtFilter = "";

const sgtForm = document.getElementById("sgtForm");
const sgtTitle = document.getElementById("sgtTitle");
const sgtBody = document.getElementById("sgtBody");
const sgtName = document.getElementById("sgtName");
const sgtList = document.getElementById("sgtList");
const sgtTabs = document.getElementById("sgtTabs");

function saveSuggestions() {
  try {
    localStorage.setItem(SGT_KEY, JSON.stringify(suggestions));
  } catch (e) {
    alert("저장 공간이 부족합니다.");
  }
}

function renderSuggestions() {
  const filtered = suggestions
    .filter((s) => !sgtFilter || s.status === sgtFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    sgtList.innerHTML = '<div class="report-empty">건의사항이 없습니다.</div>';
    return;
  }

  sgtList.innerHTML = filtered.map((s) => {
    const adminTools = adminMode
      ? `<div class="admin-tools">
          <button data-act="toggle" data-id="${s.id}">${s.status === "wait" ? "확인완료로 표시" : "대기중으로 되돌리기"}</button>
          <button data-act="delete" data-id="${s.id}" class="danger">삭제</button>
        </div>`
      : "";
    return `<article class="sgt-item status-${s.status}">
      <div class="sgt-head">
        <span class="badge badge-${s.status}">${SGT_STATUS_LABEL[s.status]}</span>
        <h4>${escapeHtml(s.title)}</h4>
      </div>
      <p class="report-desc">${escapeHtml(s.body)}</p>
      <div class="report-meta">
        ${s.name ? `<span>작성자 ${escapeHtml(s.name)}</span>` : "<span>익명</span>"}
        <span>${formatDate(s.createdAt)}</span>
      </div>
      ${adminTools}
    </article>`;
  }).join("");
}

sgtForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!sgtTitle.value.trim() || !sgtBody.value.trim()) {
    alert("제목과 내용을 모두 입력해 주세요.");
    return;
  }
  suggestions.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    title: sgtTitle.value.trim(),
    body: sgtBody.value.trim(),
    name: sgtName.value.trim(),
    status: "wait",
    createdAt: new Date().toISOString()
  });
  saveSuggestions();
  sgtForm.reset();
  renderSuggestions();
  alert("건의사항이 등록되었습니다. 감사합니다!");
});

sgtTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  sgtFilter = btn.dataset.status;
  sgtTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  renderSuggestions();
});

sgtList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn || !adminMode) return;
  const item = suggestions.find((s) => s.id === btn.dataset.id);
  if (!item) return;
  if (btn.dataset.act === "delete") {
    if (confirm("이 건의사항을 삭제할까요?")) {
      suggestions = suggestions.filter((s) => s.id !== btn.dataset.id);
      saveSuggestions();
      renderSuggestions();
    }
  } else {
    item.status = item.status === "wait" ? "done" : "wait";
    saveSuggestions();
    renderSuggestions();
  }
});

updateAdminUi();
