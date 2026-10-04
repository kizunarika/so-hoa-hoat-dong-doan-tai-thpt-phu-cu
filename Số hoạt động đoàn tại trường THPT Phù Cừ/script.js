import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ================================
    SUPABASE CONFIGURATION
   ================================ */
const SUPABASE_URL = "https://ebgcoiodnhblrvgeiocc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IjP5w6hRutIzHeOF9Ei8fg_Tw_HI6oU";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const activeWorkbooks = {};
const defaultTabDatasets = {};
const defaultWordDocs = {
  "tab-tong-quan": "Điều lệ đoàn TNCS Hồ Chí Minh",
};
const originalFileUrls = {};

window.showToast = function (message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const iconMap = {
    success: "fa-check-circle",
    warning: "fa-exclamation-triangle",
    error: "fa-times-circle",
    info: "fa-info-circle",
  };
  toast.innerHTML = `<i class="fas ${iconMap[type] || "fa-info-circle"}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

function sanitizeFileName(fileName) {
  if (!fileName) return "document";
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function restoreCustomTabs(mainTabId, tabsMetaArray) {
  const mainTab = document.getElementById(mainTabId);
  if (!mainTab) return;

  const sidebar = mainTab.querySelector(".sub-sidebar");
  const contentArea = mainTab.querySelector(".sub-content-area");
  if (!sidebar || !contentArea) return;

  tabsMetaArray.forEach((meta) => {
    if (sidebar.querySelector(`.sub-nav-item[data-view="${meta.uniqueId}"]`))
      return;

    // Render Nút Sidebar
    const newBtnHTML = `
      <button class="sub-nav-item" data-tab="${mainTabId}" data-view="${meta.uniqueId}">
          <i class="fas ${meta.icon}"></i>
          <div class="sub-nav-text">
              <span class="sub-nav-title">${meta.name}</span>
              <span class="sub-nav-desc">${meta.desc}</span>
          </div>
          <div class="tab-edit-controls" style="display: none;">
              <span class="control-btn btn-move-up" title="Lên" style="display: none;"><i class="fas fa-arrow-up"></i></span>
              <span class="control-btn btn-move-down" title="Xuống" style="display: none;"><i class="fas fa-arrow-down"></i></span>
              <span class="control-btn btn-delete-tab" title="Xoá" style="display: none;"><i class="fas fa-times"></i></span>
          </div>
      </button>`;
    sidebar.insertAdjacentHTML("beforeend", newBtnHTML);

    let viewerContent = "";
    let actionToolbarHTML = "";
    const panelId = `${mainTabId}-view-${meta.uniqueId}`;

    // ==========================================
    // KHỐI 1: EXCEL VÀ GOOGLE SHEET SỬ DỤNG CHUNG GIAO DIỆN CÔNG CỤ
    // ==========================================
    if (meta.type === "excel" || meta.type === "ggsheet") {
      viewerContent = `
        <div class="excel-viewer">
            <div class="sheet-nav-wrapper">
                <button class="scroll-btn left"><i class="fas fa-chevron-left"></i></button>
                <div class="sheet-tabs-container"></div>
                <button class="scroll-btn right"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="table-responsive"></div>
        </div>`;

      actionToolbarHTML = `
          <div class="action-toolbar">
              <button class="btn admin-only toggle-edit-btn" data-tab="${panelId}" style="background-color: #f59e0b; color: white; border: none; border-radius: 5px; cursor: pointer; padding: 8px 15px;">
                  <i class="fas fa-edit"></i> <span>Chỉnh Sửa</span>
              </button>
              <button class="btn add-row-btn admin-only" data-tab="${panelId}" style="display: none; background-color: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; padding: 8px 15px;">
                  <i class="fas fa-plus"></i> Thêm Hàng
              </button>
              <button class="btn btn-primary save-excel-btn admin-only" data-tab="${panelId}" style="display: none; padding: 8px 15px;">
                  <i class="fas fa-save"></i> Lưu Dữ Liệu
              </button>
              <label class="btn btn-excel admin-only">
                  <i class="fas fa-cloud-arrow-up"></i> Tải Lên Excel
                  <input type="file" class="excel-upload-input custom-upload" data-tab="${panelId}" accept=".xlsx, .xls, .csv" style="display: none;">
              </label>
              ${meta.isDownloadable ? `<button class="btn btn-secondary export-btn" data-tab="${panelId}"><i class="fas fa-download"></i> Xuất Dữ Liệu</button>` : ""}
          </div>`;
    }
    // ==========================================
    // KHỐI 2: WORD VÀ PDF
    // ==========================================
    else {
      if (meta.type === "word") {
        viewerContent = `<div class="word-viewer-card word-viewer-container" data-tab="${panelId}"></div>`;
        actionToolbarHTML = `
          <div class="action-toolbar">
              <label class="btn btn-word admin-only">
                  <i class="fas fa-cloud-arrow-up"></i> Tải Lên Word
                  <input type="file" class="word-upload-input custom-upload" data-tab="${panelId}" accept=".docx" style="display: none;">
              </label>
              ${meta.isDownloadable ? `<button class="btn btn-secondary export-btn" data-tab="${panelId}"><i class="fas fa-download"></i> Tải Về</button>` : ""}
          </div>`;
      } else if (meta.type === "pdf") {
        viewerContent = `
          <div class="pdf-viewer-card pdf-viewer-container" data-tab="${panelId}">
              <iframe class="pdf-frame" src="" width="100%" height="650px" style="border:none;"></iframe>
          </div>`;
        actionToolbarHTML = `
          <div class="action-toolbar">
              <label class="btn btn-pdf admin-only">
                  <i class="fas fa-cloud-arrow-up"></i> Tải Lên PDF
                  <input type="file" class="pdf-upload-input custom-upload" data-tab="${panelId}" accept=".pdf" style="display: none;">
              </label>
              ${meta.isDownloadable ? `<button class="btn btn-secondary export-btn" data-tab="${panelId}"><i class="fas fa-download"></i> Tải Về PDF</button>` : ""}
          </div>`;
      }
    }

    const newPanelHTML = `
      <div class="view-panel view-${meta.uniqueId}" id="${panelId}">
          <div class="glass-panel">
              <div class="tab-header-banner">
                  <div class="tab-title-group">
                      <div class="tab-icon-box ${meta.typeClass}-icon"><i class="fas ${meta.icon}"></i></div>
                      <div>
                          <h2 class="tab-title">${meta.name.toUpperCase()}</h2>
                          <p class="tab-subtitle">${meta.subtitle || "Tài liệu trực tuyến"}</p>
                      </div>
                  </div>
                  ${actionToolbarHTML} 
              </div>
              ${viewerContent}
          </div>
      </div>`;

    contentArea.insertAdjacentHTML("beforeend", newPanelHTML);

    if (meta.type === "ggsheet" && meta.url && !activeWorkbooks[panelId]) {
      fetchAndRenderGoogleSheet(meta.url, panelId);
    }
  });
}

async function fetchAndRenderGoogleSheet(sheetUrl, viewPanelId) {
  const viewPanel = document.getElementById(viewPanelId);
  if (!viewPanel) return;

  const tableContainer = viewPanel.querySelector(".table-responsive");
  if (!tableContainer) return;

  tableContainer.innerHTML =
    '<div class="loading-message" style="padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu từ Google Sheets...</div>';

  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("Link Google Sheet không đúng định dạng!");
    const sheetId = match[1];

    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const response = await fetch(xlsxUrl);
    if (!response.ok)
      throw new Error(
        "Vui lòng mở quyền chia sẻ Google Sheet thành 'Bất kỳ ai có liên kết đều có thể xem'.",
      );

    const arrayBuffer = await response.arrayBuffer();
    if (typeof XLSX === "undefined")
      throw new Error("Thư viện XLSX chưa được tải.");

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetsData = {};

    workbook.SheetNames.forEach((sheetName) => {
      sheetsData[sheetName] = XLSX.utils.sheet_to_html(
        workbook.Sheets[sheetName],
        { id: "data-table", editable: false },
      );
    });

    activeWorkbooks[viewPanelId] = sheetsData;
    renderWorkbookFromData(viewPanelId, sheetsData);
  } catch (error) {
    console.error("Lỗi Google Sheet:", error);
    tableContainer.innerHTML = `
            <div class="error-message" style="padding: 20px; color: red;">
                <i class="fas fa-exclamation-triangle"></i><br>
                <b>Lỗi tải dữ liệu:</b> ${error.message}
            </div>`;
  }
}

async function renderWordFromUrl(tabId, fileUrl) {
  const containers = document.querySelectorAll(
    `.word-viewer-container[data-tab="${tabId}"]`,
  );
  if (containers.length === 0) return;

  // LUỒNG 1: Nếu file Word đã được chuyển đổi sang PDF -> Gọi trực tiếp renderPDF
  if (fileUrl.toLowerCase().includes(".pdf")) {
    await renderPDF(tabId, fileUrl);
    return;
  }

  // LUỒNG 2: Nếu là file .docx gốc chưa chuyển đổi -> Render qua docx-preview bọc giao diện A4
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Không thể tải file Word");
    const blob = await response.blob();

    if (typeof docx === "undefined") {
      throw new Error("Thư viện docx-preview chưa được tải.");
    }

    containers.forEach(async (container) => {
      container.innerHTML = `
        <div class="a4-pdf-wrapper">
          <div class="a4-page docx-a4-target" style="padding: 20px;"></div>
        </div>
      `;
      const targetDiv = container.querySelector(".docx-a4-target");

      await docx.renderAsync(blob, targetDiv, null, {
        className: "docx-viewer",
        inWrapper: false,
        ignoreFonts: false,
        breakPages: true,
        experimental: false,
      });
    });
  } catch (error) {
    console.error("Lỗi hiển thị Word cũ:", error);
    containers.forEach(
      (container) =>
        (container.innerHTML = `
          <p style="text-align: center; color: #ef4444; padding: 20px;">
            <i class="fas fa-exclamation-circle"></i> Lỗi hiển thị tài liệu Word.
          </p>`),
    );
  }
}

async function renderPDF(tabId, url) {
  // SỬA Ở ĐÂY: Thêm .word-viewer-container để có thể render cả file Word (sau khi đã chuyển sang PDF)
  const containers = document.querySelectorAll(
    `.pdf-viewer-container[data-tab="${tabId}"], .word-viewer-container[data-tab="${tabId}"]`,
  );
  if (containers.length === 0) return;

  // Cấu hình worker cho PDF.js
  if (
    typeof pdfjsLib !== "undefined" &&
    !pdfjsLib.GlobalWorkerOptions.workerSrc
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  containers.forEach(async (container) => {
    // 1. Reset container và thêm khung bao bọc (Wrapper)
    container.innerHTML = `
      <div class="a4-pdf-wrapper">
        <div class="pdf-loader">
          <div class="pdf-spinner"></div>
          <span>Đang tải tài liệu...</span>
        </div>
        <div class="a4-pdf-content" style="display: none; width: 100%; flex-direction: column; align-items: center;"></div>
      </div>
    `;

    const contentDiv = container.querySelector(".a4-pdf-content");
    const loaderDiv = container.querySelector(".pdf-loader");

    try {
      // 2. Tải file PDF
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // 3. Render từng trang
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Tính toán tỉ lệ zoom (Scale). Điều chỉnh scale (ví dụ: 1.5) để nét chữ rõ hơn
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        // Tạo thẻ div đại diện cho 1 trang A4
        const pageContainer = document.createElement("div");
        pageContainer.className = "a4-page";

        // Tạo thẻ canvas để vẽ PDF
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Tùy chỉnh style cho canvas để vừa vặn trong div (responsive)
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        pageContainer.appendChild(canvas);
        contentDiv.appendChild(pageContainer);

        // Render trang vào canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }

      // 4. Hoàn tất tải, ẩn loader và hiện nội dung
      loaderDiv.style.display = "none";
      // Sử dụng flex để kích hoạt flex-direction: column và align-items: center giúp trang giấy ở chính giữa
      contentDiv.style.display = "flex";
    } catch (error) {
      console.error("Lỗi khi render PDF:", error);
      container.innerHTML = `<div class="error-message" style="text-align: center; padding: 20px; color: red;">
          <i class="fas fa-exclamation-triangle"></i> Lỗi không thể tải hoặc hiển thị tài liệu.
      </div>`;
    }
  });
}
function renderWorkbookFromData(tabId, sheetsData) {
  const parentTab =
    document.getElementById(tabId) ||
    document.querySelector(`[data-tab="${tabId}"]`)?.closest(".view-panel");
  if (!parentTab) return;

  const sheetContainer = parentTab.querySelector(".sheet-tabs-container");
  const tableContainer = parentTab.querySelector(".table-responsive");
  if (!sheetContainer || !tableContainer) return;

  sheetContainer.innerHTML = "";
  const sheetNames = Object.keys(sheetsData);

  if (sheetNames.length === 0) {
    tableContainer.innerHTML =
      '<p style="padding: 20px; text-align: center; color: #64748b;">Chưa có dữ liệu.</p>';
    return;
  }

  activeWorkbooks[tabId] = sheetsData;

  sheetNames.forEach((sheetName, index) => {
    const btn = document.createElement("button");
    btn.className = "sheet-btn" + (index === 0 ? " active" : "");
    btn.innerHTML = `<i class="fas fa-table"></i> ${sheetName}`;

    btn.addEventListener("click", function () {
      parentTab
        .querySelectorAll(".sheet-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      renderSheetRows(sheetsData[sheetName], tableContainer);
    });

    sheetContainer.appendChild(btn);
  });

  renderSheetRows(sheetsData[sheetNames[0]], tableContainer);
}

function renderSheetRows(htmlContent, container) {
  if (!htmlContent) {
    container.innerHTML =
      '<p style="padding: 24px; color: #64748b; text-align: center;">Sheet này chưa có dữ liệu.</p>';
    return;
  }
  container.innerHTML = htmlContent;
  const table = container.querySelector("table");
  if (table) table.classList.add("excel-table");
}

/* ================================
    KHỞI TẠO SUPABASE & ĐỒNG BỘ
   ================================ */
async function initSupabaseSync() {
  try {
    let {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (!session) {
      await supabase.auth.signInAnonymously();
    }

    const { data: rows, error: selectError } = await supabase
      .from("tab_contents")
      .select("*");
    if (selectError) throw selectError;

    if (rows && rows.length > 0) {
      rows.forEach((row) => {
        if (row.sub_tabs_meta && Array.isArray(row.sub_tabs_meta)) {
          restoreCustomTabs(row.tab_id, row.sub_tabs_meta);
        }
      });

      rows.forEach((row) => {
        const tabId = row.tab_id;
        if (row.word_file_url) renderWordFromUrl(tabId, row.word_file_url);
        if (row.pdf_file_url) renderPDF(tabId, row.pdf_file_url);

        if (row.excel_sheets) {
          Object.keys(row.excel_sheets).forEach((panelId) => {
            activeWorkbooks[panelId] = row.excel_sheets[panelId];
            renderWorkbookFromData(panelId, row.excel_sheets[panelId]);
          });
        }

        if (row.excel_file_url) originalFileUrls[tabId] = row.excel_file_url;
        if (row.word_file_url) originalFileUrls[tabId] = row.word_file_url;
        if (row.pdf_file_url) originalFileUrls[tabId] = row.pdf_file_url;
      });
    }

    supabase
      .channel("tab-contents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tab_contents" },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new;
          if (!row || Object.keys(row).length === 0) return;

          if (row.sub_tabs_meta)
            restoreCustomTabs(row.tab_id, row.sub_tabs_meta);
          if (row.word_file_url)
            renderWordFromUrl(row.tab_id, row.word_file_url);
          if (row.excel_sheets) {
            Object.keys(row.excel_sheets).forEach((panelId) => {
              activeWorkbooks[panelId] = row.excel_sheets[panelId];
              renderWorkbookFromData(panelId, row.excel_sheets[panelId]);
            });
          }
          if (row.pdf_file_url) renderPDF(row.tab_id, row.pdf_file_url);

          if (row.excel_file_url)
            originalFileUrls[row.tab_id] = row.excel_file_url;
          if (row.word_file_url)
            originalFileUrls[row.tab_id] = row.word_file_url;
          if (row.pdf_file_url) originalFileUrls[row.tab_id] = row.pdf_file_url;
        },
      )
      .subscribe();
  } catch (error) {
    showToast("Không thể tải dữ liệu từ Supabase: " + error.message, "error");
  }
}

function loadDefaultDemoData() {
  Object.keys(defaultTabDatasets).forEach((tabId) => {
    const jsonArray = defaultTabDatasets[tabId];
    if (jsonArray.length === 0) return;
    const headers = Object.keys(jsonArray[0]);
    const rows = [headers];
    jsonArray.forEach((item) => rows.push(headers.map((h) => item[h])));
    renderWorkbookFromData(tabId, { "Dữ Liệu Tổng Hợp": rows });
  });
  // Nếu có hàm renderWordHTML, gọi ở đây (phụ thuộc thư viện của bạn)
  // Object.keys(defaultWordDocs).forEach((tabId) => { renderWordHTML(tabId, defaultWordDocs[tabId]); });
}

function initAdminAuth() {
  const ADMIN_USER = "thptpc";
  const ADMIN_PASS = "123456";

  const loginForm =
    document.querySelector(".login-form") ||
    document.querySelector("#login-form");
  const loginBtnNav = document.querySelector(".login-btn");
  const homeTab = document.querySelector(
    '.nav-item[data-target="tab-tong-quan"]',
  );

  if (!loginForm) return;

  function setAdminState(isLoggedIn) {
    if (isLoggedIn) {
      document.body.classList.add("admin-logged-in");
      if (loginBtnNav) {
        loginBtnNav.innerHTML = '<i class="fas fa-sign-out-alt"></i> Đăng xuất';
        loginBtnNav.classList.add("logout-mode");
        loginBtnNav.removeAttribute("data-target");
      }
    } else {
      document.body.classList.remove("admin-logged-in");
      if (loginBtnNav) {
        loginBtnNav.innerHTML = '<i class="fas fa-user-circle"></i> Đăng nhập';
        loginBtnNav.classList.remove("logout-mode");
        loginBtnNav.setAttribute("data-target", "tab-login");
      }
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userInput = loginForm.querySelector(
      'input[type="text"], input[type="email"], #username, [name="username"]',
    );
    const passInput = loginForm.querySelector(
      'input[type="password"], #password, [name="password"]',
    );

    if (
      userInput.value.trim() === ADMIN_USER &&
      passInput.value.trim() === ADMIN_PASS
    ) {
      sessionStorage.setItem("isAdminLoggedIn", "true");
      setAdminState(true);
      loginForm.reset();
      showToast("Đăng nhập thành công!", "success");
      if (homeTab) homeTab.click();
    } else {
      showToast("Sai tên đăng nhập hoặc mật khẩu!", "error");
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".login-btn.logout-mode")) {
      sessionStorage.removeItem("isAdminLoggedIn");
      setAdminState(false);
      showToast("Đã thoát phiên quản trị!", "info");
      if (homeTab) homeTab.click();
    }
  });

  setAdminState(sessionStorage.getItem("isAdminLoggedIn") === "true");
}

/* ==========================================
     DOM CONTENT LOADED - EVENT BINDINGS
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");
  const mobileMenu = document.getElementById("mobile-menu");
  const navTabs = document.getElementById("nav-tabs");
  const body = document.body;

  if (mobileMenu && navTabs) {
    mobileMenu.addEventListener("click", () =>
      navTabs.classList.toggle("show"),
    );
  }

  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      if (!this.dataset.target) return;
      const targetId = this.getAttribute("data-target");

      navItems.forEach((nav) => nav.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));

      this.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");

      Array.from(body.classList)
        .filter((cls) => cls.startsWith("bg-"))
        .forEach((cls) => body.classList.remove(cls));
      body.classList.add(`bg-${targetId}`);

      if (window.innerWidth <= 868 && navTabs) navTabs.classList.remove("show");
    });
  });

  document.addEventListener("click", function (e) {
    const subItem = e.target.closest(".sub-nav-item");
    if (subItem) {
      const parentContainer = subItem.closest(".tab-content");
      if (!parentContainer) return;

      parentContainer
        .querySelectorAll(".sub-nav-item")
        .forEach((b) => b.classList.remove("active"));
      subItem.classList.add("active");

      const viewType = subItem.getAttribute("data-view");
      parentContainer
        .querySelectorAll(".view-panel")
        .forEach((vp) => vp.classList.remove("active"));
      const targetView = parentContainer.querySelector(`.view-${viewType}`);
      if (targetView) targetView.classList.add("active");
    }
  });

  /* LOGIC THÊM TAB MỚI & LƯU VÀO DATABASE */
  const modal = document.getElementById("addTabModal");
  const form = document.getElementById("addTabForm");
  const tabTypeSelect = document.getElementById("newTabType");
  const fileInputGroup = document.getElementById("fileInputGroup");
  const linkInputGroup = document.getElementById("linkInputGroup");
  const fileInput = document.getElementById("newTabFile");
  const linkInput = document.getElementById("newTabLink");

  if (tabTypeSelect) {
    tabTypeSelect.addEventListener("change", function () {
      if (this.value === "ggsheet") {
        fileInputGroup.style.display = "none";
        fileInput.removeAttribute("required");
        linkInputGroup.style.display = "block";
        linkInput.setAttribute("required", "required");
      } else {
        fileInputGroup.style.display = "block";
        fileInput.setAttribute("required", "required");
        linkInputGroup.style.display = "none";
        linkInput.removeAttribute("required");
      }
    });
  }

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    if (form) {
      form.reset();
      if (fileInputGroup) fileInputGroup.style.display = "block";
      if (linkInputGroup) linkInputGroup.style.display = "none";
      if (fileInput) fileInput.setAttribute("required", "required");
      if (linkInput) linkInput.removeAttribute("required");
    }
  };

  document
    .getElementById("closeModalBtn")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("cancelTabBtn")
    ?.addEventListener("click", closeModal);

  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-add-new-tab, .btn-add-new-tab")) {
      if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
        return showToast("Chỉ quản trị viên mới được thêm danh mục!", "error");
      }
      if (modal) modal.style.display = "flex";
    }
  });

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const activeMainTab = document.querySelector(".tab-content.active");
      if (!activeMainTab)
        return showToast("Không xác định được tab hiện tại!", "error");

      const activeTabId = activeMainTab.id;
      const sidebar = activeMainTab.querySelector(".sub-sidebar");
      const contentArea = activeMainTab.querySelector(".sub-content-area");

      if (!sidebar || !contentArea)
        return showToast("Tab này không hỗ trợ thanh bên!", "error");

      const tabNameRaw = document.getElementById("newTabName").value;
      const tabName = tabNameRaw ? tabNameRaw.trim() : "";
      if (!tabName) return showToast("Vui lòng nhập tên tab!", "warning");

      const customDesc = (
        document.getElementById("newTabDesc")?.value || ""
      ).trim();
      const customSubtitle = (
        document.getElementById("newTabSubtitle")?.value || ""
      ).trim();
      const tabType = document.getElementById("newTabType").value;
      const isDownloadable = document.getElementById("newTabDownload").checked;
      const uniqueId = "custom-" + Date.now();

      let icon,
        defaultDesc,
        acceptAttr,
        typeClass,
        sheetUrl = "";

      if (tabType === "excel") {
        icon = "fa-file-excel";
        defaultDesc = "Bảng tính Excel";
        acceptAttr = ".xlsx, .xls, .csv";
        typeClass = "excel";
      } else if (tabType === "word") {
        icon = "fa-file-word";
        defaultDesc = "Văn bản Word";
        acceptAttr = ".docx";
        typeClass = "word";
      } else if (tabType === "pdf") {
        icon = "fa-file-pdf";
        defaultDesc = "Văn bản PDF";
        acceptAttr = ".pdf";
        typeClass = "pdf";
      } else if (tabType === "ggsheet") {
        icon = "fa-table";
        defaultDesc = "Google Sheet Trực tuyến";
        acceptAttr = "";
        typeClass = "ggsheet";
        sheetUrl = linkInput ? linkInput.value.trim() : "";
        if (!sheetUrl)
          return showToast("Vui lòng nhập link Google Sheet!", "warning");
      }

      const newTabMeta = {
        uniqueId,
        name: tabName,
        type: tabType,
        icon,
        desc: customDesc || defaultDesc,
        subtitle:
          customSubtitle ||
          (tabType === "ggsheet"
            ? "Bảng tính trực tuyến"
            : "Tài liệu tải lên tự động"),
        typeClass,
        acceptAttr,
        isDownloadable,
        ...(tabType === "ggsheet" && { url: sheetUrl }),
      };

      try {
        const { data: mainTabData } = await supabase
          .from("tab_contents")
          .select("sub_tabs_meta")
          .eq("tab_id", activeTabId)
          .single();
        let existingSubTabs = mainTabData?.sub_tabs_meta || [];
        existingSubTabs.push(newTabMeta);

        await supabase.from("tab_contents").upsert(
          {
            tab_id: activeTabId,
            sub_tabs_meta: existingSubTabs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tab_id" },
        );

        restoreCustomTabs(activeTabId, [newTabMeta]);

        if (tabType !== "ggsheet" && fileInput && fileInput.files.length > 0) {
          const newUploadInput = document.querySelector(
            `#${activeTabId}-view-${uniqueId} .custom-upload`,
          );
          if (newUploadInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(fileInput.files[0]);
            newUploadInput.files = dataTransfer.files;
            newUploadInput.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
          }
        }

        const newlyCreatedBtn = sidebar.querySelector(
          `.sub-nav-item[data-view="${uniqueId}"]`,
        );
        if (newlyCreatedBtn) newlyCreatedBtn.click();
        closeModal();
        showToast("Đã thêm danh mục mới thành công!", "success");
      } catch (err) {
        console.error("Lỗi lưu cấu trúc tab:", err);
        showToast("Lỗi khi tạo tab mới!", "error");
      }
    });
  }

  tabContents.forEach((tab) => {
    const sheetContainer = tab.querySelector(".sheet-tabs-container");
    const btnLeft = tab.querySelector(".scroll-btn.left");
    const btnRight = tab.querySelector(".scroll-btn.right");
    if (btnLeft && btnRight && sheetContainer) {
      btnLeft.addEventListener("click", () =>
        sheetContainer.scrollBy({ left: -220, behavior: "smooth" }),
      );
      btnRight.addEventListener("click", () =>
        sheetContainer.scrollBy({ left: 220, behavior: "smooth" }),
      );
    }
  });

  const track = document.getElementById("sliderTrack");
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".slider-dot");
  let currentSlide = 0;

  function updateSlider() {
    if (!track) return;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    slides.forEach((slide, idx) =>
      slide.classList.toggle("active", idx === currentSlide),
    );
    dots.forEach((dot, idx) =>
      dot.classList.toggle("active", idx === currentSlide),
    );
  }

  document.getElementById("sliderNextBtn")?.addEventListener("click", () => {
    if (slides.length > 0) currentSlide = (currentSlide + 1) % slides.length;
    updateSlider();
  });
  document.getElementById("sliderPrevBtn")?.addEventListener("click", () => {
    if (slides.length > 0)
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlider();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", function () {
      currentSlide = parseInt(this.getAttribute("data-index"));
      updateSlider();
    });
  });

  setInterval(() => {
    const tongQuanTab = document.getElementById("tab-tong-quan");
    if (tongQuanTab?.classList.contains("active") && slides.length > 0) {
      currentSlide = (currentSlide + 1) % slides.length;
      updateSlider();
    }
  }, 6000);

  /* GLOBAL EVENT DELEGATION: UPLOAD (WORD, EXCEL, PDF) */
  document.addEventListener("change", async function (e) {
    const isWordUpload = e.target.classList.contains("word-upload-input");
    const isExcelUpload = e.target.classList.contains("excel-upload-input");
    const isPdfUpload = e.target.classList.contains("pdf-upload-input");

    if (isWordUpload || isExcelUpload || isPdfUpload) {
      if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
        e.target.value = "";
        return showToast("Chỉ quản trị viên mới được tải file lên!", "error");
      }
    }

    if (isWordUpload) {
      const file = e.target.files[0];
      if (!file) return;
      const tabId = e.target.getAttribute("data-tab");

      try {
        showToast("Đang gửi file lên hệ thống chuyển đổi...", "info");
        const secretKey = "ow5Tv3QX5QXcZN0sb1eQkWK6JHYrcfAL";
        const formData = new FormData();
        formData.append("File", file);

        const convertRes = await fetch(
          `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${secretKey}`,
          {
            method: "POST",
            body: formData,
          },
        );
        const convertData = await convertRes.json();

        if (
          !convertRes.ok ||
          !convertData.Files ||
          convertData.Files.length === 0
        ) {
          throw new Error(
            convertData.Message ||
              "Chuyển đổi PDF thất bại. Vui lòng kiểm tra Token.",
          );
        }

        const fileObj = convertData.Files[0];
        let pdfBlob;

        if (fileObj.FileData) {
          const byteCharacters = atob(fileObj.FileData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++)
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          pdfBlob = new Blob([new Uint8Array(byteNumbers)], {
            type: "application/pdf",
          });
        } else {
          const downloadUrl =
            fileObj.Url || fileObj.url || fileObj.FileUrl || fileObj.fileUrl;
          if (!downloadUrl)
            throw new Error("ConvertAPI không trả về đường dẫn file.");
          const pdfResponse = await fetch(downloadUrl);
          pdfBlob = await pdfResponse.blob();
        }

        showToast("Chuyển đổi hoàn tất, đang tải lên Supabase...", "info");
        const safeFileName = sanitizeFileName(file.name).replace(
          /\.docx$/i,
          ".pdf",
        );
        const storagePath = `${tabId}/word_pdf/${Date.now()}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf" });
        if (uploadError) throw uploadError;

        const publicUrlResult = supabase.storage
          .from("documents")
          .getPublicUrl(storagePath);
        const finalUrl =
          publicUrlResult?.data?.publicUrl || publicUrlResult?.publicURL;
        if (!finalUrl)
          throw new Error("Không lấy được Public URL từ Supabase Storage.");

        renderWordFromUrl(tabId, finalUrl);
        originalFileUrls[tabId] = finalUrl;

        await supabase.from("tab_contents").upsert(
          {
            tab_id: tabId,
            word_file_url: finalUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tab_id" },
        );

        showToast("Đã tải và chuyển đổi thành công!", "success");
      } catch (error) {
        showToast("Lỗi: " + error.message, "error");
      } finally {
        e.target.value = "";
      }
    }

    if (isExcelUpload) {
      const file = e.target.files[0];
      if (!file) return;
      const panelId = e.target.getAttribute("data-tab");
      const mainTabContainer = e.target.closest(".tab-content");
      const mainTabId = mainTabContainer ? mainTabContainer.id : panelId;

      try {
        showToast("Đang tải file Excel lên hệ thống...", "info");
        const safeFileName = sanitizeFileName(file.name);
        const storagePath = `${mainTabId}/excel/${Date.now()}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("documents")
          .getPublicUrl(storagePath);
        const arrayBuffer = await file.arrayBuffer();
        if (typeof XLSX === "undefined")
          throw new Error("Thư viện XLSX chưa được tải.");

        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
          type: "array",
        });
        const sheetsData = {};
        workbook.SheetNames.forEach((sheetName) => {
          sheetsData[sheetName] = XLSX.utils.sheet_to_html(
            workbook.Sheets[sheetName],
          );
        });

        renderWorkbookFromData(panelId, sheetsData);
        originalFileUrls[panelId] = publicUrlData.publicUrl;

        const { data: currentData } = await supabase
          .from("tab_contents")
          .select("excel_sheets")
          .eq("tab_id", mainTabId)
          .single();
        const allExcelSheets = currentData?.excel_sheets || {};
        allExcelSheets[panelId] = sheetsData;

        await supabase.from("tab_contents").upsert(
          {
            tab_id: mainTabId,
            excel_sheets: allExcelSheets,
            excel_file_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tab_id" },
        );

        showToast("Đã tải Excel lên thành công!", "success");
      } catch (error) {
        showToast("Lỗi tải Excel: " + error.message, "error");
      } finally {
        e.target.value = "";
      }
    }

    if (isPdfUpload) {
      const file = e.target.files[0];
      if (!file) return;
      const tabId = e.target.getAttribute("data-tab");

      try {
        showToast("Đang tải file PDF lên hệ thống...", "info");
        const safeFileName = sanitizeFileName(file.name);
        const storagePath = `${tabId}/pdf/${Date.now()}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, { contentType: "application/pdf" });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("documents")
          .getPublicUrl(storagePath);
        renderPDF(tabId, publicUrlData.publicUrl);
        originalFileUrls[tabId] = publicUrlData.publicUrl;

        await supabase.from("tab_contents").upsert(
          {
            tab_id: tabId,
            pdf_file_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tab_id" },
        );

        showToast("Đã tải PDF lên thành công!", "success");
      } catch (error) {
        showToast("Lỗi tải PDF: " + error.message, "error");
      } finally {
        e.target.value = "";
      }
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest(".export-btn")) {
      const btn = e.target.closest(".export-btn");
      const tabId = btn.getAttribute("data-tab");
      const fileUrl = originalFileUrls[tabId];

      if (fileUrl) {
        window.open(fileUrl, "_blank");
        showToast("Đang mở/tải file gốc...", "success");
      } else {
        showToast("Chưa có file gốc nào được tải lên để tải về!", "warning");
      }
    }
  });

  /* LOGIC CHỈNH SỬA, DI CHUYỂN, XOÁ TAB */
  function updateLocalTabControls(sidebar, mode) {
    sidebar.querySelectorAll(".tab-edit-controls").forEach((control) => {
      control.style.display = mode === "none" ? "none" : "flex";
      const btnUp = control.querySelector(".btn-move-up");
      const btnDown = control.querySelector(".btn-move-down");
      const btnDel = control.querySelector(".btn-delete-tab");

      if (mode === "move") {
        if (btnUp) btnUp.style.display = "inline-flex";
        if (btnDown) btnDown.style.display = "inline-flex";
        if (btnDel) btnDel.style.display = "none";
      } else if (mode === "delete") {
        if (btnUp) btnUp.style.display = "none";
        if (btnDown) btnDown.style.display = "none";
        if (btnDel) btnDel.style.display = "inline-flex";
      } else {
        if (btnUp) btnUp.style.display = "none";
        if (btnDown) btnDown.style.display = "none";
        if (btnDel) btnDel.style.display = "none";
      }
    });
  }

  function updateLocalMoveButtonsState(sidebar) {
    const items = Array.from(sidebar.querySelectorAll(".sub-nav-item"));
    items.forEach((item, index) => {
      const btnUp = item.querySelector(".btn-move-up");
      const btnDown = item.querySelector(".btn-move-down");

      if (btnUp) btnUp.classList.toggle("disabled", index === 0);
      if (btnDown)
        btnDown.classList.toggle("disabled", index === items.length - 1);
    });
  }

  document.querySelectorAll(".sub-sidebar").forEach((sidebar) => {
    const editActions = sidebar.querySelector(".header-edit-actions");
    if (editActions) editActions.style.display = "none";
  });

  document.addEventListener("click", function (e) {
    const btnEditTabs = e.target.closest(".btn-edit-tabs");
    if (btnEditTabs) {
      if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
        return showToast(
          "Chỉ quản trị viên mới được chỉnh sửa danh mục!",
          "error",
        );
      }
      const sidebar = btnEditTabs.closest(".sub-sidebar");
      if (!sidebar) return;
      sidebar.classList.add("is-editing");

      const defaultActions = sidebar.querySelector(".header-default-actions");
      const editActions = sidebar.querySelector(".header-edit-actions");
      if (defaultActions) defaultActions.style.display = "none";
      if (editActions) editActions.style.display = "flex";
      updateLocalTabControls(sidebar, "none");
      return;
    }

    const btnExitEdit = e.target.closest(".btn-exit-edit");
    if (btnExitEdit) {
      const sidebar = btnExitEdit.closest(".sub-sidebar");
      if (!sidebar) return;
      sidebar.classList.remove("is-editing", "is-move-mode", "is-delete-mode");

      const headerTitle = sidebar.querySelector(
        ".sub-sidebar-header span:first-child",
      );
      const defaultActions = sidebar.querySelector(".header-default-actions");
      const editActions = sidebar.querySelector(".header-edit-actions");

      if (headerTitle) headerTitle.style.display = "";
      if (defaultActions) defaultActions.style.display = "";
      if (editActions) editActions.style.display = "none";
      updateLocalTabControls(sidebar, "none");
      return;
    }

    const btnModeMove = e.target.closest(".btn-mode-move");
    if (btnModeMove) {
      const sidebar = btnModeMove.closest(".sub-sidebar");
      if (!sidebar) return;
      sidebar.classList.remove("is-delete-mode");
      sidebar.classList.add("is-move-mode");
      updateLocalTabControls(sidebar, "move");
      updateLocalMoveButtonsState(sidebar);
      return;
    }

    const btnModeDelete = e.target.closest(".btn-mode-delete");
    if (btnModeDelete) {
      const sidebar = btnModeDelete.closest(".sub-sidebar");
      if (!sidebar) return;
      sidebar.classList.remove("is-move-mode");
      sidebar.classList.add("is-delete-mode");
      updateLocalTabControls(sidebar, "delete");
      return;
    }

    const controlBtn = e.target.closest(
      ".control-btn, .btn-delete-tab, .btn-move-up, .btn-move-down",
    );
    if (controlBtn) {
      if (controlBtn.classList.contains("disabled")) return;
      e.stopPropagation();
      e.preventDefault();

      const currentItem = controlBtn.closest(".sub-nav-item");
      if (!currentItem) return;

      const sidebar = currentItem.closest(".sub-sidebar");
      if (!sidebar) return;
      const navList =
        currentItem.closest(".sub-nav-list") || currentItem.parentElement;
      const tabId = currentItem.getAttribute("data-tab");

      async function syncTabsStateToSupabase() {
        try {
          const { data } = await supabase
            .from("tab_contents")
            .select("sub_tabs_meta")
            .eq("tab_id", tabId)
            .single();
          const existingMeta = data?.sub_tabs_meta || [];
          const currentItems = Array.from(
            sidebar.querySelectorAll(".sub-nav-item"),
          );
          const newMetaArray = [];

          currentItems.forEach((item) => {
            const viewId = item.getAttribute("data-view");
            if (viewId) {
              const meta = existingMeta.find((m) => m.uniqueId === viewId);
              if (meta) newMetaArray.push(meta);
            }
          });

          await supabase.from("tab_contents").upsert(
            {
              tab_id: tabId,
              sub_tabs_meta: newMetaArray,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tab_id" },
          );
        } catch (error) {
          showToast("Lỗi khi lưu trạng thái danh mục!", "error");
        }
      }

      if (controlBtn.classList.contains("btn-move-up")) {
        const prevItem = currentItem.previousElementSibling;
        if (prevItem && prevItem.classList.contains("sub-nav-item")) {
          navList.insertBefore(currentItem, prevItem);
          updateLocalMoveButtonsState(sidebar);
          syncTabsStateToSupabase();
        }
      }

      if (controlBtn.classList.contains("btn-move-down")) {
        const nextItem = currentItem.nextElementSibling;
        if (nextItem && nextItem.classList.contains("sub-nav-item")) {
          navList.insertBefore(nextItem, currentItem);
          updateLocalMoveButtonsState(sidebar);
          syncTabsStateToSupabase();
        }
      }

      if (controlBtn.classList.contains("btn-delete-tab")) {
        if (
          confirm(
            "Bạn có chắc chắn muốn xoá danh mục này? Dữ liệu đi kèm sẽ bị xoá khỏi giao diện.",
          )
        ) {
          const viewId = currentItem.getAttribute("data-view");
          currentItem.remove();

          if (tabId && viewId) {
            const viewPanel = document.getElementById(
              `${tabId}-view-${viewId}`,
            );
            if (viewPanel) viewPanel.remove();
          }

          if (typeof updateLocalMoveButtonsState === "function")
            updateLocalMoveButtonsState(sidebar);
          syncTabsStateToSupabase();
          showToast("Đã xoá danh mục thành công!", "success");

          const firstRemainingTab = sidebar.querySelector(".sub-nav-item");
          if (firstRemainingTab) firstRemainingTab.click();
        }
      }
    }
  });

  // Khởi tạo các hàm an toàn
  if (typeof initSupabaseSync === "function") initSupabaseSync();
  if (typeof initAdminAuth === "function") initAdminAuth();
});

/* GLOBAL CLICK DELEGATION (EDIT/SAVE EXCEL) */
document.addEventListener("click", async (e) => {
  const isEditBtn = e.target.closest(".toggle-edit-btn");
  const isAddRowBtn = e.target.closest(".add-row-btn");
  const isSaveBtn = e.target.closest(".save-excel-btn");

  if (isEditBtn || isAddRowBtn || isSaveBtn) {
    if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
      return showToast(
        "Chỉ quản trị viên mới được thực hiện thao tác này!",
        "error",
      );
    }
  }

  if (isEditBtn) {
    const btn = isEditBtn;
    const tabId = btn.getAttribute("data-tab");
    const container = document.getElementById(tabId);
    if (!container) return;

    const table = container.querySelector(".excel-table");
    if (!table)
      return showToast("Không có bảng dữ liệu nào để sửa!", "warning");

    const addBtn = container.querySelector(".add-row-btn");
    const saveBtn = container.querySelector(".save-excel-btn");
    const btnText = btn.querySelector("span");
    const btnIcon = btn.querySelector("i");
    const isEditing = table.classList.toggle("editing");

    table
      .querySelectorAll("tbody td")
      .forEach((td) => (td.contentEditable = isEditing));

    if (isEditing) {
      if (btnText) btnText.textContent = " Hủy Sửa";
      if (btnIcon) btnIcon.className = "fas fa-times";
      btn.style.backgroundColor = "#ef4444";
      if (addBtn)
        addBtn.style.setProperty("display", "inline-block", "important");
      if (saveBtn)
        saveBtn.style.setProperty("display", "inline-block", "important");
    } else {
      if (btnText) btnText.textContent = " Chỉnh Sửa";
      if (btnIcon) btnIcon.className = "fas fa-edit";
      btn.style.backgroundColor = "#f59e0b";
      if (addBtn) addBtn.style.setProperty("display", "none", "important");
      if (saveBtn) saveBtn.style.setProperty("display", "none", "important");
      const activeSheetBtn = container.querySelector(".sheet-btn.active");
      if (activeSheetBtn) activeSheetBtn.click();
    }
  }

  if (isAddRowBtn) {
    const btn = isAddRowBtn;
    const tabId = btn.getAttribute("data-tab");
    const container = document.getElementById(tabId);
    if (!container) return;

    const table = container.querySelector(".excel-table");
    if (!table) return;

    const firstRow = table.querySelector("tr");
    const colCount = firstRow ? firstRow.querySelectorAll("td, th").length : 5;
    let tbody = table.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    const newRow = document.createElement("tr");
    for (let i = 0; i < colCount; i++)
      newRow.innerHTML += '<td contenteditable="true"></td>';
    tbody.appendChild(newRow);

    const responsiveDiv = table.closest(".table-responsive");
    if (responsiveDiv) responsiveDiv.scrollTop = responsiveDiv.scrollHeight;
  }

  if (isSaveBtn) {
    const btn = isSaveBtn;
    const viewTabId = btn.getAttribute("data-tab");
    const container = document.getElementById(viewTabId);
    if (!container) return;

    const mainTabContainer = container.closest(".tab-content");
    if (!mainTabContainer) return;
    const mainTabId = mainTabContainer.id;

    const table = container.querySelector(".excel-table");
    const activeSheetBtn = container.querySelector(".sheet-btn.active");
    if (!activeSheetBtn || !table) return;

    const currentSheetName = activeSheetBtn.innerText.trim();

    try {
      showToast("Đang lưu thay đổi...", "info");
      table.classList.remove("editing");
      table
        .querySelectorAll("tbody td, th")
        .forEach((td) => (td.contentEditable = "false"));

      const editBtn = container.querySelector(".toggle-edit-btn");
      if (editBtn) {
        const btnText = editBtn.querySelector("span");
        const btnIcon = editBtn.querySelector("i");
        if (btnText) btnText.textContent = " Chỉnh Sửa";
        if (btnIcon) btnIcon.className = "fas fa-edit";
        editBtn.style.backgroundColor = "#f59e0b";
      }

      const addBtn = container.querySelector(".add-row-btn");
      if (addBtn) addBtn.style.setProperty("display", "none", "important");
      btn.style.setProperty("display", "none", "important");

      if (!activeWorkbooks[viewTabId]) activeWorkbooks[viewTabId] = {};
      activeWorkbooks[viewTabId][currentSheetName] = table.outerHTML;

      const { data: currentData } = await supabase
        .from("tab_contents")
        .select("excel_sheets")
        .eq("tab_id", mainTabId)
        .single();
      const allExcelSheetsToSave = currentData?.excel_sheets || {};
      allExcelSheetsToSave[viewTabId] = activeWorkbooks[viewTabId];

      const { error: dbError } = await supabase.from("tab_contents").upsert(
        {
          tab_id: mainTabId,
          excel_sheets: allExcelSheetsToSave,
          excel_updated_at: new Date().toISOString(),
        },
        { onConflict: "tab_id" },
      );

      if (dbError) throw dbError;
      showToast("Đã lưu dữ liệu thành công!", "success");
    } catch (error) {
      showToast("Lỗi khi lưu: " + error.message, "error");
    }
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const body = document.body;
  const themeIcon = themeToggleBtn.querySelector("i");

  // 1. Kiểm tra bộ nhớ xem người dùng đã chọn theme nào trước đó chưa
  const currentTheme = localStorage.getItem("app-theme");
  
  if (currentTheme === "light") {
    body.classList.add("light-theme");
    // Đổi icon sang Mặt trời vì đang ở nền trắng
    if (themeIcon) {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    }
  }

  // 2. Sự kiện khi click vào nút chuyển Theme
  themeToggleBtn.addEventListener("click", function () {
    // Bật/tắt class light-theme trên thẻ body
    body.classList.toggle("light-theme");
    
    // Nếu body đang có class light-theme -> Cập nhật icon và lưu LocalStorage
    if (body.classList.contains("light-theme")) {
      localStorage.setItem("app-theme", "light");
      if (themeIcon) {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
      }
    } else {
      // Ngược lại, xoá bỏ nền trắng trở về nền tối mặc định
      localStorage.setItem("app-theme", "dark");
      if (themeIcon) {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
      }
    }
  });
});