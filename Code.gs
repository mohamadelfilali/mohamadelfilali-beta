/**
 * ============================================================
 * MOHAMAD ELFILALI — CLIENT / ADMIN BACKEND
 * Google Apps Script + Google Sheets
 * ============================================================
 *
 * هذا الملف هو الخلفية الخاصة بالموقع.
 *
 * الوظائف الرئيسية:
 *
 * 1. استقبال رسائل العملاء
 * 2. حفظ الرسائل في Google Sheets
 * 3. تسجيل دخول المدير
 * 4. حماية واجهة المدير بواسطة Session Token
 * 5. جلب الرسائل للمدير
 * 6. إضافة المشاريع
 * 7. تعديل المشاريع
 * 8. حذف المشاريع
 * 9. تجهيز رفع صور المشاريع إلى Google Drive
 *
 * ============================================================
 */


/* ============================================================
   CONFIGURATION
============================================================ */

const SHEET_MESSAGES = "Messages";
const SHEET_PROJECTS = "Projects";

const PROP_ADMIN_EMAIL = "ADMIN_EMAIL";
const PROP_ADMIN_PASSWORD_HASH = "ADMIN_PASSWORD_HASH";

const SESSION_PREFIX = "ADMIN_SESSION_";

const SESSION_DURATION_SECONDS = 21600; // 6 ساعات


/* ============================================================
   FIRST SETUP
============================================================ */

/**
 * شغّل هذه الوظيفة مرة واحدة فقط من محرر Apps Script.
 *
 * ستظهر لك نافذة تطلب:
 * - البريد الإلكتروني للمدير
 * - كلمة مرور المدير
 *
 * كلمة المرور لن تكون مكتوبة في GitHub.
 */
function setupSystem() {

    const ui = SpreadsheetApp.getUi();

    const emailResponse =
        ui.prompt(
            "إعداد النظام",
            "اكتب البريد الإلكتروني الخاص بالمدير:",
            ui.ButtonSet.OK_CANCEL
        );

    if (
        emailResponse.getSelectedButton() !==
        ui.Button.OK
    ) {
        return;
    }


    const email =
        emailResponse
            .getResponseText()
            .trim()
            .toLowerCase();


    if (!isValidEmail(email)) {

        ui.alert(
            "البريد الإلكتروني غير صحيح."
        );

        return;
    }


    const passwordResponse =
        ui.prompt(
            "إعداد النظام",
            "اكتب كلمة مرور قوية للمدير:",
            ui.ButtonSet.OK_CANCEL
        );

    if (
        passwordResponse.getSelectedButton() !==
        ui.Button.OK
    ) {
        return;
    }


    const password =
        passwordResponse
            .getResponseText();


    if (password.length < 8) {

        ui.alert(
            "يجب أن تكون كلمة المرور 8 أحرف على الأقل."
        );

        return;
    }


    const properties =
        PropertiesService.getScriptProperties();


    properties.setProperty(
        PROP_ADMIN_EMAIL,
        email
    );


    properties.setProperty(
        PROP_ADMIN_PASSWORD_HASH,
        hashPassword(password)
    );


    createRequiredSheets();


    ui.alert(
        "تم إعداد النظام بنجاح."
    );
}


/* ============================================================
   SHEET CREATION
============================================================ */

function createRequiredSheets() {

    const spreadsheet =
        SpreadsheetApp.getActiveSpreadsheet();


    /* --------------------------------------------------------
       MESSAGES
    -------------------------------------------------------- */

    let messagesSheet =
        spreadsheet.getSheetByName(
            SHEET_MESSAGES
        );


    if (!messagesSheet) {

        messagesSheet =
            spreadsheet.insertSheet(
                SHEET_MESSAGES
            );
    }


    if (
        messagesSheet.getLastRow() === 0
    ) {

        messagesSheet.appendRow([
            "ID",
            "Date",
            "Name",
            "Service",
            "Contact Method",
            "Contact Value",
            "Word Count",
            "Message",
            "Status"
        ]);

        messagesSheet.setFrozenRows(1);
    }


    /* --------------------------------------------------------
       PROJECTS
    -------------------------------------------------------- */

    let projectsSheet =
        spreadsheet.getSheetByName(
            SHEET_PROJECTS
        );


    if (!projectsSheet) {

        projectsSheet =
            spreadsheet.insertSheet(
                SHEET_PROJECTS
            );
    }


    if (
        projectsSheet.getLastRow() === 0
    ) {

        projectsSheet.appendRow([
            "ID",
            "Title",
            "Description",
            "Image URL",
            "Project URL",
            "Created At",
            "Updated At"
        ]);

        projectsSheet.setFrozenRows(1);
    }
}


