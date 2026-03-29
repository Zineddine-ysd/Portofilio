//ce code je l'ai deja utilise pour mon site ecommerce et je l'ai adapte pour mon portofilio, c'est un code d'admin pour gerer les projets et les infos du portofilio via une interface simple avec des formulaires et des tableaux, le tout en utilisant Supabase pour la gestion de la base de données et de l'authentification

import { supabase } from "./supabaseClient.js";
import { ADMIN_EMAIL } from "./config.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

function showMsg(el, text, tone) {
  el.style.display = "block";
  el.classList.remove("ok", "bad");
  if (tone) el.classList.add(tone);
  el.textContent = text;
}

function hideMsg(el) {
  el.style.display = "none";
  el.textContent = "";
  el.classList.remove("ok", "bad");
}

const state = {
  tab: "projects",
  editingId: null
};

function setTab(tab) {
  state.tab = tab;
  state.editingId = null;
  $("#cancelBtn").style.display = "none";
  $("#submitBtn").textContent = "Enregistrer";

  for (const t of $$(".tab")) {
    t.classList.toggle("active", t.dataset.tab === tab);
  }
  buildFormForTab(tab);
  refreshTable();
}

const tabToConfig = {
  projects: {
    title: "Projets",
    columnsForForm: ["title", "summary", "description", "github_url", "live_url", "position"],
    emptyEntity: () => ({
      title: "",
      summary: "",
      description: "",
      github_url: "",
      live_url: "",
      image_url: "",
      position: 0
    }),
    normalize: (row) => ({
      id: row.id,
      title: row.title ?? "",
      summary: row.summary ?? "",
      description: row.description ?? "",
      github_url: row.github_url ?? "",
      live_url: row.live_url ?? "",
      position: row.position ?? 0
    })
  },
  info_items: {
    title: "Infos",
    columnsForForm: ["type", "title", "body", "subtitle", "kicker", "title_main", "title_grad", "github_url", "live_url", "position"],
    emptyEntity: () => ({
      type: "about",
      title: "",
      body: "",
      subtitle: "",
      kicker: "",
      title_main: "Portfolio",
      title_grad: "dynamique",
      github_url: "",
      live_url: "",
      position: 0
    }),
    normalize: (row) => ({
      id: row.id,
      type: row.type ?? "about",
      title: row.title ?? "",
      body: row.body ?? "",
      subtitle: row.subtitle ?? "",
      kicker: row.kicker ?? "",
      title_main: row.title_main ?? "Portfolio",
      title_grad: row.title_grad ?? "dynamique",
      github_url: row.github_url ?? "",
      live_url: row.live_url ?? "",
      position: row.position ?? 0
    })
  },
  languages: {
    title: "Langages",
    columnsForForm: ["name", "position"],
    emptyEntity: () => ({ name: "", position: 0 }),
    normalize: (row) => ({ id: row.id, name: row.name ?? "", position: row.position ?? 0 })
  },
  tools: {
    title: "Outils",
    columnsForForm: ["name", "position"],
    emptyEntity: () => ({ name: "", position: 0 }),
    normalize: (row) => ({ id: row.id, name: row.name ?? "", position: row.position ?? 0 })
  }
};

function buildInput({ key, label, type = "text", placeholder = "" }) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = `field_${state.tab}_${key}`;
  wrap.innerHTML = `
    <label for="${id}">${escapeHtml(label)}</label>
    <input class="control" id="${id}" name="${key}" type="${type}" placeholder="${escapeHtml(placeholder)}" />
  `;
  return wrap;
}

function buildTextarea({ key, label, placeholder = "" }) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = `field_${state.tab}_${key}`;
  wrap.innerHTML = `
    <label for="${id}">${escapeHtml(label)}</label>
    <textarea class="control" id="${id}" name="${key}" placeholder="${escapeHtml(placeholder)}"></textarea>
  `;
  return wrap;
}

function buildSelect({ key, label, options = [] }) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = `field_${state.tab}_${key}`;
  const opts = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
  wrap.innerHTML = `
    <label for="${id}">${escapeHtml(label)}</label>
    <select class="control" id="${id}" name="${key}">
      ${opts}
    </select>
  `;
  return wrap;
}

