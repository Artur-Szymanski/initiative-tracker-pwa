const STATE_KEY = "dnd-initiative-tracker-state-v5";
const LEGACY_KEY = "dnd-initiative-tracker-v4";

const TYPE_OPTIONS = {
  player: { label: "Gracz", icon: "🧙" },
  enemy: { label: "Wróg", icon: "👹" },
  boss: { label: "Boss", icon: "💀" },
  npc: { label: "NPC / Sojusznik", icon: "🛡️" }
};

const DEFAULT_COMBATANTS = [
  { id: "pc-1", name: "Meepo", type: "player", icon: "🗡️", initiative: 0, armorClass: 20, isDead: false, isDefault: true, isDraft: false, tieOrder: 1, createdAt: 1 },
  { id: "pc-2", name: "Ariah", type: "player", icon: "🛡️", initiative: 0, armorClass: 20, isDead: false, isDefault: true, isDraft: false, tieOrder: 2, createdAt: 2 },
  { id: "pc-3", name: "Tulia", type: "player", icon: "🏹", initiative: 0, armorClass: 20, isDead: false, isDefault: true, isDraft: false, tieOrder: 3, createdAt: 3 },
  { id: "pc-4", name: "Mannon", type: "player", icon: "⚡", initiative: 0, armorClass: 20, isDead: false, isDefault: true, isDraft: false, tieOrder: 4, createdAt: 4 }
];

const listElement = document.querySelector("#combatantList");
const addButton = document.querySelector("#addButton");
const resetButton = document.querySelector("#resetButton");
const roundNumberElement = document.querySelector("#roundNumber");
const emptyTemplate = document.querySelector("#emptyTemplate");

let state = createDefaultState();
let editingId = null;

function createDefaultState() {
  return {
    combatants: DEFAULT_COMBATANTS.map((combatant) => ({ ...combatant })),
    currentTurnId: null,
    roundNumber: 1,
    turnStarted: false
  };
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCombatant(combatant, index) {
  const type = TYPE_OPTIONS[combatant?.type] ? combatant.type : "enemy";
  return {
    id: String(combatant?.id ?? createId("combatant")),
    name: String(combatant?.name ?? "Bez nazwy"),
    type,
    icon: String(combatant?.icon ?? TYPE_OPTIONS[type].icon),
    initiative: safeNumber(combatant?.initiative, 0),
    armorClass: safeNumber(combatant?.armorClass, 20),
    isDead: Boolean(combatant?.isDead),
    isDefault: Boolean(combatant?.isDefault),
    isDraft: Boolean(combatant?.isDraft),
    tieOrder: safeNumber(combatant?.tieOrder, index + 1),
    createdAt: safeNumber(combatant?.createdAt, Date.now() + index)
  };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const currentRaw = localStorage.getItem(STATE_KEY);

    if (currentRaw) {
      const parsed = JSON.parse(currentRaw);
      if (!parsed || !Array.isArray(parsed.combatants)) {
        throw new Error("Nieprawidłowy zapis stanu.");
      }
      state = {
        combatants: parsed.combatants.map(normalizeCombatant),
        currentTurnId: parsed.currentTurnId ? String(parsed.currentTurnId) : null,
        roundNumber: Math.max(1, safeNumber(parsed.roundNumber, 1)),
        turnStarted: Boolean(parsed.turnStarted)
      };
    } else {
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacyCombatants = JSON.parse(legacyRaw);
        if (!Array.isArray(legacyCombatants)) {
          throw new Error("Nieprawidłowy zapis starszej wersji.");
        }
        state = {
          combatants: legacyCombatants.map(normalizeCombatant),
          currentTurnId: null,
          roundNumber: 1,
          turnStarted: false
        };
      } else {
        state = createDefaultState();
      }
    }

    const draft = state.combatants.find((combatant) => combatant.isDraft && !combatant.isDead);
    editingId = draft?.id ?? null;
  } catch (error) {
    console.error(error);
    state = createDefaultState();
    editingId = null;
  }

  saveState();
}

