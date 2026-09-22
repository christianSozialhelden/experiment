module.exports = [
"[project]/experiment/app/OsmLinkForm.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OsmLinkForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/experiment/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/experiment/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function OsmLinkForm() {
    const [lat, setLat] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [lon, setLon] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const isValid = lat.trim() !== "" && lon.trim() !== "" && !Number.isNaN(latNum) && !Number.isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180;
    const osmUrl = isValid ? `https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lonNum}#map=18/${latNum}/${lonNum}` : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-4 w-full max-w-xs",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex flex-col gap-1 text-sm font-medium text-black dark:text-zinc-50",
                children: [
                    "Breitengrad (lat)",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        inputMode: "decimal",
                        value: lat,
                        onChange: (e)=>setLat(e.target.value),
                        placeholder: "z. B. 52.5200",
                        className: "rounded border border-black/[.15] px-3 py-2 text-base dark:border-white/[.2] dark:bg-black dark:text-zinc-50"
                    }, void 0, false, {
                        fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex flex-col gap-1 text-sm font-medium text-black dark:text-zinc-50",
                children: [
                    "Längengrad (lon)",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        inputMode: "decimal",
                        value: lon,
                        onChange: (e)=>setLon(e.target.value),
                        placeholder: "z. B. 13.4050",
                        className: "rounded border border-black/[.15] px-3 py-2 text-base dark:border-white/[.2] dark:bg-black dark:text-zinc-50"
                    }, void 0, false, {
                        fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                        lineNumber: 40,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            osmUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: osmUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "font-medium text-zinc-950 underline dark:text-zinc-50",
                children: osmUrl
            }, void 0, false, {
                fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                lineNumber: 50,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$experiment$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-zinc-500 dark:text-zinc-400",
                children: "Bitte gültige Koordinaten eingeben."
            }, void 0, false, {
                fileName: "[project]/experiment/app/OsmLinkForm.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/experiment/app/OsmLinkForm.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
}),
"[project]/experiment/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/experiment/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=experiment_1l2bs6u._.js.map