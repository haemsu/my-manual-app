
let token = "";
let data = {};
let currentKey = "";

const repo = "haemsu/my-manual.app";
const path = "data/manual.json";

document.getElementById("submit-token").onclick = async () => {
  token = document.getElementById("token-input").value;
  if (token) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-section").style.display = "flex";
    await loadManual();
  }
};

async function loadManual() {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  const json = await res.json();
  const content = atob(json.content);
  data = JSON.parse(content);
  refreshItemList();
}

function refreshItemList() {
  const list = document.getElementById("item-list");
  list.innerHTML = "";
  Object.keys(data).forEach(key => {
    const li = document.createElement("li");
    li.textContent = key;
    li.onclick = () => showContent(key);
    list.appendChild(li);
  });
}

function showContent(key) {
  currentKey = key;
  document.getElementById("viewer").style.display = "block";
  document.getElementById("editor").style.display = "none";
  document.getElementById("edit-button").style.display = "inline";
  document.getElementById("save-button").style.display = "none";
  document.getElementById("viewer").innerHTML = marked.parse(data[key]);
}

document.getElementById("add-item").onclick = () => {
  const name = prompt("항목 이름:");
  if (name && !data[name]) {
    data[name] = "";
    updateGitHub();
    refreshItemList();
  }
};

document.getElementById("edit-button").onclick = () => {
  document.getElementById("viewer").style.display = "none";
  document.getElementById("editor").style.display = "block";
  document.getElementById("edit-button").style.display = "none";
  document.getElementById("save-button").style.display = "inline";
  document.getElementById("editor").value = data[currentKey];
};

document.getElementById("save-button").onclick = () => {
  data[currentKey] = document.getElementById("editor").value;
  updateGitHub();
  showContent(currentKey);
};

async function updateGitHub() {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  const json = await res.json();
  const sha = json.sha;

  await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update manual",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      sha: sha
    })
  });
}
