const STORAGE_KEY = "dnd-initiative-tracker-v2";

const DEFAULT_COMBATANTS = [
  { id: "pc-1", name: "Meepo", type: "player", icon: "🗡️", initiative: 0, armorClass: 20, isDead: false, isDefault: true, tieOrder: 1, createdAt: 1 },
  { id: "pc-2", name: "Ariah", type: "player", icon: "🛡️", initiative: 0, armorClass: 20, isDead: false, isDefault: true, tieOrder: 2, createdAt: 2 },
  { id: "pc-3", name: "Tulia", type: "player", icon: "🏹", initiative: 0, armorClass: 20, isDead: false, isDefault: true, tieOrder: 3, createdAt: 3 },
  { id: "pc-4", name: "Mannon", type: "player", icon: "⚡", initiative: 0, armorClass: 20, isDead: false, isDefault: true, tieOrder: 4, createdAt: 4 }
];

const TYPE_OPTIONS = {
  player: { label: "Gracz", icon: "🧙" },
  enemy: { label: "Wróg", icon: "👹" },
  boss: { label: "Boss", icon: "💀" },
  npc: { label: "NPC / Sojusznik", icon: "🛡️" }
};

const listElement = document.querySelector("#combatantList");
const addButton = document.querySelector("#addButton");
const resetButton = document.querySelector("#resetButton");
const emptyTemplate = document.querySelector("#emptyTemplate");

let combatants = [];
let editingId = null;

function cloneDefaultCombatants() {
  return DEFAULT_COMBATANTS.map((combatant) => ({ ...combatant }));
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCombatant(raw, index) {
  const type = TYPE_OPTIONS[raw.type] ? raw.type : "enemy";

  return {
    id: String(raw.id ?? crypto.randomUUID?.() ?? `unit-${Date.now()}-${index}`),
    name: String(raw.name ?? "Bez nazwy"),
    type,
    icon: String(raw.icon ?? TYPE_OPTIONS[type].icon),
    initiative: safeNumber(raw.initiative, 0),
    armorClass: safeNumber(raw.armorClass, 10),
    isDead: Boolean(raw.isDead),
    isDefault: Boolean(raw.isDefault),
    tieOrder: safeNumber(raw.tieOrder, index + 1),
    createdAt: safeNumber(raw.createdAt, Date.now() + index)
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      combatants = cloneDefaultCombatants();
      saveState();
      return;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new Error("Saved state is not an array.");
    }

    combatants = parsed.map(normalizeCombatant);
    normalizeTieOrders();
  } catch (error) {
    console.error("Nie udało się wczytać zapisu:", error);
    combatants = cloneDefaultCombatants();
    saveState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(combatants));
}

function getCombatant(id) {
  return combatants.find((combatant) => combatant.id === id);
}

function getActiveCombatants() {
  return combatants
    .filter((combatant) => !combatant.isDead)
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (a.tieOrder !== b.tieOrder) return a.tieOrder - b.tieOrder;
      return a.createdAt - b.createdAt;
    });
}

function normalizeTieOrders() {
  const groups = new Map();

  for (const combatant of combatants.filter((item) => !item.isDead)) {
    const key = String(combatant.initiative);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(combatant);
  }

  for (const group of groups.values()) {
    group
      .sort((a, b) => {
        if (a.tieOrder !== b.tieOrder) return a.tieOrder - b.tieOrder;
        return a.createdAt - b.createdAt;
      })
      .forEach((combatant, index) => {
        combatant.tieOrder = index + 1;
      });
  }
}

function setTieOrderToEndOfGroup(combatant) {
  const sameInitiative = combatants.filter(
    (item) => !item.isDead && item.id !== combatant.id && item.initiative === combatant.initiative
  );
  const maxTieOrder = sameInitiative.reduce((max, item) => Math.max(max, item.tieOrder), 0);
  combatant.tieOrder = maxTieOrder + 1;
}

function typeLabel(type) {
  return TYPE_OPTIONS[type]?.label ?? "Wróg";
}

function optionMarkup(selectedType) {
  return Object.entries(TYPE_OPTIONS)
    .map(([value, option]) => `<option value="${value}" ${value === selectedType ? "selected" : ""}>${option.icon} ${option.label}</option>`)
    .join("");
}