function getCombatant(id) {
  return state.combatants.find((combatant) => combatant.id === id);
}

function getTurnOrder() {
  return state.combatants
    .filter((combatant) => !combatant.isDead && !combatant.isDraft)
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (a.tieOrder !== b.tieOrder) return a.tieOrder - b.tieOrder;
      return a.createdAt - b.createdAt;
    });
}

function getDisplayOrder() {
  const drafts = state.combatants
    .filter((combatant) => !combatant.isDead && combatant.isDraft)
    .sort((a, b) => b.createdAt - a.createdAt);
  return [...drafts, ...getTurnOrder()];
}

function normalizeTieOrders() {
  const groups = new Map();
  for (const combatant of state.combatants.filter((item) => !item.isDead && !item.isDraft)) {
    if (!groups.has(combatant.initiative)) groups.set(combatant.initiative, []);
    groups.get(combatant.initiative).push(combatant);
  }

  for (const group of groups.values()) {
    group
      .sort((a, b) => a.tieOrder - b.tieOrder || a.createdAt - b.createdAt)
      .forEach((combatant, index) => {
        combatant.tieOrder = index + 1;
      });
  }
}

function setTieOrderToEndOfGroup(combatant) {
  const sameInitiative = state.combatants.filter(
    (item) => !item.isDead && !item.isDraft && item.id !== combatant.id && item.initiative === combatant.initiative
  );
  const maxOrder = sameInitiative.reduce(
    (max, item) => Math.max(max, safeNumber(item.tieOrder, 0)),
    0
  );
  combatant.tieOrder = maxOrder + 1;
}