/* ============================================================
   HTTP GET
============================================================ */

function doGet(e) {

    return jsonResponse({
        success: true,
        service: "Mohamad Elfilali Backend",
        status: "online"
    });
}


/* ============================================================
   HTTP POST
============================================================ */

function doPost(e) {

    try {

        if (!e || !e.postData) {

            return jsonResponse({
                success: false,
                message: "Invalid request."
            });
        }


        const payload =
            JSON.parse(
                e.postData.contents || "{}"
            );


        const action =
            String(
                payload.action || ""
            ).trim();


        switch (action) {

            case "createMessage":

                return jsonResponse(
                    createMessage(payload)
                );


            case "login":

                return jsonResponse(
                    loginAdmin(payload)
                );


            case "getMessages":

                return jsonResponse(
                    getMessages(payload)
                );


            case "getProjects":

                return jsonResponse(
                    getProjects(payload)
                );


            case "saveProject":

                return jsonResponse(
                    saveProject(payload)
                );


            case "deleteProject":

                return jsonResponse(
                    deleteProject(payload)
                );


            case "uploadProjectImage":

                return jsonResponse(
                    uploadProjectImage(payload)
                );


            default:

                return jsonResponse({
                    success: false,
                    message: "Unknown action."
                });
        }


    } catch (error) {

        console.error(error);


        return jsonResponse({
            success: false,
            message:
                "حدث خطأ داخلي في الخادم."
        });
    }
}


/* ============================================================
   CREATE CLIENT MESSAGE
============================================================ */

function createMessage(data) {

    createRequiredSheets();


    const name =
        cleanText(
            data.name,
            200
        );


    const service =
        cleanText(
            data.service,
            100
        );


    const contactMethod =
        cleanText(
            data.contactMethod,
            50
        );


    const contactValue =
        cleanText(
            data.contactValue,
            500
        );


    const message =
        String(
            data.message || ""
        ).trim();


    const wordCount =
        countWords(message);


    if (!name) {

        return {
            success: false,
            message: "الاسم مطلوب."
        };
    }


    if (!service) {

        return {
            success: false,
            message: "نوع الخدمة مطلوب."
        };
    }


    if (!contactMethod) {

        return {
            success: false,
            message: "طريقة التواصل مطلوبة."
        };
    }


    if (!contactValue) {

        return {
            success: false,
            message: "معلومات التواصل مطلوبة."
        };
    }


    if (!message) {

        return {
            success: false,
            message: "الرسالة فارغة."
        };
    }


    if (wordCount > 10000) {

        return {
            success: false,
            message:
                "الرسالة تتجاوز 10,000 كلمة."
        };
    }


    const sheet =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName(
                SHEET_MESSAGES
            );


    const id =
        Utilities.getUuid();


    sheet.appendRow([
        id,
        new Date(),
        name,
        service,
        contactMethod,
        contactValue,
        wordCount,
        message,
        "new"
    ]);


    return {
        success: true,
        message:
            "تم استلام طلبك بنجاح.",
        id: id
    };
}


/* ============================================================
   ADMIN LOGIN
============================================================ */