function buildFormForTab(tab) {
  const cfg = tabToConfig[tab];
  const fields = $("#formFields");
  fields.innerHTML = "";
  hideMsg($("#formMsg"));

  // Layout: on met les champs dans un ordre simple.
  if (tab === "info_items") {
    fields.appendChild(buildSelect({
      key: "type",
      label: "Type",
      options: [
        { value: "hero", label: "hero (kicker/titre/sous-titre)" },
        { value: "about", label: "about" },
        { value: "bio", label: "bio" },
        { value: "education", label: "education" },
        { value: "experience", label: "experience" },
        { value: "contact", label: "contact" },
        { value: "misc", label: "misc" }
      ]
    }));
  }

  const colGroups = cfg.columnsForForm;
  for (const key of colGroups) {
    if (tab === "info_items" && key === "type") continue;

    if ((key === "description" || key === "body")) {
      fields.appendChild(buildTextarea({
        key,
        label: key === "description" ? "Description" : "Contenu",
        placeholder: key === "description" ? "Détails du projet..." : "Texte / paragraphes..."
      }));
      continue;
    }

    if (key === "summary") {
      fields.appendChild(buildTextarea({ key, label: "Résumé", placeholder: "Résumé court..." }));
      continue;
    }

    if (key === "position") {
      fields.appendChild(buildInput({ key, label: "Position (tri)", type: "number", placeholder: "0" }));
      continue;
    }

    if (key === "github_url" || key === "live_url" || key === "kicker" || key === "subtitle") {
      fields.appendChild(buildInput({ key, label: key.replaceAll("_", " "), placeholder: "" }));
      continue;
    }

    fields.appendChild(buildInput({ key, label: key.replaceAll("_", " "), placeholder: "" }));
  }

  
  const empty = cfg.emptyEntity();
  for (const key of cfg.columnsForForm) {
    const id = `field_${tab}_${key}`;
    const input = $(`#${id}`);
    if (!input) continue;
    input.value = empty[key] ?? "";
    if (input.tagName === "SELECT") input.value = empty[key] ?? input.value;
  }
}

function getFormValues(tab) {
  const cfg = tabToConfig[tab];
  const values = {};
  for (const key of cfg.columnsForForm) {
    const el = $(`#field_${tab}_${key}`);
    if (!el) continue;
    if (key === "position") values[key] = Number(el.value || 0);
    else values[key] = String(el.value || "");
  }
  // Normalize: allow empty URLs to be null on update/insert if needed
  for (const k of ["github_url", "live_url", "image_url", "summary", "description", "body", "subtitle", "kicker"]) {
    if (values[k] !== undefined && String(values[k]).trim() === "") values[k] = null;
  }
  return values;
}

function fillFormWithRow(tab, row) {
  const cfg = tabToConfig[tab];
  const values = cfg.normalize(row);
  for (const key of Object.keys(values)) {
    if (key === "id") continue;
    const el = $(`#field_${tab}_${key}`);
    if (!el) continue;
    if (el.tagName === "SELECT") el.value = values[key] ?? "";
    else el.value = values[key] === null || values[key] === undefined ? "" : String(values[key]);
  }
}

function actionsCell(tab, row) {
  const a = document.createElement("div");
  a.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-sm";
  editBtn.type = "button";
  editBtn.textContent = "Modifier";
  editBtn.addEventListener("click", () => {
    state.editingId = row.id;
    fillFormWithRow(tab, row);
    $("#formTitle").textContent = `Modifier - ${tabToConfig[tab].title}`;
    $("#cancelBtn").style.display = "inline-flex";
    $("#submitBtn").textContent = "Mettre à jour";
  });

  const delBtn = document.createElement("button");
  delBtn.className = "btn-sm danger";
  delBtn.type = "button";
  delBtn.textContent = "Supprimer";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`Supprimer cet élément de ${tabToConfig[tab].title} ?`)) return;
    const { error } = await supabase.from(tab).delete().eq("id", row.id);
    if (error) {
      showMsg($("#formMsg"), error.message, "bad");
      return;
    }
    showMsg($("#formMsg"), "Supprimé.", "ok");
    await refreshTable();
    // Reset edit mode
    state.editingId = null;
    $("#cancelBtn").style.display = "none";
    $("#submitBtn").textContent = "Enregistrer";
    $("#formTitle").textContent = `Ajouter - ${tabToConfig[tab].title}`;
    hideMsg($("#formMsg"));
  });

  a.appendChild(editBtn);
  a.appendChild(delBtn);
  return a;
}

function makeTable(tab, rows) {
  const box = $("#tableBox");
  box.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "help";
    empty.textContent = "Aucune donnée. Utilise le formulaire pour ajouter.";
    box.appendChild(empty);
    return;
  }

  const cfg = tabToConfig[tab];
  const head = document.createElement("div");
  head.className = "help";
  head.style.marginBottom = "6px";
  head.textContent = `Total: ${rows.length}`;
  box.appendChild(head);

  const table = document.createElement("table");
  table.className = "table";

  const columns = (() => {
    if (tab === "projects") return ["title", "summary", "github_url", "position"];
    if (tab === "info_items") return ["type", "title", "position"];
    return ["name", "position"];
  })();

  const thead = document.createElement("tr");
  thead.className = "thead";
  for (const c of columns) {
    const th = document.createElement("th");
    th.textContent = c.replaceAll("_", " ");
    thead.appendChild(th);
  }
  const thA = document.createElement("th");
  thA.textContent = "Actions";
  thead.appendChild(thA);
  table.appendChild(thead);

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.className = "trow";
    for (const c of columns) {
      const td = document.createElement("td");
      td.textContent = row[c] ?? "";
      td.style.verticalAlign = "top";
      tr.appendChild(td);
    }
    const tdA = document.createElement("td");
    tdA.style.width = "1px";
    tdA.appendChild(actionsCell(tab, row));
    tr.appendChild(tdA);
    table.appendChild(tr);
  }

  box.appendChild(table);
}