function createCombatantCard(combatant) {
  const isEditing = combatant.id === editingId;
  const type = TYPE_OPTIONS[combatant.type] ?? TYPE_OPTIONS.enemy;
  const card = document.createElement("article");
  card.className = `combatant-card type-${combatant.type}`;
  card.dataset.id = combatant.id;

  card.innerHTML = `
    <div class="card-main">
      <div class="initiative-box" aria-label="Inicjatywa">
        <span class="initiative-label">INI</span>
        <strong class="initiative-value">${combatant.initiative}</strong>
      </div>
      <div class="icon-box" aria-hidden="true">${combatant.icon || type.icon}</div>
      <div>
        <h2 class="combatant-name">${escapeHtml(combatant.name)}</h2>
        <p class="combatant-meta">${type.label}</p>
      </div>
      <div class="ac-badge">KP ${combatant.armorClass}</div>
    </div>
    <div class="card-actions">
      <button class="small-button" type="button" data-action="edit" data-id="${combatant.id}">${isEditing ? "Zamknij edycję" : "Edytuj"}</button>
      <button class="danger-button" type="button" data-action="defeat" data-id="${combatant.id}">Pokonany</button>
    </div>
    ${isEditing ? editPanelMarkup(combatant) : ""}
  `;

  return card;
}

