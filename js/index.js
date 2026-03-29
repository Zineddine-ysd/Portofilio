import { supabase } from "./supabaseClient.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

function setMsg(el, text, tone) {
  el.textContent = text;
  el.classList.remove("ok", "bad");
  if (tone) el.classList.add(tone);
}

function chipColor(name) {
//culeurs predifinis
  const palettes = [
    { c: "#31f7ff", g: "rgba(49,247,255,.55)" },
    { c: "#7c5cff", g: "rgba(124,92,255,.55)" },
    { c: "#35ff8a", g: "rgba(53,255,138,.55)" },
    { c: "#ffcc33", g: "rgba(255,204,51,.45)" },
    { c: "#ff4d6d", g: "rgba(255,77,109,.45)" }
  ];
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

function renderChips(container, items, opts = {}) {
  container.innerHTML = "";
  for (const it of items) {
    const { c, g } = chipColor(it.name ?? it.title ?? it.slug ?? it.id);
    const el = document.createElement("div");
    el.className = "chip";
    el.innerHTML = `<i style="background:${c}; box-shadow:0 0 25px ${g}"></i>${escapeHtml(it.name ?? it.title ?? "")}`;
    if (opts.onClick) el.addEventListener("click", () => opts.onClick(it));
    container.appendChild(el);
  }
}
//Reccuperation de toutes les donees via supbase 
async function loadAll() {
  const [projects, infoItems, languages, tools] = await Promise.all([
    supabase.from("projects").select("*").order("position", { ascending: true }),
    supabase.from("info_items").select("*").order("position", { ascending: true }),
    supabase.from("languages").select("*").order("position", { ascending: true }),
    supabase.from("tools").select("*").order("position", { ascending: true })
  ]);

  return { projects: projects.data ?? [], infoItems: infoItems.data ?? [], languages: languages.data ?? [], tools: tools.data ?? [] };
}

function groupInfo(infoItems) {
  const byType = {};
  for (const it of infoItems) {
    const t = it.type || "misc";
    if (!byType[t]) byType[t] = [];
    byType[t].push(it);
  }
  return byType;
}
//affichage des projets
function renderProjects(projects) {
  const box = $("#projects-list");
  box.innerHTML = "";
  for (const p of projects) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="meta">
        <span class="tag">Projet</span>
        ${p.position !== null && p.position !== undefined ? `<span>Pos: ${escapeHtml(p.position)}</span>` : `<span></span>`}
      </div>
      <div class="project-card">
        <div>
          <h4>${escapeHtml(p.title)}</h4>
          <div class="body">${escapeHtml(p.description || p.summary || "")}</div>
        </div>
        <div class="links">
          ${p.github_url ? `<a class="link" target="_blank" rel="noopener" href="${escapeHtml(p.github_url)}">GitHub</a>` : ""}
          ${p.live_url ? `<a class="link" target="_blank" rel="noopener" href="${escapeHtml(p.live_url)}">Live</a>` : ""}
        </div>
      </div>
    `;
    box.appendChild(el);
  }
}

function renderAbout(infoItems) {
  const { about, bio, contact, hero, education, experience } = groupInfo(infoItems);

  // Bio
  const bioItem = (bio && bio[0]) || (about && about[0]);
  $("#about-title").textContent = bioItem?.title || "";
  $("#about-body").textContent = bioItem?.body || bioItem?.description || "";

  // Listes des infos (education, experience...)
  const list = $("#about-list");
  list.innerHTML = "";
  const candidates = [
    ...(education || []),
    ...(experience || []),
    ...((about || []).slice(1))
  ];

  for (const it of candidates) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="meta">
        <span class="tag">${escapeHtml(it.type || "info")}</span>
        ${it.position !== null && it.position !== undefined ? `<span>Pos: ${escapeHtml(it.position)}</span>` : `<span></span>`}
      </div>
      <h4>${escapeHtml(it.title || "")}</h4>
      <div class="body">${escapeHtml(it.body || it.description || "")}</div>
    `;
    list.appendChild(el);
  }

  // Hero text
  const heroItem = (hero && hero[0]) || null;
  if (heroItem) {
    $("#hero-kicker").textContent = heroItem.kicker || "";
    $("#hero-title-main").textContent = heroItem.title_main || "";
    $("#hero-title-grad").textContent = heroItem.title_grad || "";
    $("#hero-subtitle").textContent = heroItem.subtitle || "";
  }

  // Contact
  const contactItem = (contact && contact[0]) || null;
  $("#contact-title").textContent = contactItem?.title || "";
  $("#contact-body").textContent = contactItem?.body || contactItem?.description || "";
  const links = [];
  // On accepte aussi des champs url dans la table via body/description non strict, donc on garde simple.
  if (contactItem?.github_url) links.push({ name: "GitHub", url: contactItem.github_url });
  if (contactItem?.live_url) links.push({ name: "Live", url: contactItem.live_url });
  const linksBox = $("#contact-links");
  linksBox.innerHTML = "";
  for (const l of links) {
    const chip = document.createElement("a");
    chip.className = "chip";
    chip.href = l.url;
    chip.target = "_blank";
    chip.rel = "noopener";
    const { c, g } = chipColor(l.name);
    chip.innerHTML = `<i style="background:${c}; box-shadow:0 0 25px ${g}"></i>${escapeHtml(l.name)}`;
    linksBox.appendChild(chip);
  }
}

function renderStats(projects, infoItems, languages, tools) {
  $("#stat-projects").textContent = String(projects.length);
  $("#stat-infos").textContent = String(infoItems.length);
  $("#stat-langs").textContent = String(languages.length);
  $("#stat-tools").textContent = String(tools.length);
}

async function run3dBackground() {
 //notre import 3d predefinis qui va etre affiche sur index.html
  const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  const container = $("#bg3d");
  if (!container) return;
  container.innerHTML = "";

  const canvasWrap = document.createElement("div");
  canvasWrap.style.position = "absolute";
  canvasWrap.style.inset = "0";
  container.appendChild(canvasWrap);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.2, 7.4);

  // Lumière douce
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  // Nuage de particules(les etoiles) CE CODE EST BEL ET BIEN PREDEFINIS JE VOULAIS FAIRE UN BEAU PORTOFILIO MAIS JE SUIS EN APPRENTISSAGE DU CODAGE 3D 
  const count = 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c1 = new THREE.Color("#31f7ff");
  const c2 = new THREE.Color("#7c5cff");
  const c3 = new THREE.Color("#35ff8a");

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const radius = 3.2 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi) * 0.9;
    const z = radius * Math.sin(phi) * Math.sin(theta);
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    const pick = Math.random();
    const col = pick < 0.5 ? c1 : pick < 0.8 ? c2 : c3;
    colors[idx] = col.r;
    colors[idx + 1] = col.g;
    colors[idx + 2] = col.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.08;
    points.rotation.x = t * 0.03 + mouseY * 0.05;
    camera.position.z = 7.4 + Math.sin(t * 0.5) * 0.25;
    camera.lookAt(0, 0, -1.2);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

async function main() {
  try {
    await run3dBackground();

    const { projects, infoItems, languages, tools } = await loadAll();

    renderStats(projects, infoItems, languages, tools);
    renderProjects(projects);
    renderAbout(infoItems);
    renderChips($("#langs"), languages);
    renderChips($("#tools"), tools);

 
    const chips = $("#chips");
    const merged = [...languages.slice(0, 7), ...tools.slice(0, 7)].filter(Boolean);
    renderChips(chips, merged, { onClick: null });
  } catch (e) {
    console.error(e);
   
    $("#about-body").textContent = "Erreur chargement Supabase.";
  }
}

main();

