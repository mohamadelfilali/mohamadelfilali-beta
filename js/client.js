// =========================================================
// محمد الفيلالي — Client Interface
// Client-side interactions
// =========================================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("contact-form");
    const messageInput = document.getElementById("client-message");
    const messageCounter = document.getElementById("message-counter");

    const contactMethod = document.getElementById("contact-method");
    const contactValue = document.getElementById("contact-value");

    const statusBox = document.getElementById("form-status");

    const submitButton = form
        ? form.querySelector(".submit-button")
        : null;

    const buttonText = form
        ? form.querySelector(".button-text")
        : null;

    const buttonLoading = form
        ? form.querySelector(".button-loading")
        : null;


    // =====================================================
    // CONFIGURATION
    // =====================================================

    /*
        سيتم وضع رابط Google Apps Script هنا لاحقًا.

        مثال:

        const API_URL =
            "https://script.google.com/macros/s/XXXX/exec";

        لا تغيّر هذا الآن.
    */

    const API_URL = "https://script.google.com/macros/s/AKfycbyRlYEPfl1o_AAefu5NwBcc8M9FGBz9p0Vl4fta92klQIKgOXCp_sKCOo3_Pi3M8n5zXg/exec";


    // =====================================================
    // HELPERS
    // =====================================================

    function countWords(text) {

        const normalized = text
            .trim()
            .replace(/\s+/g, " ");

        if (!normalized) {
            return 0;
        }

        return normalized.split(" ").length;
    }


    function updateMessageCounter() {

        if (!messageInput || !messageCounter) {
            return;
        }

        const words = countWords(messageInput.value);

        messageCounter.textContent =
            `${words.toLocaleString("en-US")} / 10000 كلمة`;

        if (words >= 10000) {
            messageCounter.style.color =
                "rgba(255, 116, 116, 0.95)";
        } else if (words >= 9000) {
            messageCounter.style.color =
                "rgba(255, 205, 110, 0.95)";
        } else {
            messageCounter.style.color = "";
        }
    }


    function showStatus(message, type = "") {

        if (!statusBox) {
            return;
        }

        statusBox.textContent = message;

        statusBox.className = "form-status";

        if (type) {
            statusBox.classList.add(type);
        }
    }


    function setLoading(loading) {

        if (!submitButton) {
            return;
        }

        submitButton.disabled = loading;

        if (buttonText) {
            buttonText.hidden = loading;
        }

        if (buttonLoading) {
            buttonLoading.hidden = !loading;
        }
    }


    function normalizeContactPlaceholder() {

        if (!contactMethod || !contactValue) {
            return;
        }

        const placeholders = {

            email:
                "example@email.com",

            phone:
                "+212 6 00 00 00 00",

            whatsapp:
                "+212 6 00 00 00 00",

            telegram:
                "@username",

            facebook:
                "رابط حساب Facebook",

            x:
                "@username"
        };

        contactValue.placeholder =
            placeholders[contactMethod.value] ||
            "اكتب وسيلة التواصل";

        contactValue.autocomplete =
            contactMethod.value === "email"
                ? "email"
                : "off";
    }


    // =====================================================
    // MESSAGE COUNTER
    // =====================================================

    if (messageInput) {

        messageInput.addEventListener(
            "input",
            updateMessageCounter
        );

        updateMessageCounter();
    }


    // =====================================================
    // CONTACT METHOD
    // =====================================================

    if (contactMethod) {

        contactMethod.addEventListener(
            "change",
            normalizeContactPlaceholder
        );

        normalizeContactPlaceholder();
    }


    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    if (form) {

        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                showStatus("");

                // -----------------------------------------
                // READ VALUES
                // -----------------------------------------

                const formData =
                    new FormData(form);

                const name =
                    String(
                        formData.get("name") || ""
                    ).trim();

                const service =
                    String(
                        formData.get("service") || ""
                    ).trim();

                const method =
                    String(
                        formData.get("contactMethod") || ""
                    ).trim();

                const contact =
                    String(
                        formData.get("contactValue") || ""
                    ).trim();

                const message =
                    String(
                        formData.get("message") || ""
                    ).trim();

                const honeypot =
                    String(
                        formData.get("website") || ""
                    ).trim();


                // -----------------------------------------
                // BASIC BOT PROTECTION
                // -----------------------------------------

                if (honeypot) {

                    showStatus(
                        "تعذر إرسال الطلب.",
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // VALIDATION
                // -----------------------------------------

                if (!name) {

                    showStatus(
                        "اكتب اسمك أولًا.",
                        "error"
                    );

                    return;
                }


                if (!service) {

                    showStatus(
                        "اختر نوع الطلب.",
                        "error"
                    );

                    return;
                }


                if (!method) {

                    showStatus(
                        "اختر طريقة التواصل.",
                        "error"
                    );

                    return;
                }


                if (!contact) {

                    showStatus(
                        "اكتب معلومات التواصل الخاصة بك.",
                        "error"
                    );

                    return;
                }


                if (!message) {

                    showStatus(
                        "اكتب تفاصيل المشروع أولًا.",
                        "error"
                    );

                    return;
                }


                const wordCount =
                    countWords(message);


                if (wordCount > 10000) {

                    showStatus(
                        "الرسالة تتجاوز الحد الأقصى وهو 10,000 كلمة.",
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // CONTACT VALIDATION
                // -----------------------------------------

                if (
                    method === "email" &&
                    !isValidEmail(contact)
                ) {

                    showStatus(
                        "البريد الإلكتروني غير صحيح.",
                        "error"
                    );

                    return;
                }


                if (
                    (
                        method === "phone" ||
                        method === "whatsapp"
                    ) &&
                    !isValidPhone(contact)
                ) {

                    showStatus(
                        "رقم الهاتف غير صحيح.",
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // API NOT CONFIGURED YET
                // -----------------------------------------

                if (!API_URL) {

                    showStatus(
                        "نظام استقبال الطلبات لم يتم ربطه بعد. سنفعّله في الخطوات التالية.",
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // PREPARE REQUEST
                // -----------------------------------------

                const payload = {

                    action: "createMessage",

                    name: name,

                    service: service,

                    contactMethod: method,

                    contactValue: contact,

                    message: message,

                    wordCount: wordCount,

                    submittedAt:
                        new Date().toISOString()
                };


                try {

                    setLoading(true);


                    const response =
                        await fetch(
                            API_URL,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "text/plain;charset=utf-8"
                                },

                                body:
                                    JSON.stringify(payload)
                            }
                        );


                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}`
                        );
                    }


                    let result = null;

                    try {

                        result =
                            await response.json();

                    } catch {

                        result = {
                            success: true
                        };
                    }


                    if (
                        result &&
                        result.success === false
                    ) {

                        throw new Error(
                            result.message ||
                            "حدث خطأ أثناء إرسال الطلب."
                        );
                    }


                    // -------------------------------------
                    // SUCCESS
                    // -------------------------------------

                    showStatus(
                        "تم إرسال طلبك بنجاح. سنتواصل معك عبر وسيلة التواصل التي أدخلتها.",
                        "success"
                    );


                    form.reset();

                    updateMessageCounter();

                    normalizeContactPlaceholder();


                } catch (error) {

                    console.error(
                        "Message submission error:",
                        error
                    );


                    showStatus(
                        "تعذر إرسال الطلب حاليًا. حاول مرة أخرى.",
                        "error"
                    );


                } finally {

                    setLoading(false);
                }
            }
        );
    }


    // =====================================================
    // EMAIL VALIDATION
    // =====================================================

    function isValidEmail(value) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(value);
    }


    // =====================================================
    // PHONE VALIDATION
    // =====================================================

    function isValidPhone(value) {

        const cleaned =
            value.replace(
                /[\s\-().+]/g,
                ""
            );

        return /^\d{8,15}$/.test(cleaned);
    }


    // =====================================================
    // PROJECTS
    // =====================================================

    /*
        المشاريع لن تكون مكتوبة هنا يدويًا.

        لاحقًا سيتم تحميلها من النظام الخلفي.

        حتى عندما تضيف مشروعًا جديدًا من لوحة المدير،
        سيظهر تلقائيًا في واجهة العملاء.
    */

    function renderProjects(projects) {

        const grid =
            document.getElementById(
                "projects-grid"
            );

        if (!grid) {
            return;
        }


        if (
            !Array.isArray(projects) ||
            projects.length === 0
        ) {

            grid.innerHTML = `
                <div class="projects-loading">
                    لا توجد مشاريع مضافة حاليًا.
                </div>
            `;

            return;
        }


        grid.innerHTML =
            projects
                .map((project) => {

                    const safeTitle =
                        escapeHtml(
                            project.title || "مشروع"
                        );

                    const safeDescription =
                        escapeHtml(
                            project.description || ""
                        );

                    const image =
                        project.imageUrl
                            ? `
                                <img
                                    src="${escapeAttribute(project.imageUrl)}"
                                    alt="${safeTitle}"
                                    loading="lazy"
                                >
                              `
                            : `
                                <div class="project-placeholder">
                                    مشروع
                                </div>
                              `;

                    const link =
                        project.url
                            ? `
                                <a
                                    class="project-link"
                                    href="${escapeAttribute(project.url)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    مشاهدة المشروع
                                    <span aria-hidden="true">↗</span>
                                </a>
                              `
                            : "";


                    return `
                        <article class="project-card">

                            <div class="project-image">
                                ${image}
                            </div>

                            <div class="project-content">

                                <h3>
                                    ${safeTitle}
                                </h3>

                                <p>
                                    ${safeDescription}
                                </p>

                                ${link}

                            </div>

                        </article>
                    `;

                })
                .join("");
    }


    // =====================================================
    // SAFE HTML HELPERS
    // =====================================================

    function escapeHtml(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function escapeAttribute(value) {

        return escapeHtml(value);
    }


    // =====================================================
    // INITIAL PROJECT STATE
    // =====================================================

    window.MohamadProjects = {
        render: renderProjects
    };
// =====================================================
    // جلب المشاريع تلقائياً من الخادم الخلفي لصفحة العملاء
    // =====================================================
    async function loadPublicProjects() {
        if (!API_URL) return;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "getProjects" })
            });

            if (!response.ok) return;

            const data = await response.json();
            if (data && data.success && Array.isArray(data.projects)) {
                renderProjects(data.projects);
            }
        } catch (err) {
            console.error("فشل جلب المشاريع للواجهة العامة:", err);
        }
    }

    // تشغيل جلب المشاريع عند فتح الصفحة
    loadPublicProjects();
});
