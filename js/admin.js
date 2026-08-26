// =========================================================
// محمد الفيلالي — Admin Dashboard Script
// الربط مع Google Apps Script Backend
// =========================================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // الإعدادات الرئيسية
    // ضع رابط Google Apps Script المفعّل هنا
    // =====================================================
    const API_URL = "https://script.google.com/macros/s/AKfycbyRlYEPfl1o_AAefu5NwBcc8M9FGBz9p0Vl4fta92klQIKgOXCp_sKCOo3_Pi3M8n5zXg/exec";

    // العناصر الأساسية
    const loginScreen = document.getElementById("login-screen");
    const dashboardScreen = document.getElementById("dashboard-screen");
    const loginForm = document.getElementById("login-form");
    const loginStatus = document.getElementById("login-status");
    const logoutBtn = document.getElementById("logout-btn");

    const messagesList = document.getElementById("messages-list");
    const messagesCount = document.getElementById("messages-count");

    const projectForm = document.getElementById("project-form");
    const projectIdInput = document.getElementById("project-id");
    const projectTitleInput = document.getElementById("project-title");
    const projectDescInput = document.getElementById("project-description");
    const projectUrlInput = document.getElementById("project-url");
    const projectImageFileInput = document.getElementById("project-image-file");
    const projectImageUrlInput = document.getElementById("project-image-url");
    const projectStatus = document.getElementById("project-status");
    const formTitle = document.getElementById("form-title");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const adminProjectsList = document.getElementById("admin-projects-list");

    // =====================================================
    // إدارة الجلسة (Session Token)
    // =====================================================
    function getToken() {
        return sessionStorage.getItem("admin_token") || "";
    }

    function setToken(token) {
        if (token) {
            sessionStorage.setItem("admin_token", token);
        } else {
            sessionStorage.removeItem("admin_token");
        }
    }

    async function checkAuthStatus() {
        const token = getToken();
        if (!token) {
            showLoginView();
            return;
        }

        try {
            const res = await sendRequest({ action: "checkSession", token });
            if (res && res.success) {
                showDashboardView();
            } else {
                setToken("");
                showLoginView();
            }
        } catch {
            showLoginView();
        }
    }

    function showLoginView() {
        loginScreen.hidden = false;
        dashboardScreen.hidden = true;
    }

    function showDashboardView() {
        loginScreen.hidden = true;
        dashboardScreen.hidden = false;
        loadMessages();
        loadProjects();
    }

    // =====================================================
    // دالة الاتصال بالخادم
    // =====================================================
    async function sendRequest(payload) {
        if (!API_URL || API_URL.includes("ضع_رابط")) {
            throw new Error("يرجى إدخال رابط Google Apps Script في ملف js/admin.js");
        }

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`خطأ في الاستجابة: ${response.status}`);
        }

        return await response.json();
    }

    // =====================================================
    // تسجيل الدخول والخروج
    // =====================================================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showStatus(loginStatus, "");

            const email = document.getElementById("admin-email").value.trim();
            const password = document.getElementById("admin-password").value;

            if (!email || !password) {
                showStatus(loginStatus, "يرجى تعبئة جميع الحقول.", "error");
                return;
            }

            try {
                setLoading(loginForm, true);
                const res = await sendRequest({
                    action: "login",
                    email: email,
                    password: password
                });

                if (res.success && res.token) {
                    setToken(res.token);
                    showDashboardView();
                } else {
                    showStatus(loginStatus, res.message || "فشل تسجيل الدخول.", "error");
                }
            } catch (err) {
                showStatus(loginStatus, err.message || "تعذر الاتصال بالخادم.", "error");
            } finally {
                setLoading(loginForm, false);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            const token = getToken();
            if (token) {
                try {
                    await sendRequest({ action: "logout", token });
                } catch {
                    // تجاهل أي خطأ عند الخروج
                }
            }
            setToken("");
            showLoginView();
        });
    }

    // =====================================================
    // التنقل بين التبويبات
    // =====================================================
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetId = btn.getAttribute("data-tab");
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("active");
            }
        });
    });

    // =====================================================
    // جلب وعرض الرسائل
    // =====================================================
    async function loadMessages() {
        if (!messagesList) return;

        messagesList.innerHTML = `<div class="loading-box">جارٍ تحميل الرسائل...</div>`;

        try {
            const res = await sendRequest({ action: "getMessages", token: getToken() });

            if (!res.success) {
                if (res.unauthorized) {
                    setToken("");
                    showLoginView();
                    return;
                }
                messagesList.innerHTML = `<div class="loading-box">${res.message || "تعذر جلب الرسائل."}</div>`;
                return;
            }

            const messages = res.messages || [];
            if (messagesCount) messagesCount.textContent = messages.length;

            if (messages.length === 0) {
                messagesList.innerHTML = `<div class="loading-box">لا توجد رسائل واردة حاليًا.</div>`;
                return;
            }

            messagesList.innerHTML = messages.map(msg => `
                <article class="message-card">
                    <div class="message-header">
                        <div>
                            <div class="message-author">${escapeHtml(msg.name)}</div>
                            <div class="message-date">${escapeHtml(msg.date)}</div>
                        </div>
                    </div>
                    
                    <div class="message-info-row">
                        <span class="info-badge">الخدمة: ${escapeHtml(msg.service)}</span>
                        <span class="info-badge">${escapeHtml(msg.contactMethod)}: ${escapeHtml(msg.contactValue)}</span>
                        <span class="info-badge">${msg.wordCount} كلمة</span>
                    </div>

                    <div class="message-body">${escapeHtml(msg.message)}</div>
                </article>
            `).join("");

        } catch (err) {
            messagesList.innerHTML = `<div class="loading-box">حدث خطأ أثناء تحميل الرسائل.</div>`;
        }
    }

    // =====================================================
    // جلب وعرض المشاريع لصفحة المدير
    // =====================================================
    async function loadProjects() {
        if (!adminProjectsList) return;

        adminProjectsList.innerHTML = `<div class="loading-box">جارٍ تحميل المشاريع...</div>`;

        try {
            const res = await sendRequest({ action: "getProjects", token: getToken() });

            if (!res.success) {
                adminProjectsList.innerHTML = `<div class="loading-box">تعذر تحميل المشاريع.</div>`;
                return;
            }

            const projects = res.projects || [];

            if (projects.length === 0) {
                adminProjectsList.innerHTML = `<div class="loading-box">لا توجد مشاريع مضافة حاليًا.</div>`;
                return;
            }

            adminProjectsList.innerHTML = projects.map(proj => `
                <article class="project-card">
                    <div class="project-image">
                        ${proj.imageUrl ? `<img src="${escapeAttribute(proj.imageUrl)}" alt="${escapeAttribute(proj.title)}">` : `<div class="project-placeholder">بلا صورة</div>`}
                    </div>
                    <div class="project-content">
                        <h3>${escapeHtml(proj.title)}</h3>
                        <p>${escapeHtml(proj.description)}</p>
                        
                        <div class="admin-project-actions">
                            <button class="button button-secondary edit-proj-btn" data-project='${JSON.stringify(proj).replace(/'/g, "&apos;")}'>
                                تعديل
                            </button>
                            <button class="button button-danger delete-proj-btn" data-id="${proj.id}">
                                حذف
                            </button>
                        </div>
                    </div>
                </article>
            `).join("");

            // إضافة أحداث التعديل والحذف
            attachProjectEvents();

        } catch (err) {
            adminProjectsList.innerHTML = `<div class="loading-box">حدث خطأ أثناء تحميل المشاريع.</div>`;
        }
    }

    // =====================================================
    // رفع صورة إلى Google Drive
    // =====================================================
    function uploadImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result.split(",")[1];
                try {
                    const res = await sendRequest({
                        action: "uploadProjectImage",
                        token: getToken(),
                        fileName: file.name,
                        mimeType: file.type,
                        base64: base64
                    });

                    if (res.success && res.url) {
                        resolve(res.url);
                    } else {
                        reject(res.message || "فشل رفع الصورة.");
                    }
                } catch (e) {
                    reject("تعذر اتصال الخادم لرفع الصورة.");
                }
            };
            reader.onerror = () => reject("فشلت قراءة ملف الصورة.");
            reader.readAsDataURL(file);
        });
    }

    // =====================================================
    // إضافة / تعديل مشروع
    // =====================================================
    if (projectForm) {
        projectForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showStatus(projectStatus, "");

            const id = projectIdInput.value.trim();
            const title = projectTitleInput.value.trim();
            const description = projectDescInput.value.trim();
            const url = projectUrlInput.value.trim();
            let imageUrl = projectImageUrlInput.value.trim();
            const imageFile = projectImageFileInput.files[0];

            if (!title || !description) {
                showStatus(projectStatus, "عنوان المشروع والوصف حقول إجبارية.", "error");
                return;
            }

            try {
                setLoading(projectForm, true);

                // إذا قام بفرز ملف صورة محلي، يتم رفعه أولاً لـ Google Drive
                if (imageFile) {
                    showStatus(projectStatus, "جارٍ رفع الصورة إلى Google Drive...", "");
                    imageUrl = await uploadImageFile(imageFile);
                }

                const payload = {
                    action: "saveProject",
                    token: getToken(),
                    id: id || undefined,
                    title: title,
                    description: description,
                    url: url,
                    imageUrl: imageUrl
                };

                const res = await sendRequest(payload);

                if (res.success) {
                    showStatus(projectStatus, res.message || "تم حفظ المشروع بنجاح.", "success");
                    resetProjectForm();
                    loadProjects();
                } else {
                    showStatus(projectStatus, res.message || "تعذر حفظ المشروع.", "error");
                }

            } catch (err) {
                showStatus(projectStatus, typeof err === "string" ? err : "حدث خطأ أثناء حفظ المشروع.", "error");
            } finally {
                setLoading(projectForm, false);
            }
        });
    }

    // ربط زر إلغاء التعديل
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", resetProjectForm);
    }

    function resetProjectForm() {
        projectIdInput.value = "";
        projectForm.reset();
        formTitle.textContent = "إضافة مشروع جديد";
        cancelEditBtn.hidden = true;
    }

    function attachProjectEvents() {
        // أزرار التعديل
        document.querySelectorAll(".edit-proj-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const proj = JSON.parse(btn.getAttribute("data-project").replace(/&apos;/g, "'"));
                projectIdInput.value = proj.id;
                projectTitleInput.value = proj.title || "";
                projectDescInput.value = proj.description || "";
                projectUrlInput.value = proj.url || "";
                projectImageUrlInput.value = proj.imageUrl || "";
                
                formTitle.textContent = "تعديل المشروع";
                cancelEditBtn.hidden = false;
                window.scrollTo({ top: projectForm.offsetTop - 100, behavior: "smooth" });
            });
        });

        // أزرار الحذف
        document.querySelectorAll(".delete-proj-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (!confirm("هل أنت تأكد من رغبتك في حذف هذا المشروع؟")) return;

                try {
                    const res = await sendRequest({
                        action: "deleteProject",
                        token: getToken(),
                        id: id
                    });

                    if (res.success) {
                        loadProjects();
                    } else {
                        alert(res.message || "تعذر حذف المشروع.");
                    }
                } catch {
                    alert("حدث خطأ أثناء الاتصال بالخادم.");
                }
            });
        });
    }

    // =====================================================
    // وظائف مساعدة
    // =====================================================
    function showStatus(box, msg, type = "") {
        if (!box) return;
        box.textContent = msg;
        box.className = "form-status";
        if (type) box.classList.add(type);
    }

    function setLoading(form, loading) {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = loading;
        const text = btn.querySelector(".btn-text");
        const spinner = btn.querySelector(".btn-loading");
        if (text) text.hidden = loading;
        if (spinner) spinner.hidden = !loading;
    }

    function escapeHtml(str) {
        return String(str || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(str) {
        return escapeHtml(str);
    }

    // بدء التحقق عند تحميل الصفحة
    checkAuthStatus();
});
