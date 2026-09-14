const TOKEN_KEY = "netlify_pat";

const els = {
  drop: document.getElementById("state-drop"),
  name: document.getElementById("state-name"),
  success: document.getElementById("state-success"),
  loading: document.getElementById("state-loading"),
  settings: document.getElementById("state-settings"),
  domainInput: document.getElementById("domainInput"),
  tokenInput: document.getElementById("tokenInput"),
  tokenStatus: document.getElementById("tokenStatus"),
  publishBtn: document.getElementById("publishBtn"),
  liveLink: document.getElementById("liveLink"),
  successTitle: document.getElementById("successTitle"),
  successDesc: document.getElementById("successDesc"),
  loadingText: document.getElementById("loadingText"),
};

let uploadedFiles = [];

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function updateTokenStatus() {
  const t = getToken();
  els.tokenStatus.textContent = t
    ? "✅ Đã có Token → sẽ tự động deploy"
    : "⚠️ Chưa có Token → chỉ tạo ZIP (bấm ⚙️ để thêm)";
}

updateTokenStatus();

// Settings
document.getElementById("settingsBtn").onclick = () => {
  hideAll();
  els.settings.classList.remove("hidden");
  els.tokenInput.value = getToken();
};
document.getElementById("saveToken").onclick = () => {
  const t = els.tokenInput.value.trim();
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
  updateTokenStatus();
  hideAll();
  els.drop.classList.remove("hidden");
  alert(t ? "Đã lưu Token!" : "Đã xóa Token");
};
document.getElementById("clearToken").onclick = () => {
  localStorage.removeItem(TOKEN_KEY);
  els.tokenInput.value = "";
  updateTokenStatus();
};
document.getElementById("backFromSettings").onclick = () => {
  hideAll();
  els.drop.classList.remove("hidden");
};

function hideAll() {
  [els.drop, els.name, els.success, els.loading, els.settings].forEach(e => e.classList.add("hidden"));
}

// File select
document.getElementById("fileInput").onchange = e => {
  if (e.target.files.length) handleFiles([...e.target.files]);
};
document.getElementById("folderInput").onchange = e => {
  if (e.target.files.length) handleFiles([...e.target.files]);
};
document.getElementById("exampleBtn").onclick = () => {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site mẫu</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;text-align:center}h1{font-size:2rem}</style></head>
<body><div><h1>Xin chào!</h1><p>Deploy thành công từ Free Drop</p></div></body></html>`;
  const f = new File([html], "index.html", { type: "text/html" });
  handleFiles([f]);
};

function handleFiles(files) {
  uploadedFiles = files;
  let name = (files[0].name || "mysite").replace(/\.[^/.]+$/, "").toLowerCase()
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "mysite";
  els.domainInput.value = name;
  hideAll();
  els.name.classList.remove("hidden");
  els.domainInput.focus();
}

els.domainInput.oninput = () => {
  els.domainInput.value = els.domainInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
};
els.domainInput.onkeypress = e => { if (e.key === "Enter") startDeploy(); };
els.publishBtn.onclick = startDeploy;

document.getElementById("openSite").onclick = () => {
  if (els.liveLink.href) window.open(els.liveLink.href, "_blank");
};

async function startDeploy() {
  let name = els.domainInput.value.trim() || "mysite";
  if (name.length < 2) return alert("Tên quá ngắn");

  hideAll();
  els.loading.classList.remove("hidden");
  els.loadingText.textContent = "Đang tạo ZIP...";

  try {
    await loadJSZip();
    const zipBlob = await buildZip();

    const token = getToken();
    if (token) {
      els.loadingText.textContent = "Đang upload lên Netlify...";
      const result = await deployToNetlify(token, name, zipBlob);
      showSuccess(result.url, "Đã deploy công khai!", "Link của bạn:");
    } else {
      // Fallback: download zip
      downloadBlob(zipBlob, name + ".zip");
      showSuccess("https://app.netlify.com/drop", "Chưa có Token", "Hãy kéo file ZIP vừa tải vào Netlify Drop:");
    }
  } catch (err) {
    alert("Lỗi: " + err.message);
    hideAll();
    els.name.classList.remove("hidden");
  }
}

function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Không tải được JSZip"));
    document.head.appendChild(s);
  });
}

async function buildZip() {
  const zip = new JSZip();
  for (const file of uploadedFiles) {
    const path = file.webkitRelativePath || file.name;
    zip.file(path, file);
  }
  const hasIndex = uploadedFiles.some(f => (f.webkitRelativePath || f.name).toLowerCase().endsWith("index.html"));
  if (!hasIndex && uploadedFiles.length === 1 && uploadedFiles[0].name.match(/\.html?$/i)) {
    zip.file("index.html", uploadedFiles[0]);
  }
  return await zip.generateAsync({ type: "blob" });
}

async function deployToNetlify(token, name, zipBlob) {
  // 1. Create site with desired name
  let siteId = null;
  let siteUrl = null;

  try {
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: name })
    });

    if (createRes.ok) {
      const site = await createRes.json();
      siteId = site.id || site.site_id;
      siteUrl = site.ssl_url || site.url;
    } else {
      // Name taken → create without name
      const createRes2 = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      if (!createRes2.ok) throw new Error("Không tạo được site. Kiểm tra Token.");
      const site = await createRes2.json();
      siteId = site.id || site.site_id;
      siteUrl = site.ssl_url || site.url;
    }
  } catch (e) {
    throw new Error("Lỗi tạo site: " + e.message);
  }

  // 2. Deploy ZIP
  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/zip"
    },
    body: zipBlob
  });

  if (!deployRes.ok) {
    const errText = await deployRes.text();
    throw new Error("Deploy thất bại: " + errText.slice(0, 100));
  }

  const deploy = await deployRes.json();
  // Prefer the site URL
  return {
    url: siteUrl || deploy.ssl_url || deploy.url || `https://${name}.netlify.app`
  };
}

function showSuccess(url, title, desc) {
  hideAll();
  els.success.classList.remove("hidden");
  els.successTitle.textContent = title;
  els.successDesc.textContent = desc;
  els.liveLink.textContent = url;
  els.liveLink.href = url;
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