async function refreshTable() {
  const tab = state.tab;
  const { data, error } = await supabase.from(tab).select("*").order("position", { ascending: true });
  if (error) {
    showMsg($("#formMsg"), error.message, "bad");
    makeTable(tab, []);
    return;
  }
  makeTable(tab, data ?? []);
}

async function onLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

async function onSubmit(e) {
  e.preventDefault();
  const tab = state.tab;
  const cfg = tabToConfig[tab];

  const values = getFormValues(tab);

  const msg = $("#formMsg");
  hideMsg(msg);
  try {
    if (state.editingId) {
      const { error } = await supabase.from(tab).update(values).eq("id", state.editingId);
      if (error) throw error;
      showMsg(msg, "Mise à jour OK.", "ok");
    } else {
      const insertValues = { ...values };
      if (tab === "projects" && insertValues.position === null) insertValues.position = 0;
      const { error } = await supabase.from(tab).insert(insertValues);
      if (error) throw error;
      showMsg(msg, "Ajout OK.", "ok");
    }

    await refreshTable();
    // Reset mode
    state.editingId = null;
    $("#cancelBtn").style.display = "none";
    $("#submitBtn").textContent = "Enregistrer";
    $("#formTitle").textContent = `Ajouter - ${cfg.title}`;
    buildFormForTab(tab);
    setTimeout(() => hideMsg(msg), 2000);
  } catch (err) {
    const message = err?.message || String(err);
    showMsg(msg, message, "bad");
  }
}

async function bootstrapAuth() {
  // Auto-chargement session si l’auth est déjà en cours.
  const { data: { session } } = await supabase.auth.getSession();
  const adminUserEl = $("#admin-user");

  if (session?.user?.email) {
    adminUserEl.textContent = `Connecté: ${session.user.email}`;
    $("#loginBox").style.display = "none";
    $("#crudBox").style.display = "block";
    $("#logoutBtn").style.display = "inline-flex";
    $("#email").value = session.user.email;
    $("#logoutBtn").dataset.email = session.user.email;
    return true;
  }

  $("#loginBox").style.display = "block";
  $("#crudBox").style.display = "none";
  $("#logoutBtn").style.display = "none";

  $("#email").value = ADMIN_EMAIL;
  return false;
}

async function main() {
  $("#loginBtn").addEventListener("click", async () => {
    hideMsg($("#authMsg"));
    const email = $("#email").value.trim();
    const password = $("#password").value;
    if (!email || !password) return showMsg($("#authMsg"), "Email et mot de passe requis.", "bad");

    showMsg($("#authMsg"), "Connexion...", null);
    try {
      const res = await onLogin(email, password);
      if (!res.ok) throw res.error;
      $("#password").value = "";
      $("#authMsg").style.display = "none";
      $("#loginBox").style.display = "none";
      $("#crudBox").style.display = "block";
      $("#logoutBtn").style.display = "inline-flex";
      $("#admin-user").textContent = `Connecté: ${email}`;
      buildFormForTab(state.tab);
      refreshTable();
    } catch (err) {
      showMsg($("#authMsg"), err?.message || String(err), "bad");
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    $("#loginBox").style.display = "block";
    $("#crudBox").style.display = "none";
    $("#logoutBtn").style.display = "none";
    $("#admin-user").textContent = "";
    hideMsg($("#authMsg"));
    state.editingId = null;
    state.tab = "projects";
    setTab("projects");
  });

  for (const t of $$(".tab")) {
    t.addEventListener("click", () => setTab(t.dataset.tab));
  }

  $("#cancelBtn").addEventListener("click", () => {
    state.editingId = null;
    $("#cancelBtn").style.display = "none";
    $("#submitBtn").textContent = "Enregistrer";
    $("#formTitle").textContent = `Ajouter - ${tabToConfig[state.tab].title}`;
    buildFormForTab(state.tab);
    hideMsg($("#formMsg"));
  });

  $("#form").addEventListener("submit", onSubmit);

  await bootstrapAuth();

  if ($("#crudBox").style.display !== "none") {
    buildFormForTab(state.tab);
    refreshTable();
  } else {
    buildFormForTab(state.tab);
    setTab(state.tab);
  }
}

main().catch((e) => {
  console.error(e);
  showMsg($("#formMsg"), e?.message || String(e), "bad");
});