function ensureCurrentTurn() {
  const order = getTurnOrder();
  if (!order.length) {
    state.currentTurnId = null;
    state.roundNumber = 1;
    state.turnStarted = false;
    return;
  }

  const currentStillExists = order.some((combatant) => combatant.id === state.currentTurnId);
  if (!state.turnStarted || !currentStillExists) {
    state.currentTurnId = order[0].id;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createNumberStepper(label, value, action, id) {
  return `
    <div class="field">
      <label>${label}</label>
      <div class="stepper">
        <button class="step-button" type="button" data-action="${action}" data-id="${id}" data-delta="-5">−5</button>
        <button class="step-button" type="button" data-action="${action}" data-id="${id}" data-delta="-1">−</button>
        <span class="number-display">${value}</span>
        <button class="step-button" type="button" data-action="${action}" data-id="${id}" data-delta="1">+</button>
        <button class="step-button" type="button" data-action="${action}" data-id="${id}" data-delta="5">+5</button>
      </div>
    </div>
  `;
}

function renderCombatantCard(combatant) {
  const card = document.createElement("article");
  const isEditing = editingId === combatant.id;
  const isCurrentTurn = !combatant.isDraft && combatant.id === state.currentTurnId;

  card.className = [
    "combatant-card",
    `type-${combatant.type}`,
    isCurrentTurn ? "is-current-turn" : "",
    combatant.isDraft ? "is-draft" : ""
  ].filter(Boolean).join(" ");
  card.dataset.id = combatant.id;

  const typeLabel = TYPE_OPTIONS[combatant.type]?.label ?? "Uczestnik";

  card.innerHTML = `
    <div class="card-main">
      <div class="initiative-box" aria-label="Inicjatywa">
        <span class="initiative-label">Init</span>
        <strong class="initiative-value">${combatant.initiative}</strong>
      </div>
      <div class="icon-box" aria-hidden="true">${combatant.icon}</div>
      <div class="combatant-info">
        <strong class="combatant-name">${escapeHtml(combatant.name)}</strong>
        <p class="combatant-meta">${typeLabel}${combatant.isDraft ? " · nowy" : ""}</p>
      </div>
      <div class="right-stack">
        ${isCurrentTurn ? `
          <button class="turn-next-button" type="button" data-action="next-turn"
            aria-label="Zakończ turę i przejdź do następnej postaci" title="Następna tura">➜</button>
        ` : ""}
        <div class="ac-badge">KP ${combatant.armorClass}</div>
      </div>
    </div>

    <div class="card-actions">
      <button class="small-button" type="button" data-action="toggle-edit" data-id="${combatant.id}">
        ${isEditing ? "Zwiń" : "Edytuj"}
      </button>
      <button class="danger-button" type="button" data-action="defeat" data-id="${combatant.id}">Pokonany</button>
    </div>
  `;

  if (isEditing) {
    const panel = document.createElement("div");
    panel.className = "edit-panel";
    panel.innerHTML = `
      <div class="field">
        <label for="name-${combatant.id}">Imię albo nazwa</label>
        <input id="name-${combatant.id}" class="text-input" type="text"
          value="${escapeHtml(combatant.name)}" data-action="name" data-id="${combatant.id}" autocomplete="off">
      </div>

      <div class="field">
        <label for="type-${combatant.id}">Typ</label>
        <select id="type-${combatant.id}" class="type-select" data-action="type" data-id="${combatant.id}">
          ${Object.entries(TYPE_OPTIONS).map(([value, option]) => `
            <option value="${value}" ${value === combatant.type ? "selected" : ""}>${option.label}</option>
          `).join("")}
        </select>
      </div>

      ${createNumberStepper("Inicjatywa", combatant.initiative, "initiative", combatant.id)}
      ${createNumberStepper("Klasa Pancerza", combatant.armorClass, "ac", combatant.id)}

      <div class="done-row">
        <button class="primary-button" type="button" data-action="done" data-id="${combatant.id}">Gotowe</button>
      </div>
    `;
    card.append(panel);
  }

  return card;
}

function render() {
  normalizeTieOrders();
  ensureCurrentTurn();

  const ordered = getDisplayOrder();
  listElement.innerHTML = "";
  roundNumberElement.textContent = String(state.roundNumber);

  if (!ordered.length) {
    listElement.append(emptyTemplate.content.cloneNode(true));
    saveState();
    return;
  }

  ordered.forEach((combatant, index) => {
    listElement.append(renderCombatantCard(combatant));

    const next = ordered[index + 1];
    const canSwapTie = !combatant.isDraft && next && !next.isDraft && next.initiative === combatant.initiative;
    if (canSwapTie) {
      const tieWrap = document.createElement("div");
      tieWrap.className = "tie-swap";
      tieWrap.innerHTML = `
        <button class="tie-button" type="button" data-action="swap-tie"
          data-first="${combatant.id}" data-second="${next.id}">↕ Zamień remis</button>
      `;
      listElement.append(tieWrap);
    }
  });

  saveState();
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
    numberDisplay.textContent = sourceButton.dataset.action === "initiative"
      ? combatant.initiative
      : combatant.armorClass;
  }
}

function changeInitiative(id, delta, sourceButton) {
  const combatant = getCombatant(id);
  if (!combatant) return;
  combatant.initiative = Math.max(-20, Math.min(99, combatant.initiative + delta));
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

function updateType(id, value, sourceElement) {
  const combatant = getCombatant(id);
  if (!combatant || !TYPE_OPTIONS[value]) return;

  combatant.type = value;
  combatant.icon = TYPE_OPTIONS[value].icon;

  const card = sourceElement?.closest(".combatant-card");
  if (card) {
    card.classList.remove("type-player", "type-enemy", "type-boss", "type-npc");
    card.classList.add(`type-${combatant.type}`);
    const iconBox = card.querySelector(".icon-box");
    const meta = card.querySelector(".combatant-meta");
    if (iconBox) iconBox.textContent = combatant.icon;
    if (meta) meta.textContent = TYPE_OPTIONS[value].label + (combatant.isDraft ? " · nowy" : "");
  }

  saveState();
}

function updateName(id, value, sourceElement) {
  const combatant = getCombatant(id);
  if (!combatant) return;
  combatant.name = value.trim() || "Bez nazwy";
  const nameElement = sourceElement?.closest(".combatant-card")?.querySelector(".combatant-name");
  if (nameElement) nameElement.textContent = combatant.name;
  saveState();
}

function finishEditing(id) {
  const combatant = getCombatant(id);
  if (!combatant) return;
  if (combatant.isDraft) combatant.isDraft = false;
  setTieOrderToEndOfGroup(combatant);
  editingId = null;
  render();
}

function addCombatant() {
  const id = createId("enemy");
  state.combatants.push({
    id,
    name: "Wróg",
    type: "enemy",
    icon: TYPE_OPTIONS.enemy.icon,
    initiative: 10,
    armorClass: 20,
    isDead: false,
    isDefault: false,
    isDraft: true,
    tieOrder: 999,
    createdAt: Date.now()
  });

  editingId = id;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function defeatCombatant(id) {
  const combatant = getCombatant(id);
  if (!combatant) return;

  const orderBefore = getTurnOrder();
  const currentIndex = orderBefore.findIndex((item) => item.id === state.currentTurnId);
  const defeatedWasCurrent = state.currentTurnId === id;
  const defeatedWasLast = defeatedWasCurrent && currentIndex === orderBefore.length - 1;

  combatant.isDead = true;
  combatant.isDraft = false;
  if (editingId === id) editingId = null;

  if (defeatedWasCurrent) {
    const orderAfter = getTurnOrder();
    if (!orderAfter.length) {
      state.currentTurnId = null;
      state.turnStarted = false;
      state.roundNumber = 1;
    } else if (defeatedWasLast) {
      state.currentTurnId = orderAfter[0].id;
      if (state.turnStarted) state.roundNumber += 1;
    } else {
      const nextFromPreviousOrder = orderBefore[currentIndex + 1];
      state.currentTurnId = orderAfter.find((item) => item.id === nextFromPreviousOrder?.id)?.id ?? orderAfter[0].id;
    }
  }

  render();
}

function resetEncounter() {
  const confirmed = confirm("Zresetować walkę i przywrócić domyślne postacie graczy?");
  if (!confirmed) return;
  state = createDefaultState();
  editingId = null;
  saveState();
  render();
}

function swapTie(firstId, secondId) {
  const first = getCombatant(firstId);
  const second = getCombatant(secondId);
  if (!first || !second || first.isDraft || second.isDraft || first.initiative !== second.initiative) return;

  const firstOrder = first.tieOrder;
  first.tieOrder = second.tieOrder;
  second.tieOrder = firstOrder;
  render();
}

function nextTurn() {
  const order = getTurnOrder();
  if (!order.length) return;

  const currentIndex = order.findIndex((combatant) => combatant.id === state.currentTurnId);
  state.turnStarted = true;

  if (currentIndex < 0) {
    state.currentTurnId = order[0].id;
  } else if (currentIndex === order.length - 1) {
    state.currentTurnId = order[0].id;
    state.roundNumber += 1;
  } else {
    state.currentTurnId = order[currentIndex + 1].id;
  }

  render();
  document.querySelector(".combatant-card.is-current-turn")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

listElement.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "toggle-edit") {
    if (editingId === id) {
      finishEditing(id);
    } else {
      editingId = id;
      render();
    }
  }

  if (action === "done") finishEditing(id);
  if (action === "defeat") defeatCombatant(id);
  if (action === "initiative") changeInitiative(id, safeNumber(button.dataset.delta, 0), button);
  if (action === "ac") changeArmorClass(id, safeNumber(button.dataset.delta, 0), button);
  if (action === "swap-tie") swapTie(button.dataset.first, button.dataset.second);
  if (action === "next-turn") nextTurn();
});

listElement.addEventListener("input", (event) => {
  const element = event.target;
  if (element.dataset.action === "name") updateName(element.dataset.id, element.value, element);
});

listElement.addEventListener("change", (event) => {
  const element = event.target;
  if (element.dataset.action === "type") updateType(element.dataset.id, element.value, element);
});

addButton.addEventListener("click", addCombatant);
resetButton.addEventListener("click", resetEncounter);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Nie udało się zarejestrować service workera:", error);
    });
  });
}

loadState();
render();