function loginAdmin(data) {

    const email =
        String(
            data.email || ""
        )
            .trim()
            .toLowerCase();


    const password =
        String(
            data.password || ""
        );


    const properties =
        PropertiesService
            .getScriptProperties();


    const storedEmail =
        properties.getProperty(
            PROP_ADMIN_EMAIL
        );


    const storedHash =
        properties.getProperty(
            PROP_ADMIN_PASSWORD_HASH
        );


    if (
        !storedEmail ||
        !storedHash
    ) {

        return {
            success: false,
            message:
                "لم يتم إعداد حساب المدير بعد."
        };
    }


    const suppliedHash =
        hashPassword(password);


    if (
        email !== storedEmail ||
        suppliedHash !== storedHash
    ) {

        return {
            success: false,
            message:
                "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        };
    }


    const token =
        createSession();


    return {
        success: true,
        token: token,
        expiresIn:
            SESSION_DURATION_SECONDS
    };
}


/* ============================================================
   SESSION
============================================================ */

function createSession() {

    const token =
        Utilities.getUuid() +
        "-" +
        Utilities.getUuid();


    CacheService
        .getScriptCache()
        .put(
            SESSION_PREFIX + token,
            "authenticated",
            SESSION_DURATION_SECONDS
        );


    return token;
}


function isAuthenticated(token) {

    if (!token) {
        return false;
    }


    const value =
        CacheService
            .getScriptCache()
            .get(
                SESSION_PREFIX + token
            );


    return value === "authenticated";
}


/* ============================================================
   GET MESSAGES
============================================================ */

function getMessages(data) {

    if (
        !isAuthenticated(
            data.token
        )
    ) {

        return {
            success: false,
            unauthorized: true,
            message: "غير مصرح."
        };
    }


    createRequiredSheets();


    const sheet =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName(
                SHEET_MESSAGES
            );


    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {

        return {
            success: true,
            messages: []
        };
    }


    const values =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                9
            )
            .getValues();


    const messages =
        values.map(
            row => ({

                id: String(row[0]),

                date:
                    formatDate(row[1]),

                name:
                    String(row[2]),

                service:
                    String(row[3]),

                contactMethod:
                    String(row[4]),

                contactValue:
                    String(row[5]),

                wordCount:
                    Number(row[6]) || 0,

                message:
                    String(row[7]),

                status:
                    String(row[8])

            })
        );


    messages.reverse();


    return {
        success: true,
        messages: messages
    };
}


/* ============================================================
   GET PROJECTS
============================================================ */

function getProjects(data) {

    /*
       يمكن استدعاء المشاريع من واجهة العملاء
       بدون تسجيل دخول.

       ويمكن أيضًا طلبها من المدير.
    */

    createRequiredSheets();


    const sheet =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName(
                SHEET_PROJECTS
            );


    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {

        return {
            success: true,
            projects: []
        };
    }


    const values =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                7
            )
            .getValues();


    const projects =
        values.map(
            row => ({

                id:
                    String(row[0]),

                title:
                    String(row[1]),

                description:
                    String(row[2]),

                imageUrl:
                    String(row[3]),

                url:
                    String(row[4]),

                createdAt:
                    formatDate(row[5]),

                updatedAt:
                    formatDate(row[6])

            })
        );


    projects.reverse();


    return {
        success: true,
        projects: projects
    };
}


/* ============================================================
   SAVE PROJECT
============================================================ */

function saveProject(data) {

    if (
        !isAuthenticated(
            data.token
        )
    ) {

        return {
            success: false,
            unauthorized: true,
            message: "غير مصرح."
        };
    }


    createRequiredSheets();


    const title =
        cleanText(
            data.title,
            200
        );


    const description =
        cleanText(
            data.description,
            2000
        );


    const imageUrl =
        cleanText(
            data.imageUrl,
            2000
        );


    const projectUrl =
        cleanText(
            data.url,
            2000
        );


    if (!title) {

        return {
            success: false,
            message:
                "عنوان المشروع مطلوب."
        };
    }


    const sheet =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName(
                SHEET_PROJECTS
            );


    const now =
        new Date();


    /*
       تعديل مشروع موجود
    */

    if (data.id) {

        const rowIndex =
            findRowById(
                sheet,
                data.id
            );


        if (rowIndex === -1) {

            return {
                success: false,
                message:
                    "المشروع غير موجود."
            };
        }


        sheet
            .getRange(
                rowIndex,
                2,
                1,
                6
            )
            .setValues([[
                title,
                description,
                imageUrl,
                projectUrl,
                sheet
                    .getRange(
                        rowIndex,
                        6
                    )
                    .getValue(),
                now
            ]]);


        return {
            success: true,
            message:
                "تم تعديل المشروع.",
            id: data.id
        };
    }


    /*
       إنشاء مشروع جديد
    */

    const id =
        Utilities.getUuid();


    sheet.appendRow([
        id,
        title,
        description,
        imageUrl,
        projectUrl,
        now,
        now
    ]);


    return {
        success: true,
        message:
            "تمت إضافة المشروع.",
        id: id
    };
}


/* ============================================================
   DELETE PROJECT
============================================================ */

