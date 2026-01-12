/********************************************
 * CONFIGURATION
 ********************************************/
const repoOwner = "SaryaRi";
const repoName = "compteur-tricot";
const filePath = "data.json";
const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
let fileSha = null;

/********************************************
 * DÉTECTION ENVIRONNEMENT
 ********************************************/
const isExtension = typeof browser !== "undefined" && browser.storage;
const storage = {
  getToken() {
    if (isExtension) {
      return browser.storage.local.get("githubToken").then(r => r.githubToken || null);
    } else {
      return Promise.resolve(localStorage.getItem("githubToken"));
    }
  },
  setToken(token) {
    if (isExtension) {
      return browser.storage.local.set({ githubToken: token });
    } else {
      localStorage.setItem("githubToken", token);
      return Promise.resolve();
    }
  }
};

let token = null;

/********************************************
 * ÉLÉMENTS HTML
 ********************************************/
let countDisplay = document.getElementById("count");
let plusBtn = document.getElementById("plus");
let minusBtn = document.getElementById("minus");
let resetBtn = document.getElementById("reset");

let projectName = document.getElementById("project-name") || document.getElementById("projectName");
let editProjectBtn = document.getElementById("edit-project") || document.querySelector("[onclick='editProjectName()']");

let projectLink = document.getElementById("project-link") || document.getElementById("projectLink");
let editLinkBtn = document.getElementById("edit-link") || document.querySelector("[onclick='editProjectLink()']");

let historyContainer = document.getElementById("history");

/********************************************
 * CHARGER data.json DEPUIS GITHUB PAGES
 ********************************************/
async function loadData() {
  const url = `https://${repoOwner}.github.io/${repoName}/data.json`;

  try {
    const response = await fetch(url + "?cacheBust=" + Date.now());
    const data = await response.json();

    // Mise à jour interface
    if (countDisplay) countDisplay.textContent = data.count;
    if (projectName) projectName.textContent = data.projectName;
    if (projectLink) {
      projectLink.textContent = data.projectLink || "Aucun lien";
      projectLink.href = data.projectLink || "#";
    }

    if (historyContainer) {
      historyContainer.innerHTML = "";
      data.history.slice().reverse().forEach(entry => addHistoryEntry(entry));
    }

    return data;

  } catch (e) {
    console.error("Erreur chargement data.json :", e);
    return null;
  }
}

/********************************************
 * AJOUTER UNE ENTRÉE D'HISTORIQUE
 ********************************************/
function addHistoryEntry(text) {
  let div = document.createElement("div");
  div.className = "history-entry";
  div.textContent = text;
  historyContainer.prepend(div);
}

/********************************************
 * SAUVEGARDER data.json SUR GITHUB
 ********************************************/
async function saveData(newData) {
  if (!token) {
    token = prompt("Entre ton token GitHub");
    await storage.setToken(token);
  }

  const content = btoa(JSON.stringify(newData, null, 2));

  // Récupérer SHA du fichier
  const getFile = await fetch(apiUrl);
  const fileInfo = await getFile.json();
  fileSha = fileInfo.sha;

  // Envoyer mise à jour
  await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update data.json",
      content: content,
      sha: fileSha
    })
  });

  loadData();
}

/********************************************
 * ACTIONS
 ********************************************/
async function updateCount(delta) {
  const data = await loadData();
  if (!data) return;

  data.count += delta;

  const now = new Date();
  data.history.push(`${delta > 0 ? "+1" : "-1"} le ${now.toLocaleDateString()} à ${now.toLocaleTimeString()}`);

  saveData(data);
}

async function resetCount() {
  const data = await loadData();
  if (!data) return;

  data.count = 0;

  const now = new Date();
  data.history.push(`Reset le ${now.toLocaleDateString()} à ${now.toLocaleTimeString()}`);

  saveData(data);
}

async function editProjectName() {
  const data = await loadData();
  if (!data) return;

  const newName = prompt("Nom du projet :", data.projectName);
  if (newName) {
    data.projectName = newName;
    saveData(data);
  }
}

async function editProjectLink() {
  const data = await loadData();
  if (!data) return;

  const newLink = prompt("Lien du projet :", data.projectLink);
  if (newLink) {
    data.projectLink = newLink;
    saveData(data);
  }
}

/********************************************
 * INITIALISATION
 ********************************************/
storage.getToken().then(t => {
  token = t || null;
  loadData();
});