function editPanelMarkup(combatant) {
  return `
    <section class="edit-panel" aria-label="Edycja kafelka">
      <div class="form-grid">
        <div class="field">
          <label for="name-${combatant.id}">Imię lub nazwa</label>
          <input id="name-${combatant.id}" class="text-input" type="text" value="${escapeAttribute(combatant.name)}" data-action="name" data-id="${combatant.id}" autocomplete="off">
        </div>
        <div class="field">
          <label for="type-${combatant.id}">Typ</label>
          <select id="type-${combatant.id}" class="select-input" data-action="type" data-id="${combatant.id}">
            ${optionMarkup(combatant.type)}
          </select>
        </div>
      </div>

      <div class="field">
        <label>Inicjatywa</label>
        <div class="stepper">
          <button class="step-button" type="button" data-action="initiative" data-delta="-5" data-id="${combatant.id}">−5</button>
          <button class="step-button" type="button" data-action="initiative" data-delta="-1" data-id="${combatant.id}">−</button>
          <span class="number-display">${combatant.initiative}</span>
          <button class="step-button" type="button" data-action="initiative" data-delta="1" data-id="${combatant.id}">+</button>
          <button class="step-button" type="button" data-action="initiative" data-delta="5" data-id="${combatant.id}">+5</button>
        </div>
      </div>

      <div class="field">
        <label>Klasa Pancerza</label>
        <div class="stepper">
          <button class="step-button" type="button" data-action="ac" data-delta="-5" data-id="${combatant.id}">−5</button>
          <button class="step-button" type="button" data-action="ac" data-delta="-1" data-id="${combatant.id}">−</button>
          <span class="number-display">${combatant.armorClass}</span>
          <button class="step-button" type="button" data-action="ac" data-delta="1" data-id="${combatant.id}">+</button>
          <button class="step-button" type="button" data-action="ac" data-delta="5" data-id="${combatant.id}">+5</button>
        </div>
      </div>

      <div class="edit-actions">
        <button class="done-button" type="button" data-action="done" data-id="${combatant.id}">Gotowe</button>
      </div>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function render() {
  normalizeTieOrders();
  const active = getActiveCombatants();
  listElement.innerHTML = "";

  if (!active.length) {
    listElement.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  active.forEach((combatant, index) => {
    listElement.append(createCombatantCard(combatant));

    const next = active[index + 1];
    if (next && next.initiative === combatant.initiative) {
      const row = document.createElement("div");
      row.className = "tie-swap-row";
      row.innerHTML = `
        <button class="tie-button" type="button" data-action="swap" data-first-id="${combatant.id}" data-second-id="${next.id}">
          ↕ Zamień remis
        </button>
      `;
      listElement.append(row);
    }
  });
}

function addEnemy() {
  const count = combatants.filter((combatant) => combatant.type === "enemy" || combatant.type === "boss").length + 1;
  const combatant = {
    id: crypto.randomUUID?.() ?? `unit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Wróg ${count}`,
    type: "enemy",
    icon: TYPE_OPTIONS.enemy.icon,
    initiative: 10,
    armorClass: 20,
    isDead: false,
    isDefault: false,
    tieOrder: 1,
    createdAt: Date.now()
  };
  setTieOrderToEndOfGroup(combatant);
  combatants.push(combatant);
  editingId = combatant.id;
  saveState();
  render();
}

function resetCombat() {
  const confirmed = window.confirm("Zresetować walkę? Dodani przeciwnicy znikną, a postacie graczy wrócą do wartości startowych.");
  if (!confirmed) return;

  combatants = cloneDefaultCombatants();
  editingId = null;
  saveState();
  render();
}

function defeatCombatant(id) {
  const combatant = getCombatant(id);
  if (!combatant) return;

  combatant.isDead = true;
  if (editingId === id) editingId = null;
  saveState();
  render();
}

function updateNumberDisplays(sourceButton, combatant) {
  const card = sourceButton?.closest(".combatant-card");
  const stepper = sourceButton?.closest(".stepper");

  if (!card || !stepper) return;

  const initiativeValue = card.querySelector(".initiative-value");
  const armorClassBadge = card.querySelector(".ac-badge");
  const numberDisplay = stepper.querySelector(".number-display");

  if (initiativeValue) initiativeValue.textContent = combatant.initiative;
  if (armorClassBadge) armorClassBadge.textContent = `KP ${combatant.armorClass}`;
  if (numberDisplay) {
    const action = sourceButton.dataset.action;
    numberDisplay.textContent = action === "initiative" ? combatant.initiative : combatant.armorClass;
  }
}

function changeInitiative(id, delta, sourceButton) {
  const combatant = getCombatant(id);
  if (!combatant) return;

  combatant.initiative = Math.max(-20, Math.min(99, combatant.initiative + delta));
  setTieOrderToEndOfGroup(combatant);
  saveState();
  updateNumberDisplays(sourceButton, combatant);
}

function changeArmorClass(id, delta, sourceButton) {
  const combatant = getCombatant(id);
  if (!combatant) return;

  combatant.armorClass = Math.max(0, Math.min(99, combatant.armorClass + delta));
  saveState();
  updateNumberDisplays(sourceButton, combatant);
}

function swapTieOrder(firstId, secondId) {
  const first = getCombatant(firstId);
  const second = getCombatant(secondId);
  if (!first || !second || first.initiative !== second.initiative) return;

  const temp = first.tieOrder;
  first.tieOrder = second.tieOrder;
  second.tieOrder = temp;
  saveState();
  render();
}

function updateType(id, value, sourceElement) {
  const combatant = getCombatant(id);
  if (!combatant || !TYPE_OPTIONS[value]) return;

  combatant.type = value;
  combatant.icon = TYPE_OPTIONS[value].icon;
  saveState();

  const card = sourceElement?.closest(".combatant-card");
  if (!card) return;

  card.className = `combatant-card type-${combatant.type}`;
  const iconBox = card.querySelector(".icon-box");
  const meta = card.querySelector(".combatant-meta");

  if (iconBox) iconBox.textContent = combatant.icon;
  if (meta) meta.textContent = TYPE_OPTIONS[value].label;
}

function updateName(id, value, sourceElement) {
  const combatant = getCombatant(id);
  if (!combatant) return;

  combatant.name = value.trim() || "Bez nazwy";
  saveState();

  const card = sourceElement?.closest(".combatant-card");
  const nameElement = card?.querySelector(".combatant-name");
  if (nameElement) nameElement.textContent = combatant.name;
}

listElement.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit") {
    editingId = editingId === id ? null : id;
    render();
  }

  if (action === "done") {
    editingId = null;
    render();
  }

  if (action === "defeat") defeatCombatant(id);
  if (action === "initiative") changeInitiative(id, safeNumber(button.dataset.delta, 0), button);
  if (action === "ac") changeArmorClass(id, safeNumber(button.dataset.delta, 0), button);
  if (action === "swap") swapTieOrder(button.dataset.firstId, button.dataset.secondId);
});

listElement.addEventListener("input", (event) => {
  const element = event.target;
  if (element.dataset.action === "name") updateName(element.dataset.id, element.value, element);
});

listElement.addEventListener("change", (event) => {
  const element = event.target;
  if (element.dataset.action === "type") updateType(element.dataset.id, element.value, element);
});

addButton.addEventListener("click", addEnemy);
resetButton.addEventListener("click", resetCombat);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Nie udało się zarejestrować service workera:", error);
    });
  });
}

loadState();
render();
