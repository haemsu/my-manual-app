let manual = {};
let selectedItem = null;
const PASSWORD = "1234";

function login() {
  const pw = document.getElementById("password-input").value;
  if (pw === PASSWORD) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    alert("Wrong password!");
  }
}

function addItem() {
  const name = document.getElementById("new-item").value;
  if (name && !manual[name]) {
    manual[name] = "";
    updateList();
    document.getElementById("new-item").value = "";
  }
}

function updateList() {
  const list = document.getElementById("item-list");
  list.innerHTML = "";
  for (let key in manual) {
    const li = document.createElement("li");
    li.textContent = key;
    li.onclick = () => {
      selectedItem = key;
      document.getElementById("editor").innerHTML = manual[key];
    };
    list.appendChild(li);
  }
}

function saveContent() {
  if (selectedItem) {
    manual[selectedItem] = document.getElementById("editor").innerHTML;
    alert("저장됨!");
  }
}

async function fetchManual() {
  const token = document.getElementById("token").value;
  const user = document.getElementById("username").value;
  const repo = document.getElementById("repo").value;
  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/data/manual.json`);
  if (res.ok) {
    const data = await res.json();
    const content = atob(data.content);
    manual = JSON.parse(content);
    updateList();
    alert("불러오기 완료");
  } else {
    alert("불러오기 실패");
  }
}

async function saveManual() {
  const token = document.getElementById("token").value;
  const user = document.getElementById("username").value;
  const repo = document.getElementById("repo").value;
  const path = "data/manual.json";

  const res1 = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`);
  let sha = "";
  if (res1.ok) {
    const info = await res1.json();
    sha = info.sha;
  }

  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": "token " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update manual",
      content: btoa(JSON.stringify(manual)),
      sha: sha || undefined
    })
  });

  if (res.ok) {
    alert("저장 완료");
  } else {
    alert("저장 실패");
  }
}