function deleteProject(data) {

    if (
        !isAuthenticated(
            data.token
        )
    ) {

        return {
            success: false,
            unauthorized: true,
            message: "غير مصرح."
        };
    }


    const id =
        String(
            data.id || ""
        ).trim();


    if (!id) {

        return {
            success: false,
            message:
                "معرّف المشروع مفقود."
        };
    }


    const sheet =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName(
                SHEET_PROJECTS
            );


    const rowIndex =
        findRowById(
            sheet,
            id
        );


    if (rowIndex === -1) {

        return {
            success: false,
            message:
                "المشروع غير موجود."
        };
    }


    sheet.deleteRow(rowIndex);


    return {
        success: true,
        message:
            "تم حذف المشروع."
    };
}


/* ============================================================
   UPLOAD PROJECT IMAGE
============================================================ */

function uploadProjectImage(data) {

    if (
        !isAuthenticated(
            data.token
        )
    ) {

        return {
            success: false,
            unauthorized: true,
            message: "غير مصرح."
        };
    }


    const fileName =
        cleanText(
            data.fileName,
            180
        );


    const mimeType =
        cleanText(
            data.mimeType,
            100
        );


    const base64 =
        String(
            data.base64 || ""
        );


    if (
        !fileName ||
        !mimeType ||
        !base64
    ) {

        return {
            success: false,
            message:
                "بيانات الصورة ناقصة."
        };
    }


    /*
       نحاول منع رفع ملفات ضخمة جدًا.
    */

    if (
        base64.length >
        12 * 1024 * 1024
    ) {

        return {
            success: false,
            message:
                "حجم الصورة كبير جدًا."
        };
    }


    const bytes =
        Utilities.base64Decode(
            base64
        );


    const blob =
        Utilities.newBlob(
            bytes,
            mimeType,
            fileName
        );


    const folder =
        getOrCreateProjectFolder();


    const file =
        folder.createFile(
            blob
        );


    /*
       أي شخص لديه الرابط يستطيع عرض الصورة.
    */

    file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
    );


    return {
        success: true,
        url:
            "https://drive.google.com/uc?export=view&id=" +
            file.getId(),
        fileId:
            file.getId()
    };
}


/* ============================================================
   PROJECT IMAGE FOLDER
============================================================ */

function getOrCreateProjectFolder() {

    const properties =
        PropertiesService
            .getScriptProperties();


    const storedId =
        properties.getProperty(
            "PROJECT_IMAGES_FOLDER_ID"
        );


    if (storedId) {

        try {

            return DriveApp.getFolderById(
                storedId
            );

        } catch (error) {

            // سيتم إنشاء مجلد جديد
        }
    }


    const folder =
        DriveApp.createFolder(
            "Mohamad Elfilali - Project Images"
        );


    properties.setProperty(
        "PROJECT_IMAGES_FOLDER_ID",
        folder.getId()
    );


    return folder;
}


/* ============================================================
   FIND ROW BY ID
============================================================ */

function findRowById(sheet, id) {

    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {
        return -1;
    }


    const values =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                1
            )
            .getValues();


    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        if (
            String(values[i][0]) ===
            String(id)
        ) {

            return i + 2;
        }
    }


    return -1;
}


/* ============================================================
   PASSWORD HASH
============================================================ */

function hashPassword(password) {

    const bytes =
        Utilities.computeDigest(
            Utilities.DigestAlgorithm.SHA_256,
            password,
            Utilities.Charset.UTF_8
        );


    return bytes
        .map(
            byte => {

                const value =
                    byte < 0
                        ? byte + 256
                        : byte;

                return (
                    "0" +
                    value.toString(16)
                ).slice(-2);
            }
        )
        .join("");
}


/* ============================================================
   WORD COUNT
============================================================ */

function countWords(text) {

    const normalized =
        String(text || "")
            .trim()
            .replace(/\s+/g, " ");


    if (!normalized) {
        return 0;
    }


    return normalized.split(" ").length;
}


/* ============================================================
   TEXT CLEANING
============================================================ */

function cleanText(value, maxLength) {

    const text =
        String(value || "")
            .trim();


    return text.substring(
        0,
        maxLength
    );
}


/* ============================================================
   EMAIL VALIDATION
============================================================ */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(value) {

    if (!value) {
        return "";
    }


    try {

        return Utilities.formatDate(
            new Date(value),
            Session.getScriptTimeZone(),
            "yyyy-MM-dd HH:mm"
        );

    } catch (error) {

        return String(value);
    }
}


/* ============================================================
   JSON RESPONSE
============================================================ */

function jsonResponse(data) {

    return ContentService
        .createTextOutput(
            JSON.stringify(data)
        )
        .setMimeType(
            ContentService.MimeType.JSON
        );
}
